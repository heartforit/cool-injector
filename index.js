var glob = require("glob");
var async = require("async");
var fs = require('fs');
var path = require('path');
var _ = require("underscore")
var annotation = require('annotation');



var classTree = {};
var container = {};

function readFile(file, callback){

	file = path.resolve(file)
	try {
	   var oneClass = require(file);

	   if(typeof oneClass !== "function"){
	    	throw new Error("please provide a valid class for file "+ file);
       } 

       annotation(file, function(AnnotationReader) {
		   //get annotations related to the class
		   var annotations = AnnotationReader.getClassAnnotations()
		   
	       var obj = {
		   	className: path.basename(file, '.js'), 
		   	file: file, 
		   	class: oneClass,
		   	constructorArgs: getParamNames(oneClass),
		   	annotations: annotations,
		   	lazy: true,
		   	forceOverwrite: false
		   };

		   if(obj.constructorArgs && obj.constructorArgs.indexOf(obj.className) !== -1){
		   		throw new Error("a class should no refrence itself ("+obj.className+")");
		   }


		   if(obj.annotations){
		   		// search for alias
		   		for(i = 0; obj.annotations.length > i; i++){
		   			var result = obj.annotations[i];
		   			
		   			switch(result.key){
		   				case "exportAs":
		   					if(typeof result.value === "string" 
		   						&& result.value !== ""){
				   					obj.className = result.value;
				   				} else {
				   					throw new Error("can not export as value ("+result.value+") for class "+ obj.className);
				   				}

		   				break;

		   				case "lazy":
		   					if(typeof result.value === "boolean"){
		   						obj.lazy = result.value;
		   					}
		   				break;

		   				case "forceOverwrite":
		   					if(typeof result.value === "boolean"){
		   						obj.forceOverwrite = result.value;
		   					}
		   				break;
		   			}
		   		}
		   }

		   if(!classTree[obj.className] || obj.forceOverwrite === true) {		   
		   		classTree[obj.className] = obj;
		   } else {
		   	throw new Error("One class trys to overwrite another in the "+
		   		"domain. "+ obj.file +" -->"+ classTree[obj.className].file + 
		   		"\n Try to Use @forceOverwrite(true) annotation to solve the problem"
		   		);
		   }

		   return callback(undefined, obj);
	   });
	} catch(error){
		throw new Error(error);
	}
}

/* Creates the container tree in memory
* 
*/
function resolveContainer(functionObj){
	var args = [];
	var i = 0;
	if(functionObj.constructorArgs != null && 
		functionObj.constructorArgs.length != 0
		){
		functionObj.constructorArgs.forEach(function(item){
			i++;
			if(container[item]){
				args[i] = container[item];
			} else {
				// check if class from domain
				// should be loaded
				if(classTree[item]){
					// check if classes references each to other
					var classItem = classTree[item];
					if(classItem.constructorArgs && classItem.constructorArgs.indexOf(item)){
						throw new Error("please to not refrence two classes to each other. "
							+ "("+classItem.className +" --><-- "+ functionObj.className +")");
					}

					var obj = resolveContainer(classTree[item]);
					args[i] = obj;
				} 
				// otherwise search in the global
				// namespace
				else 
				{
					try {
						container[item] = require(item);
						args[i] = container[item];
						classTree[item] = {
							constructorArgs: null, 
							className: item
						};
					} catch(error){
						// swallow
						args[i] = null;
					}
				}
			}
		});
	} 

	// create an instance
	if(functionObj.lazy === false){
		obj = makeInstance(functionObj.class, args);
		container[functionObj.className] = obj;
		return obj;
	} else {
		container[functionObj.className] = functionObj.class;
		return container[functionObj.className];
	}

}

function makeInstance(funcName, args){

	var filtered = [];
	args.forEach(function(item){
		if(typeof item === "object"){
			filtered.push(item);
		} 
		// injecting a pure function needs a object wrapper
		else if(typeof item === "function"){
			filtered.push({class:item});
		}
	})
	args = filtered;

	var args2 = "";
	for(var i = 0 ; i < filtered.length; i++){

			if(filtered[i].class){
				args2 += "filtered[" + i + "]";
			} else {
				args2 += "filtered[" + i + "]";
			}

			
			if(i+1 < filtered.length ){
				args2 += ","
			}
	}

	var factory = "obj = new funcName("+ args2 + ")";
	eval(factory);

	return obj;
}

function getParamNames(fn) {
    var funStr = fn.toString();
    return funStr.slice(funStr.indexOf('(') + 1, funStr.indexOf(')')).match(/([^\s,]+)/g);
}

function readDirector(path, cb){
	glob(path + "/*.js", cb);
}



/* This class reads a diretory with glob 
*  and trys to access every found class
*  to be able to make use from autowire
*
*
*/
function CoolInjector(paths, callback){
	var pathTree;
	async.map(paths, readDirector, function(err1, results){
	    pathTree = _.flatten(results);
	    
		async.map(pathTree, readFile, function(err2, classes){

			var i = 0;
			classes.forEach(function(item){
				i++;
				resolveContainer(item);

				if(i == classes.length){
					callback(undefined, container);
				}
			})
		})
	});

	this.get = function(dep){
		if(!container[dep]){
			if(classTree[dep]){
				return resolveContainer(classTree[dep]);
			} else {
				console.log(dep+" not found in container");
			}
		} else {
			return container[dep];
		}
	}
}


module.exports = CoolInjector;

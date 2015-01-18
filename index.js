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
		   // get annotations related to the class
		   var annotations = AnnotationReader.getClassAnnotations();
		   
	       var obj = {
		   	className: path.basename(file, '.js'), 
		   	file: file, 
		   	class: oneClass,
		   	constructorArgs: getParamNames(oneClass),
		   	annotations: annotations,
		   	lazy: false,
		   	forceOverwrite: false
		   };

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

		   // check if self references are made
		   // if yes, then we are runnning into recursion 
		   // which leads to an range error
		   if(obj.constructorArgs && obj.constructorArgs.indexOf(obj.className) !== -1){
		   		throw new Error("a class should no refrence itself ("+obj.className+") File: "+ obj.file);
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
					
					var classItem = classTree[item];

					// check if classes references each to other
					// which means we have recursion again
					if(classItem.constructorArgs && classItem.constructorArgs.indexOf(functionObj.className) !== -1
						&& functionObj.constructorArgs && functionObj.constructorArgs.indexOf(classItem.className) !== -1
						){
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

function applyConstruct(ctor, params) {

    var obj, newobj;

    // Use a fake constructor function with the target constructor's
    // `prototype` property to create the object with the right prototype
    function fakeCtor() {
    }
    fakeCtor.prototype = ctor.prototype;
    obj = new fakeCtor();

    // Set the object's `constructor`
    obj.constructor = ctor;

    // Call the constructor function
    newobj = ctor.apply(obj, params);

    // Use the returned object if there is one.
    // Note that we handle the funky edge case of the `Function` constructor,

    if (newobj !== null
        && (typeof newobj === "object" || typeof newobj === "function")
       ) {
        obj = newobj;
    }

    // Done
    return obj;
}

function makeInstance(funcName, args){

	var filtered = [];
	var counter = 0;
	args.forEach(function(item){
		if(typeof item === "object" || typeof item === "function"){
			filtered[counter] = item;
		}
		counter++;
	})

	return applyConstruct(funcName, filtered);
}

function getParamNames(fn) {
    var funStr = fn.toString();
    return funStr.slice(funStr.indexOf('(') + 1, funStr.indexOf(')')).match(/([^\s,]+)/g);
}

function readDirector(path, cb){
	glob(path, cb);
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


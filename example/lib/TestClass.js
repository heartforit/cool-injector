/**
 * @Class();
 * @lazy(false);
 */
module.exports = function(path, DepClass, changedClassName){
	console.log(changedClassName)
	return {
		sayHelloWorld: function(){
			console.log("Hello you!");
		}
	}
}

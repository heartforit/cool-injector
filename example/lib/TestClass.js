/**
 * @Class();
 * @lazy(false);
 */
module.exports = function(path, DepClass, changedClassName){
	return {
		sayHelloWorld: function(){
			console.log("Hello you!");
		}
	}
}

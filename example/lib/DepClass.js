/**
 * @Class();
 * @lazy(false);
 */
module.exports = function(changedClassName){
	console.log("loaded myClass");
	return {
		sayHello1: function(){
			console.log("Hello you!");
		}
	}
}

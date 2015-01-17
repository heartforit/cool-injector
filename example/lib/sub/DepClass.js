/**
 * This example file show, how to solve duplicated file name / class name problems
 * @Class();
 * @lazy(false);
 * @forceOverwrite(true);
 */
module.exports = function(){
	console.log("loaded myClass2");
	return {
		sayHello2: function(){
			console.log("Hello you!");
		}
	}
}

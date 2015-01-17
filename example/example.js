var CoolInjector = require("../");
var coolInjector = new CoolInjector(['./lib/**', './helper/**'], function(err, objects){
	console.log(coolInjector, objects);
});

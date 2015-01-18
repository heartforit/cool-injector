var CoolInjector = require("../");
var coolInjector = new CoolInjector(['./lib/**.js', './helper/**.js'], function(err, objects){
	console.log(coolInjector, objects);
});

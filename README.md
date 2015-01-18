What is this about?
===
Good question. This project solves not directly a problem, but it helps to deal with 
dependency injection in node.js. This should enable everyone to develop his code fast
as possbile, without caring to much about requiring and stuff like that.


It was desgined to be simple and flexible as much as possbile (annotations are allowed). If you miss something, just let me know.

Limitations
====
* The dependecy container does not allow refrences to classes which refrences itself.
* Further it does not allow references to classes each to other
* It does not know how to deal with file names like this-is-my-class.js for example

How to use?
===
```javascript
var CoolInjector = require("better-dependency-injector");
var coolInjector = new CoolInjector(['./lib/**/*.js', './helper/**/*.js'], function(err, objects){
    // if we have a class in the lib folder named lib/myClassName.js
    // an we add "module.exports = myfunction(fs){console.log(fs)}"
    // it creates an instnace of it
    // and auto resolves all depndencies
    // coolInjector can know access classes and instances of them     
    // by using coolInjector.get("myClassName");
    // objects is the current container
	console.log(coolInjector, objects);
});
```

Some more examples with annotations
==
```javascript
/*
* @Class();
* @lazy(true); // lazy means just return function (not an instance of it)
* @exportAs("logger") // this class will be accessible by inclcuding logger as 
*                     // constructor argument to other classes
*/
module.exports = function(){
}
```

Solve duplicated file name / class name problems
===
Maybe we have class which has the same class name as an other class from our domain,
we can try to use the `@exportAs` annotation or we can just try to use `@forceOverwrite` annotation
```javascript
/*
* @Class();
* @forceOverwrite(true) // solve problems
* @lazy(true); // lazy means just return function (not an instance of it)
* @exportAs("logger") // this class will be accessible by including "logger" as 
*                     // constructor argument to other classes
*/
module.exports = function(){
}
```





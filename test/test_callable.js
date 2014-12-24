var callable = require('../lib/callable.js');

function TestClass(hello) {
  this.hello = hello;

  this.__call__ = function() {
    console.log(this.hello);
  }
}

TestClass.prototype.bob = function() { console.log('bob') };
TestClass.prototype.salutations = function() { console.log(this.hello) };

T = callable(TestClass);

var obj = T('hellooooo');

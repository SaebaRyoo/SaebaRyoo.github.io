---
title: JavaScript常用的几种继承
date: 2022-08-01
categories:
  - 前端
tags:
  - JavaScript
---

## 原型链继承

```js
function SuperType() {
  this.property = true;
}

SuperType.prototype.getSuperValue = function () {
  return this.property;
};

function SubType() {
  this.subProperty = false;
}

// 继承
SubType.prototype = new SuperType();

SubType.prototype.getSubValue = function () {
  return this.subProperty;
};

var instance = new SubType();
instance.getSuperValue(); // true

// 重写子类原型方法
SubType.prototype.getSuperValue = function () {
  return this.subProperty;
};
instance.getSuperValue(); // false
instance.constructor; // SuperType
```

**问题：**

1. 当父类中包含引用类型时，且子类继承父类，并创建实例，那么所有的实例将会共享该属性
2. 在子类创建类型的实例时，无法向父类型传递参数（无法在不影响所有对象实例的情况下给父类构造函数传递参数）
3. 因为重写原型丢失了默认的 constructor

```js
function SuperType() {
  this.colors = ["red", "green", "blue"];
}
function SubType() {}
SubType.prototype = new SuperType();

var instance1 = new SubType();
var instance2 = new SubType();
instance.colors.push("yellow");
instance1.colors; // ['red', 'green', 'blue', 'yellow']

instance2.colors; // ['red', 'green', 'blue', 'yellow']
```

## 借用构造函数/伪造对象/经典继承

通过在子类构造函数中调用父类构造函数,该方法虽然解决了实例共享引用属性，但是所有的方法都在构造函数中定义，而且父类原型上定义的方法对子类都是不可见的，也就谈不上复用。

```js
function SuperType(name) {
  this.colors = ["red", "green", "blue"];
  this.name = name;
}
function SubType(name) {
  // 传递参数
  SuperType.call(this, name);
}

var instance1 = new SubType("william");
var instance2 = new SubType("petter");

instance1.colors.push("yellow");
instance1.colors; // ['red', 'green', 'blue', 'yellow']
instance1.name; // william
instance2.colors; // ['red', 'green', 'blue']
instance2.name; // petter
```

## 组合继承

组合继承分别使用了原型链继承和借用构造函数继承方法的优点组合而成。主要是在子类构造函数中调用父类构造函数实现实例属性的继承，在子类原型链实现对父类原型属性和方法的继承。

这样既保证了每个实例拥有自己的属性，又能复用父类原型上的方法。而且也能通过如：
`instance1 intanceof SubType`
`SubType.prototype.isPrototypeOf(instance1)`
识别对象

```js
function SuperType(name) {
  this.colors = ["red", "green", "blue"];
  this.name = name;
}

SuperType.prototype.getName = function () {
  return this.name;
};

function SubType(name, age) {
  // 传递参数
  SuperType.call(this, name); // (2)
  this.age = age;
}

SubType.prototype = new SuperType(); // (1)
SubType.prototype.getAge = function () {
  return this.age;
};

var instance1 = new SubType("william", 23);
var instance2 = new SubType("petter", 24);

console.log(instance1.getName());
console.log(instance2.getName());

console.log(instance1.getAge());
console.log(instance2.getAge());

instance1.colors.push("yellow");

console.log(instance1.colors);
console.log(instance2.colors);
```

**_这在 js 的继承实现中时最常见的方法，但是这样会调用两次父类的构造函数. _**

### 原型式继承

借助原型可以基于已有的对象创建新对象，同时还不必因此创建自定义类型。

```js
function object(o) {
  function F() {}
  F.prototype = o;
  return new F();
}
```

ECMAScript 5 新增了 Object.create()方法规范了**原型式继承**, 该方法的第二个参数和 Object.definedProperties 方法的第二个参数相同,每个属性通过自己的描述符定义。

当我们只是想一个对象与另一个对象保持类似，而不需要兴师动众的创建构造函数时，我们可以使用这个方法

```js
var person = {
  name: "William",
  job: "front-end",
};

var another = Object.create(person, {
  name: {
    value: "Petter",
  },
});
```

## 寄生式继承

寄生式继承是与原型式继承紧密相关的一种思路。思路类似于寄生构造函数和工厂模式，即创建一个 **仅用于封装继承过程的函数** ，改函数在内部以某种方式增强对象。然后再返回对象

使用寄生式继承来为对象添加函数，会由于不能做到函数复用而降低效率。这和构造函数模式类似

```js
function createAnother(original) {
  var clone = object(original); // 创建一个新对象
  clone.sayHi = function () {
    // 增强对象
    console.log("hi");
  };
  return clone; // 返回对象
}
```

## 寄生组合继承

```js
function inheritPrototype(subType, superType) {
  var prototype = object(superType.prototype); // 创建对象
  prototype.constructor = subType; // 增强对象
  subType.prototype = prototype; //  指定原型
}
```

然后我们在通过寄生组合继承实现继承

1. 改善调用两次父类构造函数的情况
2. 弥补之前因为重写原型而丢失默认的 constructor 属性

```js
function SuperType(name) {
  this.colors = ["red", "green", "blue"];
  this.name = name;
}

SuperType.prototype.getName = function () {
  return this.name;
};

function SubType(name, age) {
  // 传递参数
  SuperType.call(this, name);
  this.age = age;
}

inheritPrototype(SubType, SuperType);
SubType.prototype.getAge = function () {
  return this.age;
};

var instance1 = new SubType("william", 23);
var instance2 = new SubType("petter", 24);
instance1.constructor; // SubType
```

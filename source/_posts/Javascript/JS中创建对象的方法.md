---
title: JavaScript中创建对象的方法
categories:
- 前端
tags: 
- JavaScript
---

### 工厂模式
**优点：** 解决创建多个相似对象的问题
**缺点：** 
1. 无法通过constructor识别对象，创建的对象的constructor都是Object，而不是createPerson
2. 通用的方法会创建多次，占用内存

```js
function createPerson(name, age) {
   var o = {};
   o.name = name;
   o.age = age;
   o.getInfo = function() {
      return `hello, my name is ${name}, i'm ${age} years old`;
   }
   return o;
} 

var person1 = createPerson('william', 23);
console.log(person1.constructor) // Object
```


### 构造函数模式
**优点：**
1. 通过new关键字创建实例，更像面向对象语言的实例创建
2. 能够通过constructor和instanceof 识别对象
**缺点：** 
2. 和工厂函数一样。通用的方法会创建多次，占用内存。

**不同：与工厂函数的不同之处在于**
- 不需要显式的创建对象
- 没有return语句
- 直接将属性和方法赋给this对象

**使用new经历的步骤**
1. 创建一个新对象
2. 将构造函数的作用域赋给新对象（将this指向新对象）
3. 执行构造函数中的代码 （向对象中增加属性）
4. 返回新对象

```js
function Person(name, age) {
   this.name = name;
   this.age = age;
   this.getInfo = function() {
      return `hello, my name is ${name}, i'm ${age} years old`;
   }
} 
var person1 = new Person('william', 23);
console.log(person1.constructor)  // Person
console.log(person1 instanceof Person) // true
console.log(person1 instanceof Object) // true
```

### 原型模式
**优点：**
1. 所有对象实例都能共享构造函数的原型对象上的属性和方法

**缺点：**
1. 当属性为引用类型时，如colors，该数据会共享一块内存。
2. 无法通过向构造函数传参去初始化参数。所有的方法都是共有的，无法创建实例自己的属性和方法。
3. 在调用方法或者获取属性时，会搜索两次，第一次是在实例中查找，如果在实例中没有查询到则进入原型链查找。

```js
function Person() {}

Person.prototype.name = 'william';
Person.prototype.age = 23;
Person.prototype.colors = ['green', 'yellow', 'blue']
Person.prototype.getInfo = function() {
      return `hello, my name is ${name}, i'm ${age} years old`;
}
var person1 = new Person();
var person2 = new Person();

person1.colors === person2.color2 // true， 值与引用都相等
person1.colors.push('red');
console.log(person2.colors) //  ['green', 'yellow', 'blue', 'red']
```

### 构造函数和原型组合模式
**优点：**
1. 解决工厂、构造函数中通用方法占用内存
2. 解决原型中引用类型共享内存的，没有实例自己的属性和方法

```js
function Person(name, age, colors) {
   this.name = name;
   this.age = age;
   this.colors = colors;
} 
Person.prototype.getInfo = function() {
      return `hello, my name is ${name}, i'm ${age} years old`;
}
var person1 = new Person('william', 23,  ['green', 'yellow', 'blue'])
var person2 = new Person('peter', 22,  ['green', 'yellow', 'blue'])

person1.colors.push('red');
console.log(person1)  //  ['green', 'yellow', 'blue', 'red']
console.log(person2)  //  ['green', 'yellow', 'blue']

```

### 动态原型模式
**优点：** 只有当实例上不存在getInfo方法时才在原型上创建

```js
function Person(name, age, colors) {
   this.name = name;
   this.age = age;
   this.colors = colors;

   if (typeof this.getInfo !== "function") {
       Person.prototype.getInfo = function() {
          return `hello, my name is ${name}, i'm ${age} years old`;
       }
   }
} 
var person1 = new Person('william', 23,  ['green', 'yellow', 'blue'])
```

### 寄生构造函数
该模式和工厂模式一样，除了使用了new

```js
function Person(name, age) {
   var o = {};
   o.name = name;
   o.age = age;
   o.getInfo = function() {
      return `hello, my name is ${this.name}, i'm ${this.age} years old`;
   }
   return o;
} 
var person1 = new Person('william', 23)
```
当想要创建一个具有额外方法的数组，但是有不能直接修改Array构造函数时，可以使用这个模式
```js
function SpecialArray() {
   var values = new Array;
   values.push.apply(values, argumenst);
   values.toPipedString = function() {
       return this.join("|")
   }
   return values;
}
var colors = new SpecialArray("red", 'blue', 'green');
colors.toPipedString() // "red|bule|green"


```

### 稳妥构造函数
**优点：** 定义私有变量，只能通过指定方法获取属性
**缺点：** 无法区分实例类别
```js
function Person(name) {
  var o = new Object()
  o.getName= function() {
    return name;
  }
}
var person1 = new Person('william');
person1.name  // undefined
person1.getName() //william
```
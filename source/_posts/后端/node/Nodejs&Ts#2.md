---
title: Node.js TypeScript#2. EventEmitter
date: 2023-04-06
categories:
  - 后端
tags:
  - Node
---

> 这个系列是翻译文章，虽然是翻译，但有些地方还是做了一些修改。如果你想要看原版，那可以根据这个[链接](https://wanago.io/2019/02/18/typescript-node-js-eventemitter/)去查找。

在这篇文章中，我们继续讲与 Node.js 有关的主要概念。这次我们深入探讨`EventEmitter`的概念。我们解释了它的同步性和工作原理，这有助于理解 Node.js 的其他功能，因为其中一些功能在底层使用了`EventEmitter`。

## EventEmitter

事件是 JavaScript 的一个重要部分，因为很多 Node.js 核心功能都依赖于事件驱动架构。你会发现很多对象都继承自 EventEmitter。

某些对象可以发出事件，我们称它们为`事件发射器（emitters）`。我们可以监听这些事件，并使用称为`监听器（listeners）`的回调函数来做出反应。

EventEmitter 的实例有一个`on`方法，可以将一个或多个函数附加到该对象上。EventEmitter 的实例还有一个`emit`方法，用于发出事件并导致所有`EventEmitter`调用所有监听器。

`demo2/index.ts`

```ts
import * as EventEmitter from "events";

eventEmitter.on("event", () => {
  console.log("one");
});

console.log(1);
eventEmitter.on("event", () => {
  console.log("two");
});

console.log(2);
eventEmitter.on("event", () => {
  console.log("three");
});

console.log(3);
eventEmitter.emit("event");
console.log(4);

// 1
// 2
// 3
// one
// two
// three
// 4
```

通过上面的输出，我们可以发现。所有通过`on`方法监听的名为`event`的事件的回调函数，在`emit`触发`event`事件后会同步调用。

> `on`函数是`addEventListener`的别名，两个函数的作用方式相同。

如果你在`emit`触发后去监听`event`事件，`EventEmitter`则不会去调用它

```ts
eventEmitter.emit("event");

eventEmitter.on("event", function () {
  console.log("Event occured!"); // not logged into the console
});
```

这是一个需要牢牢记住的点。

## 向监听器传输额外的数据

`emit`方法允许你发送数据到`listener`函数。在`listener`函数内部，`this`指向`EventEmitter`的实例

```ts
eventEmitter.on("event", function (data) {
  console.log(data); // { key: value }
  console.log(this === eventEmitter); // true
});

eventEmitter.emit("event", {
  key: "value",
});
```

你遇到的很多`emitter(发射器)`都会向`listeners(监听器)`传递额外的参数。

如果你使用箭头函数，`this`的指向就不在是`EventEmitter`的实例，而是一个空对象`{}`。

```ts
const _self = this;

eventEmitter.on("event", () => {
  console.log(this === eventEmitter); // false
  console.log(this === _self); // true
});

eventEmitter.emit("event");
```

这是因为箭头函数的 this 是继承自父级作用域，而在 node 中顶层作用域的 this 就是一个空对象`{}`

## 移除 listeners

如果你不希望某个监听器再被调用，你可以使用`removeListener`函数。通过它，你从一个特定的事件中移除监听器。要做到这一点，你需要向`removeListener`函数提供事件的名称，以及对回调函数的引用。

```ts
function listener() {
  console.log("Event occurred!");
}

eventEmitter.on("event", listener);
eventEmitter.emit("event"); // Event occurred!

eventEmitter.removeListener("event", listener);

eventEmitter.emit("event"); /// Nothing happened
```

## 事件的同步性质

如上所述，EventEmitter 同步的调用所有`listener`。我们可以通过将它们之间互相调用来观察:

```ts
eventEmitter.on("event1", () => {
  console.log("First event here!");
  eventEmitter.emit("event2");
});

eventEmitter.on("event2", () => {
  console.log("Second event here!");
  eventEmitter.emit("event3");
});

eventEmitter.on("event3", () => {
  console.log("Third event here!");
  eventEmitter.emit("event1");
});

eventEmitter.emit("event1");
```

在打印了一堆信息后，你会看到一个错误:

> RangeError: Maximum call stack size exceeded

报错是因为上面的监听器实际执行的顺序是这样的：

```ts
function event1() {
  console.log("First event here!");
  event2();
}

function event2() {
  console.log("Second event here!");
  event3();
}

function event3() {
  console.log("Third event here!");
  event1();
}

event1();
```

`emitter`以同步方式执行所有回调函数。每次调用函数时，其上下文都会推送到调用堆栈的顶部。当函数结束时，上下文从堆栈中取出。如果在另一个函数内部调用一个函数，数据可能会在调用堆栈中积累，并最终导致溢出。

你可以通过使用 setTimeout 函数来改变这种行为。当 Node.js 执行到 setTimeout 函数时，它会设置一个计时器。当计时器到期时，它会将回调函数放到事件循环中`timer`阶段的队列中去执行（这里原文讲的比较模糊，所以我添加了自己的理解，如果感觉不对，可以去看原文）。由于这样，一个函数就不会在另一个函数内部调用，调用栈也不会超过限制。

```ts
eventEmitter.on("event1", () => {
  setTimeout(() => {
    console.log("First event here!");
    eventEmitter.emit("event2");
  });
});

eventEmitter.on("event2", () => {
  setTimeout(() => {
    console.log("Second event here!");
    eventEmitter.emit("event3");
  });
});

eventEmitter.on("event3", () => {
  setTimeout(() => {
    console.log("Third event here!");
    eventEmitter.emit("event1");
  });
});

eventEmitter.emit("event1");
```

## 只执行一次事件

当你使用`on`或`addEventListener`方法注册监听器时，Node.js EventEmitter 在每次发出事件时都会调用它。

```ts
import * as EventEmitter from "events";

class MyEventEmitter extends EventEmitter {
  counter = 0;
}

const eventEmitter = new MyEventEmitter();

eventEmitter.on("event", function () {
  console.log(this.counter++);
});

eventEmitter.emit("event"); // 0
eventEmitter.emit("event"); // 1
eventEmitter.emit("event"); // 2
```

使用`once`代替`on`，可以让你注册的监听器在某个事件中只被调用一次

```ts
import * as EventEmitter from "events";

class MyEventEmitter extends EventEmitter {
  counter = 0;
}

const eventEmitter = new MyEventEmitter();

eventEmitter.once("event", function () {
  console.log(this.counter++);
});

eventEmitter.emit("event"); // 0
eventEmitter.emit("event"); // nothing happens
eventEmitter.emit("event"); // nothing happens
```

## 总结

本文介绍了 Node.js EventEmitter 的最重要的特性。由于它在 Node.js 的其他核心功能中被广泛使用，因此我们在接下来的系列文章中会遇到它，例如流（streams）等重要概念。

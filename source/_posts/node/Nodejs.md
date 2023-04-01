---
title: Node.js常见概念
categories:
- Node
tags:
- Node
---


## 架构

为啥取名为Node呢？

因为Node 的架构主要分为4大部分，`Node Standard Library`, `Node Bindings`, `V8`, `Libuv`

它通过将一个个节点连接起来，组成js的服务端运行时,我们看下面这张图

![node架构.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f4f9d04eb6264ca0b10ce45ba341b57c~tplv-k3u1fbpfcp-watermark.image?)

- 最上层的`Node Standard Library`, 是我们每天都在用的标准库， 如Http, Buffer模块
- `Node bindings`是沟通JS和C++的桥梁，封装V8和Libuv的细节，向上层提供基础API服务
- 最底层是支撑Node运行的关键，有c/c++实现
    - V8是google开发的JavaScript引擎，提供JavaScript运行环
    - Libuv是专门为Node开发的封装库，提供跨平台的异步I/O能力
    - C-ares用于异步请求DNS，它通过c实现
    - http_parser 、OpenSSL、zlib等提供包括http解析、SSL、数据压缩等其他功能

上面说到了Libuv是为Node开发的封装库，但是node在一开始时，使用的是libev实现**事件循环**来处理异步I/O、定时器和信号等事件。但是，随着node的流行，libev只能在Unix环境下运行的缺点暴露了出来，所以就自己实现了`libuv`来代替`libev`

## 特点
Node作为一个 JavaScript的后端运行平台，它保留了前端浏览器JavaScript中那些熟悉的接口(`setTimeout`、`setInterval`)。并且js的语言特性并没有改写


### 单线程
好处：
- 不像多线程编程那样处处在意状态的同步，没有死锁
- 没有上下文切换的性能开销
- 能够处理高并发，并能快速响应

坏处：
- 无法充分利用多核cpu
- 错误会blocking整个应用
- 大量计算占用CPU导致无法继续调用异步I/O

在浏览器中，JS长时间执行会导致UI渲染和响应被中断(卡顿), 那么浏览器在HTML5的标准中引入了`Web Worker`。 它可以创建一个单独个`工作线程`，将大计算量的js放入到该线程中执行。然后再通过消息传递的方式将结果给到`主线程`，不过`工作线程`无法访问到`DOM`等宿主对象.

Node采用了和`Web Worker`相同的思路来解决单线程中大计算量的问题，那就是`child_process`。这样，Node就可以通过`child_process`来解决程序 `健壮性`和`利用多核CPU`的问题。


### EventLoop(事件循环), Timer 和`process.nextTick()`
[文档](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick)

`事件循环`使Node能够执行非阻塞I/O(异步I/O)操作，这是因为在JavaScript中执行一些I/O操作时，比如`timer`、`网络任务`、`文件读写`等。 Node这个`runtime`会将这些事件都交给操作系统的内核来执行，因为大多数的现代内核都是`多线程`的，它们可以并行执行多个操作。然后，当某个操作完成后，内核会告诉Node，以便对应的回调函数可以被添加到`队列`中，最终被`事件循环`执行

下图显示了事件循环的操作顺序的概述

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/903cd57a79944f3f9dfaa8d3eb5e975b~tplv-k3u1fbpfcp-watermark.image?)

> 每个框表示事件循环中的一个”阶段(phase)“

每个阶段都有一个`先进先出`的队列，用于执行回调函数。尽管每个阶段各有特色，但通常情况下，当事件循环进入某个阶段时，它会执行该阶段特定的任意操作，然后执行该阶段队列中的回调函数，直到队列已被耗尽或已执行了最大数量的回调函数为止。当队列已被耗尽或达到回调限制时，事件循环将移动到下一个阶段，一直循环。

由于这些操作中的任何一个都可能安排更多的操作（耗时的运算），而且在处理轮询事件时由内核排队处理新事件，因此在处理轮询事件时可能会排队轮询事件。因此，长时间运行的回调函数可以使轮询阶段运行时间远远超过定时器的阈值。有关更多详细信息，请参阅计时器和轮询部分。

以下是各个阶段的描述:
- **timer**: 这个阶段执行由`setTimeout`和`setInterval`调度的回调函数
- **pending callbacks** : 延迟执行I/O 回调函数到下个循环中
- **idle, prepare**: 内部使用
- **poll** 检索新的I/O事件，执行I/O相关的回调函数（除了由关闭回调，定时器安排的回调和`setImmediate()外，几乎所有的回调都是如此`）；在适当的时候，Node会阻塞这里
- **check**: `setTmmediate()`回调函数在这里被调用
- **close callbacks**: 执行关闭回调，比如`socket.on('close', callback)`这些

在运行每次事件循环之间，Node.js会检查是否正在等待任何异步I/O或定时器，如果没有则会进行清理关闭


**以下是每个阶段的具体信息:**
#### timers 阶段
定时器指定了回调函数可执行的阈值，而非用户想要它执行的确切时间。定时器回调将在指定时间段过去后尽早地安排执行，但操作系统调度或其他回调的运行可能会延迟它们的执行。

#### pending callbacks 阶段
这个阶段执行一些系统操作的回调，如TCP错误的类型。例如，如果一个 TCP 套接字在连接时收到 `ECONNREFUSED` 错误,一些Unix/Linux 系统会等待一会再报告错误。这将会放到队列中，在`pending callbacks`阶段执行


#### poll 阶段

`poll`阶段有两个主要的方法:
1. 计算它应该阻塞和轮询I/O的时间，然后
2. 执行`poll`队列中的事件

当`事件循环`进入`poll`阶段且已经没有以及被调度的`timers`时，会发生两件事
1. 如果`poll` 队列不为空，`事件循环`将遍历其回调队列，同步执行它们，直到队列被耗尽或达到系统相关的硬限制。
2. 如果`poll`队列为空，会发生两件事
    - 如果脚本已经通过`setImmediate()`被执行，事件循环将会结束`poll`阶段，并且继续到`check`阶段去执行那些被调度的脚本
    - 如果没有通过 setImmediate() 执行脚本，事件循环将等待回调被添加到队列中，然后立即执行它们。

一旦`poll`队列为空，事件循环会检查已经达到时间阈值的定时器。如果有一个或多个定时器准备好了，事件循环将回到定时器阶段，执行这些定时器的回调。

#### check 阶段
该阶段允许在`poll(轮询)`阶段完成后立即执行回调。如果`poll`阶段变为空闲，并且使用 `setImmediate()` 安排了脚本，则事件循环可能会继续到`check`阶段，而不是等待。

#### close阶段
当一个socket连接或者一个handle被突然关闭时（例如调用了`socket.destroy()`方法），close事件会被发送到这个阶段执行回调。否则事件会用`process.nextTick（）`方法发送出去。




### **process.nextTick,setTimeout与setImmediate的区别与使用场景**

在node中有三个常用的用来推迟任务执行的方法：
- setTimeout（setInterval与之相同）
- setImmediate
- process.nextTick

这三者间存在着一些非常不同的区别：


#### process.nextTick()
您可能已经注意到，在图表中没有显示`process.nextTick()`，尽管它是异步API的一部分。这是因为`process.nextTick()`实际上并不属于事件循环的一部分。相反，`nextTickQueue`将在**当前操作**完成后被处理，而不管事件循环的当前阶段如何。在这里，**一个操作**被定义为从底层C/C++处理程序的转换和处理需要执行的JavaScript。(这里我的理解是解析JavaScript时会作为一个任务，被添加到事件队列中，然后`事件循环`在执行当前这个任务时`process.nextTick`的回调是永远优先于其他事件的。不过在另一个事件的回调中，调用`nexTick`只会在当前这个回调中优先于其他事件，我们可以看下面这个例子)
```js
const fs = require('fs')

setImmediate(function() {console.log('setImmediate')})
setTimeout(function() {console.log('setTimeout')}, 0)

fs.readFile('./fakeNew.js', (err, data) => {

  setImmediate(function() {console.log('inner readFile ----> setImmediate')})

  setTimeout(function() {console.log('inner readFile ----> setTimeout')}, 0)

  process.nextTick(function() {
    console.log('inner readFile ----> nextTick')
  })


  process.nextTick(function() {
    console.log('inner readFile ----> nextTick2')
  })

})

process.nextTick(function() {
  console.log('nextTick')
})

```

我们可以看到输出如下:
```
nextTick
setTimeout
inner readFile ----> nextTick
inner readFile ----> nextTick2
setImmediate
inner readFile ----> setImmediate
inner readFile ----> setTimeout
```

也就是说无论在哪个阶段调用`process.nextTick()`，所有传递给`process.nextTick()`的回调都会在事件循环继续之前被解决。这可能会导致一些不良情况，因为它允许通过递归`process.nextTick()`调用来“饿死”I/O，从而防止事件循环达到轮询阶段。

与执行`poll` 队列中的任务不同的是，这个操作在队列清空前是不会停止的。这也就意味着，错误的使用`process.nextTick()`方法会导致node进入一个死循环。。直到内存泄漏。

为什么像这样的东西会被包含在Node.js中？部分原因是一种设计哲学，即API应该始终是异步的，即使它不必是异步的。例如，考虑这段代码片段：
```js
function apiCall(arg, callback) {
  if (typeof arg !== 'string')
    return process.nextTick(
      callback,
      new TypeError('argument should be string'),
    );
}
```
这段代码片段进行参数检查，如果参数不正确，它将把错误传递给回调函数。最近更新的API允许将参数传递给`process.nextTick()`，使其能够接收回调函数之后传递的任何参数，并将其传递给回调函数，因此你不必嵌套函数。

我们所做的是将错误传递回用户，但仅在允许用户代码的其余部分执行后。通过使用`process.nextTick()`，我们保证apiCall()总是在用户代码的其余部分运行并且在允许事件循环继续之前运行其回调函数。为了实现这一点，JS调用栈允许展开，然后立即执行提供的回调函数，这允许人们对`process.nextTick()`进行递归调用，而不会导致v8的`RangeError: Maximum call stack size exceeded`。

这种理念可能导致一些潜在的问题情况。以这个片段为例。
```js

let bar;

// this has an asynchronous signature, but calls callback synchronously
function someAsyncApiCall(callback) {
  callback();
}

// the callback is called before `someAsyncApiCall` completes.
someAsyncApiCall(() => {
  // since someAsyncApiCall hasn't completed, bar hasn't been assigned any value
  console.log('bar', bar); // undefined
});

bar = 1;
```
用户定义了`someAsyncApiCall()`以具有异步签名，但实际上它是同步操作的。当调用它时，由`someAsyncApiCall()`提供的回调函数在事件循环的同一阶段中被调用，因为`someAsyncApiCall()`实际上并没有异步操作。因此，回调函数尝试引用bar变量，即使它可能还没有在范围内，因为脚本还没有能够完成运行。

通过将回调函数放置在`process.nextTick()`中，脚本仍然可以完全运行，允许在调用回调函数之前初始化所有变量、函数等。它还有一个优点，就是不允许事件循环继续。在允许事件循环继续之前，提醒用户存在错误可能是有用的。以下是使用`process.nextTick()`的先前示例：
```js
let bar;

function someAsyncApiCall(callback) {
  process.nextTick(callback);
}

someAsyncApiCall(() => {
  console.log('bar', bar); // 1
});

bar = 1;
```


下面有一个真正用在应用中的例子：
```js
const server = net.createServer(() => {}).listen(8080);

server.on('listening', () => {});
```

这个例子中当，当listen方法被调用时，除非端口被占用，否则会立刻绑定在对应的端口上。

这意味着此时这个端口可以立刻触发listening事件并执行其回调。然而，这时候`on('listening)`还没有将callback设置好，自然没有callback可以执行。

为了避免出现这种情况，node会在listen事件中使用`process.nextTick()`方法，确保事件在回调函数绑定后被触发。


#### **setTimeout()和setImmediate()**

在三个方法中，这两个方法最容易被弄混。实际上，某些情况下这两个方法的表现也非常相似。然而实际上，这两个方法的意义却大为不同。

`setTimeout()`方法是定义一个回调，并且希望这个回调在我们所指定的时间间隔后第一时间去执行。注意这个**第一时间执行**，这意味着，受到操作系统和当前执行任务的诸多影响，该回调并不会在我们预期的时间间隔后精准的执行。执行的时间存在一定的延迟和误差，这是不可避免的。node会在可以执行timer回调的第一时间去执行你所设定的任务。

`setImmediate()`方法从意义上讲是立刻执行的意思，但是实际上它却是在一个固定的阶段才会执行回调，即`poll`阶段之后。有趣的是，这个名字的意义和上面提到的`process.nextTick()`方法才是最匹配的。node的开发者们也清楚这两个方法的命名上存在一定的混淆，他们表示不会把这两个方法的名字调换过来---因为有大量的node程序使用着这两个方法，调换命名所带来的好处与它的影响相比不值一提。

setTimeout()和不设置时间间隔的setImmediate()表现上极其相似。猜猜下面这段代码的结果是什么？
```js
setTimeout(() => {
    console.log('timeout');
}, 0);

setImmediate(() => {
    console.log('immediate');
});
```
实际上，答案是不一定。没错，就连node的开发者都无法准确的判断这两者的顺序谁前谁后。这取决于这段代码的运行环境。运行环境中的各种复杂的情况会导致在同步队列里两个方法的顺序随机决定。

但是，在一种情况下可以准确判断两个方法回调的执行顺序，那就是在一个I/O事件的回调中。下面这段代码的顺序永远是固定的：
```js
const fs = require('fs');

fs.readFile('./path', (err, data) => {
  console.log('read file')
  setImmediate(function() {console.log('inner readFile ----> setImmediate')})
  setTimeout(function() {console.log('inner readFile ----> setTimeout')}, 0)
})

```
答案永远是：
```shell
immediate
timeout
```
因为在I/O事件的回调中，`setImmediate`方法的回调永远在`timer`的回调前执行。


## 模块加载
Node的模块规范和浏览器的模块规范不同，服务端node采用的是`Commonjs`规范，浏览器采用的`ESModule`规范

它们有两个比较大的差异
1. `Commonjs`模块输出的是一个**值的拷贝**,  `ESModule`输出的是**值的引用**


因为`Commonjs`模块输出的是值的拷贝，所以内部的变化影响不到这个值。不过只针对基本数据类型，当`module.exports`中导出了一个引用类型时，它拷贝的只是一个**引用**，所以还是会改变

再说回`ESModule`，它的运行机制是在JS引擎对脚本静态分析的时候，遇到`import`关键字，就会生成一个只读引用。
等到脚本真正执行时，再更具这个只读引用，找到对应模块然后取值。所以，只要原始值改变，`import`加载的内容也会跟着变。
因此,`ESModule`是动态引用，且不会缓存值，模块里面的变量绑定其所在的模块。

2. `CommonJS` 模块是运行时加载，`ESModule` 是编译时输出接口。

因为`CommonJS`加载的是一个对象(即`module.exports属性`)，该对象只有在脚本运行完才会生成。而`ESModule`不是对象，它的对外接口只是一种静态定义，在代码静态解析阶段生成



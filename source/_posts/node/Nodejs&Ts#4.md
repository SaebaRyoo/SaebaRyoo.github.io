---
title: Node.js TypeScript#3. Readable Stream(可读流)
date: 2023-04-05 10:24
categories:
- Node
tags:
- Node
mathjax: true
---

在Nodejs中，`Stream`是非常重要的，我们可以通过`Stream`来高效的读写数据。比如在处理文件或者处理http请求时。在这篇文章中，我们主要讲的是`readable stream(可读流)`

## Readable Streams

`Stream`是一种用于处理无法被一次性完全获取的数据集合。因为有了这种方式，数据不需要一次性全部存在内存中，这使得处理大量数据的时候变得高效。除此之外，你可以在只有部分数据可用时开始处理数据，而不是等待整个数据可用。

在我们之前的例子中，我们通过下面的方式读取文件：
```ts
import * as fs from 'fs';

async function readFile() {
  try {
    const content = await fs.promises.readFile('./file.txt')
    console.log(content instanceof Buffer) // true
    console.log(content.toString())
  } catch(err) {
    console.log(err)
  }
}
readFile()
```

上面的代码并不高效，因为它会等待整个文件加载到内存中然后再执行操作。而Nodejs为我们提供了`fs.createReadableStream`API来编写可读流的操作。

每一个`stream`都是`EventEmitter`的一个实例。通过`EventEmitter`我们可以监听到数据是否读取到。
```ts
import * as fs from 'fs';

const stream = fs.createReadStream('./file.txt');
stream.on('data', (chunk) => {
  console.log('New chunk of data:', chunk);
})
```

在上面的方法中，文件被存储在了内部的`buffer`中。根据`createReadStream`的第二个参数有一个`highWaterMark`属性（这里默认是64kib）。当触发`data`事件后，会根据它的限制来读取文件，如果文件大于它的阈值，那么就会被分割为多个**chunk**。

```ts
New chunk of data: <Buffer 68 61 61 61 61 61>
```

如上，每个`chunk`就是一个`buffer`实例。你的文件越大，接收到的`chunk`就越多。


如果想要将`buffer`转为字符串有以下几种方法：
1. `buffer.toString()`
```ts
const stream = fs.createReadStream('./file.txt');
stream.on('data', (chunk) => {
  console.log('New chunk of data:', chunk.toString());
})
```
2. 使用`StringDecoder`
```ts
import { StringDecoder } from 'string_decoder';

const decoder = new StringDecoder('utf-8')
const stream = fs.createReadStream('./file.txt');

stream.on('data', (chunk) => {
  return console.log('New chunk of data:', decoder.write(chunk as Buffer));
})
```
3. 还有一种就是通过在`createReadStream`中明确定义字符编码
```ts
const stream = fs.createReadStream('./file.txt', {encoding: 'utf-8'});
```

## 为什么会触发`data`事件？
在上面的示例中，我们通过在`data`事件上添加监听器，使`stream`开始发出`chunk`。

那么如果我们在创建`stream`后一段时间再添加回调函数，结果是什么呢？

我们仍然可以监听到数据。

想要更好的理解它，我们需要去看一下可读流的模式。`readable stream`有两个模式:
- paused
- flowing

我们可以看下面的例子：

```ts
const stream = fs.createReadStream('./file.txt');
setTimeout(() => {
  stream.on('data', (chunk) => {
    console.log(chunk);
  })
}, 2000);
```
我们首先创建了一个可读流，然后在`setTimeout`中延迟读取流。但是最终还是可以正常的读取数据，这是因为`可读流`和`可写流`都会将文件存储在了内部的`buffer`中。且所有`stream`默认都是使用`paused`模式。我们需要通过添加一个`data`事件的监听器来自动切换流的模式到`flowing`。当切换为`flowing`模式时，才开始读取数据，所以数据并不会因为延迟调用而丢失。


还有一种手动将`readable stream`切换到`flowing`模式的方法是调用 `stream.resume` 方法。
```ts
stream.resume();

setTimeout(() => {
  stream.on('data', (data) => {
      console.log(data)
  })
}, 2000);
```
上面这个例子中，我们是先手动修改模式，不过我们并没有及时的处理。所以当延迟执行后，`stream`已经丢失了。最终导致上面这个例子什么都不会输出

## `Readable stream`的原理是什么
在使用 `fs.createReadableStream` 熟悉可读流之后，让我们创建自己的可读流以更好地说明其工作原理。
```ts
import { Readable } from 'stream';

const stream = new Readable();

stream.push('Hello');
stream.push('World!');
stream.push(null);

stream.on('data', (chunk) => {
  console.log(chunk.toString());
});
```
push方法会将数据添加到`内部buffer`中，以供用户使用。最后`push(null)`表示流已经完成数据输入。

上面的例子会输出
```
Hello
World!
```

## `Readable`实例的`read`方法和`readable`事件
`readable.read()` 是可读流中用于手动触发读取数据的方法。当可读流处于`flowing`模式时，数据会自动从底层系统读取到内存中，并被放入`buffer`中，供用户使用。但是，在某些情况下，你可能需要手动控制数据的读取速度，这时候就可以使用 `readable.read()` 方法手动触发读取。

```ts
import { Readable } from 'stream';

const stream = new Readable();

const read = stream.read.bind(stream);
stream.read = function() {
  console.log('read() called');
  return read(2);
}

stream.push('Hello');
stream.push('World!');
stream.push(null);

stream.on('data', (chunk) => {
  console.log(chunk.toString());
});
```

当我们运行上面代码后，我们可以看到当我们开始读取流时，`read`函数被多次调用。并且，每次只输出两个字节。
```
read() called
He
read() called
ll
read() called
oW
read() called
or
read() called
ld
read() called
!
read() called
read() called
read() called
read() called
```

我们也可以使用`readable.on('readable')` 来读流是否有数据可供读取
```ts
import { Readable } from 'stream';

const stream = new Readable();

stream.push('Hello');
stream.push('World!');
stream.push(null);

stream.on('readable', () => {
  let data;
  // 使用一个循环，以确保我们读取所有当前可用的数据
  while (null !== (data = stream.read())) {
    console.log('Received:', data.toString());
  }
});
stream.on('end', () => {
  console.log('Reached end of stream.');
});
```
在上面的例子中，当可读流被读取时，会先在 `read` 方法中推送数据到队列中，然后当调用 `stream.read()` 时，会从`buffer`中读取数据。`readable.on('readable')` 用于监听可读流是否有新数据可供读取，当可读流中有新数据时，会触发回调函数，循环读取`buffer`中的数据，直到数据为空为止。

## 总结

在本文中，我们介绍了流是什么以及如何使用它们。虽然在本系列文章的这一部分中，我们着重讨论了可读流，但在接下来的部分中，我们将涵盖可写流、管道等更多内容。

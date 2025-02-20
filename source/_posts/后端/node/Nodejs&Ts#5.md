---
title: Node.js TypeScript#5. Writable Stream(可写流)
date: 2023-04-11 18:26
categories:
  - 后端
tags:
  - Node
---

在这篇文章中，我们会继续讲解`stream`，不过这次我们重点说的是`writable stream`和`pipe`。我们会通过几个例子来理解`writable stream`的工作原理。同时，我们提供了 Node 环境中`process`对象中出现的流的例子:`stdin`,`stdout`和`stderr`。

## Writable Stream

在之前文章的例子中，我们使用`fs.writeFile`方法创建和写入文件:

```ts
async function writeFile() {
  try {
    await fs.promises.writeFile("./file.txt", "hello-world");
    console.log("File created successfully");
  } catch (err) {
    console.log(err);
  }
  console.log(3);
}
writeFile();
```

不过在同一个文件上多次使用 `fs.writeFile` 会引起文件的并发写入问题，这意味着多个写入操作可能会同时尝试访问同一个文件，并导致数据写入的混乱和不确定性。因此，为了保证文件的数据完整性和安全性，每次使用 `fs.writeFile` 写入文件时，需要等待前一个操作完成后才能进行下一个操作，这样可以避免并发写入的问题。这种方式虽然简单易用，但不适用于处理大量数据的情况，因为等待时间可能会很长，导致程序的性能下降。我们可以看下面这个例子:

```ts
function writeToFile(data: string | NodeJS.ArrayBufferView) {
  fs.writeFile("test.txt", data, { flag: "a+" }, (err) => {
    if (err) {
      console.error(err);
    }
  });
}

// 连续写入 5 次数据
for (let i = 0; i < 5; i++) {
  writeToFile(`Data ${i}\n`);
}
```

当你运行这段代码时，你会发现，可能会出现乱序输出

```
Data 0
Data 2
Data 1
Data 4
Data 3
```

相比之下，使用 `fs.createWriteStream` 可以更好地处理大量数据的写入操作，下面是一个简单的例子：

```ts
// 创建可写流
const writeStream = fs.createWriteStream("test.txt", { flags: "a+" });

// 写入数据
function writeToStream(data: string) {
  writeStream.write(data);
}

// 连续写入 5 次数据
for (let i = 0; i < 5; i++) {
  writeToStream(`Data ${i}\n`);
}

// 关闭可写流
writeStream.end();
```

在这个例子中，我们使用 `fs.createWriteStream` 创建了一个可写流，并通过 `writeStream.write` 方法向文件中写入数据。这种方式可以分块逐个写入数据，避免了一次性写入大量数据的问题，因此可以更好地处理大量数据的写入操作，并提高程序的性能。

## Pipe

`pipe()` 是一个非常常用的方法，用于将可读流和可写流连接起来，以便从可读流中读取数据并将其写入到可写流中。例如：

```ts
const readableStream = fs.createReadStream("./file.txt");
const writableStream = fs.createWriteStream("./all.txt");

readableStream.pipe(writableStream);
```

在上面的例子中，我们通过创建了`readableStream`和`writableStream`两个流来读取和写数据。
然后我们通过`pipe`方法来将可读流中的数据传输到可写流中，直到可读流结束或者可写流关闭为止。

这种方式可以非常高效的处理大量数据，且不需要手动控制数据的流动。

除了将可读流和可写流连接起来，`pipe`还可以将多个可读流连接起来，并输出给单个可写流。这可以很方便的处理多个源的数据，例如多文件合并为单文件。

```ts
const readableStream1 = fs.createReadStream("file1.txt");
const readableStream2 = fs.createReadStream("file2.txt");
const writableStream = fs.createWriteStream("output.txt");

readableStream1.pipe(writableStream);
readableStream2.pipe(writableStream);
```

## 可写流的原理

`fs.createWriteStream`不是唯一创建可读流的方法。我们可以自己创建一个可读流。

每个可读流需要实现一个`_write`方法。当我们将数据写到流中时，就会间接的调用这个方法

```ts
import { Writable } from "stream";

const writable = new Writable();

writable._write = function (chunk, encoding, next) {
  console.log(chunk.toString());
  next();
};

writable.write("Hello world!");
```

上面的例子会输出`Hello world!`

在上面这个例子中，每次我们写入`stream`，字符串就会被 console 输出。`encoding`变量是一个字符串，表示我们数据的编码格式。调用`next`方法表示数据已经刷新，意味着我们完成了对它的处理。

`_write`方法也可以通过`Writable`构造函数，或者继承`Writable`类来声明。

有了这些知识，我们可以实现一个简化版的流，把数据写到一个文件中。

```ts
class WritableFileStream extends Writable {
  path: string;

  constructor(path: string) {
    super();
    this.path = path;
  }

  async _write(chunk: any, encoding: string, next: (error?: Error) => void) {
    try {
      await fs.promises.writeFile(this.path, chunk, { flag: "a+" });
      next();
    } catch (err) {
      next(err);
    }
  }
}

const readable = fs.createReadStream("./test.txt");
const readable1 = fs.createReadStream("./file.txt");
const writable = new WritableFileStream("./output.txt");

readable.pipe(writable);
readable1.pipe(writable);
```

在上面的例子中，每次我们写入数据时(使用的是 pipe，会自动调用`writable.write`)，都会将数据添加到`output.txt`后。

## Process 流

在第一章中，我们提到过全局`process`对象。除了`process.argv`和`process.execPath`等属性外，它还包含我们的应用程序可以使用的流。

### process.stdin

`process.stdin`是一个标准输入流(`standard input`)，用于读取用户的输入。我们可以通过以下代码创建一个简单的`REPL（Read-Eval-Print Loop）`

```ts
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("What is your name? ", (name: any) => {
  console.log(`Hello, ${name}!`);
  rl.close();
});
```

在这个例子中，`readline` 模块创建了一个 `Interface` 对象，将 `process.stdin` 作为输入流传递给它，然后通过 `rl.question()` 方法向用户提出一个问题，并在用户输入回答后，将回答作为参数传递给回调函数。

`process.stdin` 可以通过监听 `data` 事件来读取用户输入的数据，例如：

```ts
process.stdin.on("data", (data) => {
  console.log(`Received: ${data}`);
});
```

这段代码会打印出用户输入的数据。当用户按下回车键时，Node.js 会将输入的数据作为一个 Buffer 对象触发 `data` 事件，然后程序可以通过该事件的回调函数来处理数据。

### process.stdout 和 process.stderr

`process.stdout`和`process.stderr`是一个可写流。它们被用在`console.log()`和`console.error()`,向它们写入文本就会在控制台中输出。我们可以轻松地利用它们来记录文件：

```ts
const readable = fs.createReadStream("./test.txt");
readable.pipe(process.stdout);
```

## 总结

在本文中，我们介绍了可写流：如何使用它们来处理文件以及如何通过管道与可读流结合使用。我们还实现了可写流来处理文件，其中包括编写 \_write 函数。我们还学习了如何通过 process.stdin 流传递附加数据以及 process.stdout 和 process.stderr 流的作用。

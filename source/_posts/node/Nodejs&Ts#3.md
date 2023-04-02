---
title: Node.js TypeScript#3. Buffer
categories:
- Node
tags:
- Node
mathjax: true
---
> 这个系列是翻译文章，虽然是翻译，但有些地方还是做了一些修改。如果你想要看原版，那可以根据这个[链接](https://wanago.io/2019/02/25/node-js-typescript-3-the-buffer/)去查找。

这篇文章介绍了Node中另一个重要的概念:`Buffer`。为了理解它，我们还会解释什么是二进制数据和为什么我们需要 **character encodings(字符编码)** 。所有这些信息在深入研究Node.js的其他部分，例如`stream`时非常重要。



## Buffer

`Buffer`是Node中的一个全局对象，它不需要`require`就可以直接使用。它的主要作用是帮助我们处理二进制数据。

因为服务端不像客户端只需要做一些简单的字符操作或DOM操作，服务端需要处理`网络协议`、`数据库操作`、`图片处理`、`文件处理`、`加解密`等，在这些操作中，需要处理大量的二进制数据。

但是它究竟是什么？

计算机以二进制（0和1）表示数据。要存储一个数字，计算机首先将其转换为二进制表示。数字转换通常相对简单，在大多数情况下，不会对其二进制形式产生任何疑问。


但是数字并不是我们处理的唯一数据类型：我们还有图像、文本、视频等等。为了表示这些数据，我们需要制定一些约定，因为所有数据都是用数字来表示的。当涉及到文本时，有多种字符编码，定义字符集以及如何使用数字来表示它们。其中一个非常流行的编码是[UTF-8](https://en.wikipedia.org/wiki/UTF-8)，我们在本文中使用它。


## buffer 是一个数字数组


buffer对象，类似于number数组，它的每个**元素为16进制的两位数（存储的时候还是二进制，显示为16进制是因为可读性并且可以减少字符输出）**，表示一个字节。由于单个字节上保存的最大数字为255 **（因为一个字节可以表示的二进制位数是8位（1个字节 = 8个二进制位）。而每一位的值只有0或1两种可能，所以8位的二进制数可以表示2^8种不同的数值，即256种（从0到255）。因此，一个字节最多只能表示到255。）** 因此buffer元素不能包含更大的数字：

```ts
const buffer = Buffer.alloc(5);

buffer[0] = 255;
console.log(buffer[0]); // 255

buffer[1] = 256;
console.log(buffer[1]); // 0

buffer[2] = 260;
console.log(buffer[2]); // 4
console.log(buffer[2] === 260%256); // true

buffer[3] = 516;
console.log(buffer[3]); // 4
console.log(buffer[3] === 516%256); // true

buffer[4] = -50;
console.log(buffer[4]); // 206
```

如上所示，如果你尝试分配一个**大于255**的值，**256**就会除以这个数，并将**余数**分配给该值。

而负数的处理比较不同。如果你尝试将一个负数赋给一个字节，它将使用[二进制补码](https://en.wikipedia.org/wiki/Two%27s_complement)系统进行转换。

我们可以看到最后一个例子`buffer[4] = -50`，输出的是206

它的计算过程如下：

> $-50_{(10)} = 11001110_{(U2)}$

上面的公式表示把十进制数-50转化成二进制补码表示，补码表示方式为**取反加一**。具体过程如下：
1. 取绝对值，即50，转化为二进制数：00110010
2. 取反：11001101
3. 加一：11001110

最终得到的**11001110**是 **-50** 在二进制补码表示方式下的值。

然后在JavaScript中输出一个数字的时候，会默认将这个二进制数转换回正常的十进制展示。也就是类似如下，所以输出206

`parseInt('11001110', 2); // 206`


当你创建一个buffer，你也可以使用一个值来填充它
```ts
// Creates a Buffer of length 5, filled with 1
const buffer = Buffer.alloc(5, 1);

// Creates a Buffer containing 1, 2, 3
const buffer = Buffer.from([1, 2, 3]);
```

## 字符串Buffer

由于Buffer是存储字节数据, 你也可以使用Buffer来操作字符串

```ts
const buffer = Buffer.from('Hello world!');
```

默认情况下，我们需要记住它使用的是`UTF-8`编码。你可以使用传递给`from`函数的第二个参数来更改它。

例如Buffer可以使用toString方法来轻松读取
```ts
const buffer = Buffer.from('Hello world!');

console.log(buffer.toString()); // Hello world!
```

当然也并不总是那么简单！有许多UTF-8字符需要**多个字节来表示**，这可能会给你带来一些麻烦。让我们看看这个字符串：

> Hello 🌎 world!

中间有一个emoji，由四个字节组成： `11110000`  `10011111`  `10001100`  `10001110`

我们把这些数据保存在多个buffer：
```ts
const buffers = [
  Buffer.from('Hello '),
  Buffer.from([0b11110000, 0b10011111]),
  Buffer.from([0b10001100, 0b10001110]),
  Buffer.from(' world!'),
];
```
> `0b`表示是在JavaScript中写一个二进制数据


如果你按块解析一个大的文本文件，然后逐块解析，其中一个块可能只包含字符的一部分，就像上面的例子一样。

可以看我们下面的输出:

```ts

let result = '';
buffers.forEach((buffer) => {
  result += buffer.toString();
});

console.log(result); // Hello ��� world!
```

它并没有达到我们想要的效果。这是因为每个buffer都被单独处理。我们可以使用`StringDecoder`进行改进。它提供了一种API，用于将Buffer对象解码为字符串，同时保留多字节字符。
```ts
import { StringDecoder } from 'string_decoder';

const decoder = new StringDecoder('utf8');

const buffers = [
  Buffer.from('Hello '),
  Buffer.from([0b11110000, 0b10011111]),
  Buffer.from([0b10001100, 0b10001110]),
  Buffer.from(' world!'),
];

const result = buffers.reduce((result, buffer) => (
  `${result}${decoder.write(buffer)}`
), '');

console.log(result); // Hello 🌎 world!
```

`StringDecoder`可以确保解码后的字符串不包含任何不完整的多字节字符，它通过将不完整的字符保留在内部buffer中，直到下一次调用`decoder.write()`方法。


## 读取一个文件

在该系列的第一部分，我们读取一个指定编码的文件。
```ts

export default async function cat(path: string) {
  try {
    const content = await fs.promises.readFile(path, {encoding: 'utf-8'})
    console.log(content)
  } catch(err) {
    console.log(err);
  }
}
```
正是因为指定了编码格式，所以我们会接收到一个字符串。如果我们不提供一个编码格式，接收到的就是原始的buffer。需要通过`toString`来转换
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

`readFile`方法会一次性读取整个文件的内容。因此，即使文件非常大，它也只会在整个文件处理完后调用一次回调函数。如果想在整个文件内容被加载之前对文件的部分内容执行操作，需要使用`createReadStream`函数返回一个流。

## 总结
`buffer`是一个`字节数组`，其中每个元素的值范围从0到255。由于所有类型的数据（如图像和文本）都必须表示为数字，因此我们还解释了`字符编码`的概念。在讨论即将涉及到的流时，所有这些信息都是很重要的。







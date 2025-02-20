---
title: Node.js TypeScript#1. Modules, process参数, 文件系统基础
date: 2023-04-04
categories:
  - 后端
tags:
  - Node
---

> 这个系列是翻译文章，虽然是翻译，但有些地方还是做了一些修改。如果你想要看原版，那可以根据这个[链接](https://wanago.io/2019/02/11/node-js-typescript-modules-file-system)去查找。

在这个系列中，我们介绍了 Node.js 的核心概念。一般来说，在这个系列中，我们关注的是**Node.js**的环境，而不是**JavaScript**本身，同时使用 TypeScript 的静态类型优势。它涵盖了文件系统、事件循环和工作线程等方面。在本文中，我们创建了一个脚本，可以根据执行时传递的参数创建和读取文件。虽然我们在这里没有创建任何特定的 Web 应用程序，但我们学习了 Node.js 如何处理文件和服务器连接，这在许多情况下可能会有帮助。

## Node 基础

首先，让我们详细解释一下 Node.js 是什么，因为有时会被误解。简而言之，它是一个可以在浏览器外运行 JavaScript 的环境。现在在写前端项目时，大多都会用到 node，因为他附带了`Node Package Manager`。你可以使用一个简单的命令来查询:

`node -v`

## Modules

接下来让我们从一段比较奇特的代码开始来了解 Node 的模块是如何工作的

```js
console.log("hello");
return;
console.log("world!");
```

这个例子可能看起来有点奇怪，因为 ECMAScript 规范规定如下：

> 如果一个 ECMAScript 程序包含不在`FunctionBody`内的`return`语句，则被视为语法错误。

当你运行它时，你会发现没有报错信息显示并且会输出`hello`。这是因为在 Node.js 中，每个文件都被视为一个独立的`模块`。在底层，Node.js 将它们包装在一个类似这样的函数中：

```js
function (exports, require, module, __filename, __dirname) {
  // code of the module
}
```

由于这个特性，顶层变量的作用域仅限于`模块`内部，而不是整个项目的全局作用域。可以使用`模块`对象来导出值：

utilities.js

```js
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

module.exports = {
  add,
  subtract,
};
```

要想访问上面`utilities.js`中导出的模块，我们需要使用`require`函数;
main.js

```js
const { add, subtract } = require("./utilities.js");

console.log(add(1, 2)); // 3
console.log(subtract(2, 1)); // 1
```

这个模块系统是[CommonJS 规范](https://requirejs.org/docs/commonjs.html)的实现

Node.js 调用包装我们模块的函数的方式是，将`this`关键字引用到`module.exports`。我们只需要在`utilities.js`中加上这段，就可以很轻松的证明：

```js
console.log(this === module.exports);
```

上述经常会导致混淆，因为如果在控制台中运行 Node.js，`this`关键字会引用全局对象。

## 全局对象

作为一个 JS 开发者，你会比较熟悉浏览器中的`window`对象。在 Nodejs 中，我们有`global`对象。

当你在命令行运行 Node 或者是一个文件，Node 不会将你的代码包装在一个 module 中。当在命令行中使用 Node，你是在`全局作用域(global scope)`，`this`关键字指向`global`对象。然后，用`var`声明的变量被附加到`global`对象上,你可在终端中运行`node`，然后执行下面代码验证:

```shell
> this === global
// true
> var key = 'hello world';
> global.key
// 'hello world'
```

`global`对象在所有模块间共享。如果在这个对象中添加属性，它可以在所有地方访问

## Process 参数

`process`对象时`global`对象中的一个属性，因此你可以程序中的任何位置使用它。它非常有用，当我们需要收集有关 Node.js 应用程序环境的信息时，例如当前安装的 Node.js 版本。

在这个系列中将会深入讲解 process 对象，而今天我们专注于`process.argv`属性。该属性包含一个数组，其中包含启动 Node.js 进程时传递的**命令行参数**。

第一个元素与`process.execPath`相同，它保存了启动 Node.js 进程的可执行文件的绝对路径名。

第二个元素是被执行的 `JavaScript `文件的路径，而其余的`process.argv` 元素则是任何其他的命令行参数。

main.js

```js
process.argv.forEach((argument) => console.log(argument));
```

执行 main.js
`node ./main.js one two three`

然后输出如下信息:

```
/Users/xxx/.nvm/versions/node/v14.19.1/bin/node
/Users/xxx/Documents/practice/Demos/node/main.js
one
two
three
```

## 运行一个 Node.js 的 Ts 项目

首先需要 pnpm 初始化我们的项目，然后安装 typescript 和 ts-node

`pnpm init`

`pnpm i ts-node typescript @types/node -D`

然后在`package.json`中添加一个新的脚本来运行`ts-node`

```json
"scripts": {
  "start": "ts-node ./main.ts"
}
```

然后再在**根目录**添加一个`tsconfig.json`,内容如下:

```json
{
  "compilerOptions": {
    "sourceMap": true,
    "target": "ESNext",
    "alwaysStrict": true,
    "noImplicitAny": true
  },
  "exclude": ["node_modules"]
}
```

现在，就可以在`Node`中使用`Typescript`了。

我们可以使用 ES6 的`import/export`代替`module.exports/require`了。因为我们使用了`ts-node`，它可以将我们的 ts 代码编译为`CommonJS`规范的代码

## 文件系统

`fs`模块为我们提供了和文件交互的 API。所有的操作都支持`同步`和`异步`。但是，强烈建议使用`异步`函数来为我们的程序提供更高的性能。

`异步`函数总是把一个回调作为它的最后一个参数。让我们使用`Typescript`来创建我们的第一个脚本。

### writeFile

```ts
import * as fs from "fs";

fs.writeFile("./newFile.txt", "hello-world", (error: any) => {
  if (error) {
    console.log(error);
    return;
  }
  console.log("File created successfully");
});
```

要在 TypeScript 中使用文件系统模块，我们首先需要导入它。由于它是使用`CommonJS`规范的导出方式创建的，我们可以使用 `import * as fs` 来导入整个模块。

这个方法有三个参数

1. 文件路径
2. 要写入的输入，可以是 string, buffer 等。但是不能为 null
3. 回调函数

当然，相比较回调的写法，我们还可以使用`async/await`这种语法糖来更简洁的编写上面的代码

```ts
async function writeFile() {
  console.log(2);
  try {
    await fs.promises.writeFile("./newFile.txt", "hello-world");
    console.log("File created successfully");
  } catch (err) {
    console.log(err);
  }
  console.log(3);
}
writeFile();
console.log(1);
```

在该示例中，使用`fs.promises.writeFile()`方法来写文件。该方法返回一个 Promise 对象，因此可以使用`await`关键字等待其执行完毕。`await`关键字会阻塞当前的异步函数,也就是我们自己定义的`writeFile`，但**不会阻塞整个进程**，因此不会对其他的操作产生影响。

这里的**不阻塞整个进程**我们可以通过输出来验证。这段代码的输出如下：

```
2
1
File created successfully
3
```

使用文字来描述就是:

1. 这段脚本执行到了`writeFile`方法，输出`2`
2. 发现了`await`关键词。阻塞当前异步函数`writeFile`,交出权限给主线程
3. 主线程执行逻辑，执行完后发现还有未执行的异步函数
4. 回到对应的异步函数，然后输出`File created successfully`
5. 最后输出`3`

为了重新创建一些 bash 的功能，让我们使用 `process.argv` 传递额外的参数到我们的脚本中。我们从一个简单版本的`touch`脚本开始，它创建一个空文件：

main.ts

```ts
import touch from "./utils/touch";

const command = process.argv[2];
const path = process.argv[3];
const content = process.argv[4] || "";

if (command && path) {
  switch (command) {
    case "touch": {
      touch(path, content);
      break;
    }
    default: {
      console.log("Unknown command");
    }
  }
} else {
  console.log("Command missing");
}
```

utils/touch.ts

```ts
import * as fs from "fs";

export default async function touch(path: string, content: string) {
  try {
    await fs.promises.writeFile(path, content);
    console.log("File created successfully");
  } catch (err) {
    console.log(err);
  }
}
```

然后，在运行的命令后加上命令行参数:

`pnpm start touch ./file.txt haaaaa`

然后，会创建一个**file.txt**文件，内容为**haaaaa**

### readFile

我们实现的第二个函数为`cat`。他可以读取一个文件

`utils/cat.ts`

```ts
import * as fs from "fs";

export default async function cat(path: string) {
  try {
    const content = await fs.promises.readFile(path, { encoding: "utf-8" });
    console.log(content);
  } catch (err) {
    console.log(err);
  }
}
```

修改`main.ts`，添加一个 case 分支:

```ts
case 'cat': {
  cat(path);
  break;
}
```

然后运行

`pnpm start cat ./file.txt`

上面的命令读取的是`./file.txt`路径下的文件。readFile 方法的第二个参数是一个带有额外选项的对象。我们用它来定义一个文件的编码。没有它，readFile 函数的结果是一个`Buffer`。

文件系统可以做得更多，我们将在该系列的后续部分介绍流和文件描述符等功能。

## 总结

在这篇文章中，我们介绍了 TypeScript Node.js 的基础知识。其中包括模块的工作原理、全局对象是什么、文件系统的基础知识以及如何在运行 Node.js TypeScript 脚本时传递额外的参数

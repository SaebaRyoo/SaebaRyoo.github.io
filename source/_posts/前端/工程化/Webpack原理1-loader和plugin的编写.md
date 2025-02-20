---
title: Webpack的loader和plugin的编写
date: 2022-11-10
categories:
  - 前端
tags:
  - 工程化
  - Webpack
---

### loader 的链式调用和顺序执行

loader 就是一个 js 函数，它的作用就是接收源码，并返回新的源码。

如果是多个 loader 串行，则执行顺序是从右向左

```js
module.exports = {
  rules: [
    {
      test: /\.less$/,
      use: ["style-loader", "css-loader", "less-loader"],
    },
  ],
};
```

如上，编译 less 文件的执行顺序为 less-loader -> css-loader -> style-loader

那么，为什么是从后往前的呢？

首先，函数的组合有两种情况，

1. Unix 中的 pipline
2. Compose

那么 webpack 中使用的就是 Compose， 它的原理如下:

```js
compose =
  (f, g) =>
  (...args) =>
    f(g(...args));
```

我们可以通过如下的例子来验证

```js
// a-loader.js
module.exports = function (source) {
  console.log("loader a");
  return source;
};

// b-loader.js
module.exports = function (source) {
  console.log("loader b");
  return source;
};
```

然后，将 loader 引入到 webpack 的配置中

```js

module.exports = {
    entry: './src/index.js';
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    rules: [
        {
            test: /\.js$/,
            use: [
                path.resolve('./loaders/a-loader.js'),
                path.resolve('./loaders/b-loader.js'),
            ]
        }
    ]
}

```

借助`loader-runner`开发 loader
如下，开发一个 raw-loader

```js
// run-loader.js
const { runLoaders } = require("loader-runner");
const fs = require("fs");
const path = require("path");

runLoaders(
  {
    resource: "./demo.txt",
    loaders: [
      {
        loader: path.resolve(__dirname, "./src/loaders/raw-loader"),
        options: {
          name: "test",
        },
      },
    ],
    readResource: fs.readFile.bind(fs),
  },
  function (err, result) {
    err ? console.log(err) : console.log(result);
  }
);
```

然后编写 loader

```js
// raw-loader
module.exports = function (source) {
  const json = JSON.stringify(source)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  // return `export default ${json}`
  return this.callback(null, json); // 同步loader
};
```

loader 如何抛出错误

- 直接通过 throw

- 通过 this.callback 传递

```js
this.callback(
    err: Error | null,
    content: string | Buffer,
    sourceMap?: SourceMap,
    meta?: any
)
```

**loader 的异步处理**
通过`this.async`来返回一个异步 loader

```js
// raw-loader
module.exports = function (source) {
  const callback = this.async();
  const json = JSON.stringify(source)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  fs.readFile(path.join(__dirname, "./async.txt"), "utf-8", (err, result) => {
    callback(null, result);
  });
};
```

**在 loader 中使用缓存**

- webpack 中默认开启 loader 缓存，可以使用 this.cacheable(false) 关掉缓存
- 缓存条件: loader 在结果相同的输入下有确定的输出， 有依赖的 loader 无法缓存

**自动合成雪碧图 loader**

支持的语法：

background: url('a.png?**sprite') ->
-> background: url('sprite.png')
background: url('b.png?**sprite') ->

### 插件的基本结构

```js
class MyPlugin {
  // 1. 插件名称
  apply(compiler) {
    // 2. 插件上的apply方法，注入compiler
    compiler.hooks.done.tap("My Plugin", () => {
      // hooks
      console.log("...."); // 插件处理逻辑
    });
  }
}

module.exports = MyPlugin;
```

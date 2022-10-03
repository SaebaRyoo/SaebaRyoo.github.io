---
title: 如何搭建一个前端开发环境(一):Webpack(一) - 基础概念
categories:
- 前端
tags: 
- Webpack
- 工程化
---

**前端开发配置系列文章的github仓库为： https://github.com/SaebaRyoo/webpack-config ,如果您在看的过程中发现了什么不足和错误，感谢您能指出！**

## 概念

Webpack是一个静态模块打包器，它将所有的资源都看作模块。通过一个或多个入口，构建一个依赖图谱(dependency graph)。然后将所有模块组合成一个或多个bundle

<div align="center">
   <img src="https://i.postimg.cc/JzjqbKNW/image.png" width = "600" alt="" align=center />
</div>


可以通过一个简单的例子来初步了解Webpack

**比如： 我们想要使用es6的箭头函数来写一个功能，但是有的浏览器不支持（IE6-11或其他老版本浏览器）。那么这个用户在加载这个js资源的时候就会报错。**

但这显然不是我们想要的结果，这时候就需要用到webpack或像gulp这样的构建工具来帮助我们将es6的语法转化成低版本浏览器可兼容的代码。

那么用webpack来配置一个构建工具时如下：

1. 创建一个目录，并`yarn init`初始化一个包管理器


2. 安装webpack `yarn install webpack webpack-cli -D`

3. 想要将es6转化为es5语法，需要用到babel插件对代码进行编译,所以需要安装babel和相应的loader `yarn add @babel/core @babel/preset-env babel-loader -D`
4. 配置.babelrc
```json
{
    "presets": [
        [
            "@babel/preset-env",
            {
                "modules": false
            }
        ]
    ]
}
```

5. 创建src/index.js 入口
```js
const sum = (a, b) => a + b;
console.log(sum(1, 2))
```

6. 创建输出文件 dist/html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <script src="./bundle.js"></script>
</body>
</html>
```

7. 然后就是配置webpack.config.js
```js
const webpack = require('webpack');
const path = require('path');

const config = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  }
};

module.exports = config;
```


8. 最后通过构建命令`./node_modules/.bin/webpack --config webpack.config.js --mode development` 运行配置，会生成一个dist/bundle.js文件，这就是转换后的js文件

```js
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ (() => {

eval("var sum = function sum(a, b) {\n  return a + b;\n};\nconsole.log(sum(1, 2));\n\n//# sourceURL=webpack://webpack-config/./src/index.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./src/index.js"]();
/******/ 	
/******/ })()
;
```


**上面这个例子就使用了webpack的几个核心概念**

1. 入口 entry

在webpack的配置文件中通过配置entry告诉webpack所有模块的入口在哪里

2. 输出 output

output配置编译后的文件存放在哪里，以及如何命名

3. loader

loader其实就是一个pure function，它帮助webpack通过不同的loader处理各种类型的资源，我们这里就是通过babel-loader处理js资源，然后通过babel的配置，将输入的es6语法转换成es5语法再输出

4. 插件 plugin

上面的例子暂时没有用到，不过也很好理解，plugin就是loader的增强版，loader只能用来转换不同类型的模块，而plugin能执行的任务更广。包括打包优化、资源管理、注入环境变量等。简单来说就是loader能做的plugin可以做，loader不能做的plugin也能做


以上就是webpack的核心概念了
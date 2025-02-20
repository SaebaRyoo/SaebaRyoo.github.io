---
title: Webpack原理之HMR( Hot Module Replacement，可以翻译为「模块热更新」)
date: 2022-11-11
categories:
  - 前端
tags:
  - 工程化
  - Webpack
---

HMR 能够在保持页面状态不变的情况下动态更新代码模块，在 webpack 实现 HMR 之前，应用的加载更新都是一种页面级别的院子操作。
即使再小的改动，如更新字体大小等都会重新加载整个页面，会降低整体开发效率，如：

- 对于复杂表单，你需要重新填写很多字段
- 弹框消失，可是你只需要修改弹框内一些小样式，却还需要重新执行显示该弹框的交互动作

## 使用 HMR

**从 webpack-dev-server v4 开始，HMR 是默认启用的。它会自动应用 webpack.HotModuleReplacementPlugin，这是启用 HMR 所必需的。因此当 hot 设置为 true 或者通过 CLI 设置 --hot，你不需要在你的 webpack.config.js 添加该插件。**

## 实现原理

1. 使用`webpack-dev-server(WDS)`创建一个 server，托管静态资源，同时以 Runtime 方式注入一段处理`HMR`逻辑的客户端代码
2. 浏览器加载页面，与`WDS`建立 WebSocket 连接
3. Webpack 监听到文件变化，增量构建产生变更的模块，并通过 WebSocket 发送`hash`事件
4. 浏览器接收到`hash`事件后，请求`manifest`资源文件，确认增量变更范文
5. 浏览器加载产生变更的增量模块
6. Webpack 运行时触发变更模块的`module.hot.accept`回调。执行代码变更逻辑

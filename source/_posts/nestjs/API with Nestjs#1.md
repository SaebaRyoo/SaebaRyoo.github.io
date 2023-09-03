---
title: API with Nestjs#1 Controllers, 路由和模块(module)结构
categories:
- Nest.js
tags:
- Node
- Nest.js
---
# TODO

Nestjs 是一个用来构建Node引用的框架。与其他一些比较灵活的框架如：**Express**、**Koa**相比，我们需要遵循它的编程规范。当然，不同的框架好处是不一样的，
灵活的好处就是可以定制化，但是需要花费更多的时间和精力去架构。而规范化可以迫使我们遵循良好的实践，使我们的应用在整体上保持一致性。

NestJS默认使用Express.js作为其底层框架。关于Express可以看作者的[TypeScript Express](https://wanago.io/2018/12/03/typescript-express-tutorial-routing-controllers-middleware/)

重要的一点是[NestJS的文档](https://docs.nestjs.com/)十分全面，你会从中受益。在这里，我们试图对知识进行分类整理，但有时也会链接到官方文档。我们还提到Express框架，以突出使用NestJS的优势。为了更好地理解本文，对Express有一定的经验可能会有帮助，但不是必需的。


> 如果你想要探究Nodejs的核心，我推荐查看[Node.js TypeScript series](https://wanago.io/2019/02/11/node-js-typescript-modules-file-system/)。它覆盖了例如，`stream`,`event loop`,`多线程`和`使用worker threads实现多线程编程`的主题。此外，了解如何在没有任何框架（如Express和NestJS）的情况下创建API，可以让我们更加欣赏这些框架的优势。


## Getting started with NestJS


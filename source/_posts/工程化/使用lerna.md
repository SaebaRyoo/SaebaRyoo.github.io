---
title: lerna在单仓库管理多项目的使用小结
categories:
- 前端
tags:
- 工程化
---

lerna是一个monorepo工具，用来在一个仓库中管理多个项目。而我最近向造个轮子，这个轮子需要抽离出一些组件库，且自身也会用到。而lerna就非常适合这种场景。


## 下载

1. 全局下载 `yarn global add lerna` 或 `npm install lerna -g`

2. 初始化项目 `cd lerna-demo && cd lerna-demo`然后`lerna init`

执行完init后会多出一个`packages`目录和`lerna.json`，并且会配置一个`workspace`

3. 创建不同的项目
然后我们可以在packages中创建不同的项目,具体代码可以查看[lerna-demo](https://github.com/SaebaRyoo/Demos/tree/main/lerna-demo/packages)

> 代码里有个需要注意的点就是打包配置中设置的打包方式要和你引入的方式是一致的，或者直接在打包配置中设置`esm`、`cjs`和`umd`三种方式，然后根据不同的规范去引入不同的代码。

这里我们有三个项目`header`, `footer`, `website`

webstite就是我们的项目，其他两个是组件库。而我们需要在website中使用它们。那么就需要在website的package.json中导入，方法如下:

```json
{

  // ...
  "dependencies": {
    // ...
    "header": "*",
    "footer": "*"
  }
}
```
这样就相当于告诉lerna去link workspace中的`header`和`footer`，就像`npm install`了一样。

然后再`yarn`执行一下命令


## 打包项目
如果需要打包所有的项目则直接运行`lerna run build`

lerna会按照依赖顺序，先打包`header`和`footer`，最好再打包`website`

也可以使用`--scope`配置 指定需要打包的项目`lerna run build --scope header --scope footer`,这样，website项目就不会被打包。


运行单元测试也同上。


## 项目运行
打包好了两个依赖项目后，就可以运行`website`了，

`lerna run dev --scope=website`

也可以不加`--scope`,因为其他两个项目中并没有`dev`这个运行命令。

最后就可以直接访问了

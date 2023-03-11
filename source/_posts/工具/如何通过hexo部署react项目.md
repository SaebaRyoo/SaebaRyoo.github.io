---
title: 如何通过Hexo +  Github Pages部署react项目
categories:
- 前端
tags:
- hexo
---

我们都知道hexo是一个静态博客框架，它配合github pages可以部署个人博客，但是hexo会默认编译`source`目录下所有文件，
而我们自己的react项目打包出来以后已经是编译后的文件了。所以我们需要让hexo跳过编译我们指定的文件

## 配置修改

hexo也给我们提供了一个参数`skip_render`, 用于跳过指定文件的编译，直接复制到public中。

那么，我们需要做的就是在`source`目录下创建一个新项目`source/your-project`

然后在根目录的`_config.yml`中有一个`skip_render`字段，我们只需要按照以下来配置即可
```yml
skip_render:
  - your-project/**/*
```

然后就可以将打包的项目放入到`source/your-project`中去，我们以打包一个react项目为例，可能包含以下的文件

- your-project
  - index.html
  - imgs
    - a.png
    - b.svg
  - assets
    - index-03c73ac2-baad1081.js
    - index-b4e46d6f-92026574.js
    - index-bf437fc1-230805f9.js
    - index-e60f790f.js
    - index-e63df4eb.css


这里需要注意的是，如果你没有在你的构建工具中去做设置的话，一般情况下打包出来的`index.html`里面对应的资源文件的引用都是绝对路径，比如`<script type="module" crossorigin src="/assets/index-e60f790f.js"></script>`

但是部署到github pages中需要相对路径，所以需要改成这样`<script type="module" crossorigin src="./assets/index-e60f790f.js"></script>`


## 项目路由修改

正常到这里就结束了，但是如果项目中使用了路由管理，那么就需要修改项目中对应的路由前缀，我们以`react-router`为例,需要添加上你在`source`目录下创建的项目的目录名。

```tsx

  {
    path: '/your-project',
    element: <App />,
  },
  {
    path: '/your-project/preview',
    element: <Preview />,
  },
```
因为github pages中是按照你创建的那个目录为路由的。所以最终到线上的访问地址就是`xxx.github.io/your-project`。但是如果不在`react-router`中给路由加上前缀，你到线上访问`xxx.github.io/your-project`就会因为无法找到对应的资源而报404。


最后我们直接运行`hexo clean && hexo g && hexo d`就可以完成发布了，然后就可以到线上访问你的react项目了

## 总结
对于一些个人展示小项目来说，白嫖服务器太爽了。既减少了购买服务器的开支，又省的自己配置web服务器

---
title: 如何锁定项目的node版本
date: 2020-09-03 10:23
categories:
- 前端
tags:
- Npm
- Node
---

在一个项目中,随着时间的推移，一些依赖库可能只能工作于当时安装时所采用的node版本。这时再使用新版本node时就无法保证项目在一个稳定的环境中运行，甚至是无法运行。为了稳定，通常我们需要在开始时就选定一个兼容性强的node LTS版本，并且在项目中锁定版本。

### .nvmrc
如果项目中使用了nvm来进行版本控制，需要在根目录创建一个`[.nvmrc](https://github.com/nvm-sh/nvm#nvmrc)`文件来指定node版本，内容如下：

.nvmrc
```
v14.19.1
```

### package.json
我们可以通过在`package.json`中设置`engines`属性来指定版本范围。[npm-package文档](https://docs.npmjs.com/cli/v9/configuring-npm/package-json)

指定node版本的范围
```json
{
  "engines": {
    "node": ">=14.19.1 <=17.9.0"
  }
}
```

固定为指定版本
```json
{
  "engines": {
    "node": "~14.19.1"
  }
}
```


### .npmrc
前面我们说了在package.json中指定`engines`属性来限制node版本，这个在`yarn`和`pnpm`中时有效的。
在配置了engines后,再使用nvm将node版本变为v12.8.3之后再使用`yarn`来安装依赖，就会报错
[![image.png](https://i.postimg.cc/RFSFp28j/image.png)](https://postimg.cc/3yqYdf3B)

`pnpm i`也是相似的报错

但是使用`npm i`并不会按照`engines`的属性来报错，这是因为在npm中设置了[engine-strict](https://docs.npmjs.com/cli/v7/using-npm/config#engine-strict)默认为false。因此，我们需要创建`.npmrc`来显式的定义为true，如下

.npmrc
```
engine-strict=true
```

这样当node未满足版本要求时，就无法运行`npm install`了

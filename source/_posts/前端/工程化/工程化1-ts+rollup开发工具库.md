---
title: 使用Typescript和rollup开发一个工具库,并使用github actions来自动发布npm包
date: 2023-05-21
categories:
  - 前端
tags:
  - 工程化
---

在日常开发中，经常会遇到一些通用的逻辑，导致每次都需要复制粘贴。而我们作为 coder，可以将一些常用业务逻辑封装成通用的函数库，并发布到 npm 中。
这样，每次遇到新的项目时，只需要 install 一下即可

**这里我们已经有了一个[fe-utils](https://github.com/SaebaRyoo/fe-utils) 前端日常开发工具库，也是本文最后的产物，并且后续也会持续更新。如果你有一个开源的心，但是没信心去为大的项目提 pr，不妨从这个封装日常通用逻辑的项目做起，我们一起进步！！！**

接下来我们就尝试自己动手实现一个工具库

## 创建项目

首先在自己的 github 上创建一个项目，然后拉取。进入到该仓库中，执行`yarn init`。一路 enter 下去。

## 主要目录结构

```
- .github
    - workflows
        - xx.yml
- .husky
- src
    - __test__
    - index.ts
    - sum.ts
- .editorconfig
- .gitignore
- .npmignore
- commitlint.config.js
- jest.config.mjs
- package.json
- rollup.config.js
- tsconfig.json
```

## 配置项目

### 1. 安装 rollup 和 ts

`yarn add rollup typescript -D`

### 2. 配置 typescript 配置文件

`yarn tsc --init`生成一个默认的配置文件，然后根据我们的项目，改成如下:

```json
{
  "compilerOptions": {
    "target": "es5" /* 编译目标 */,
    "module": "commonjs" /* 项目模块类型 */,
    "lib": ["ES2018", "DOM"],
    "allowJs": true /* 是否允许js代码 */,
    "checkJs": true /* 检查js代码错误 */,
    "declaration": true /* 自动创建声明文件(.d.ts) */,
    "declarationDir": "./lib" /* 声明文件目录 */,
    "sourceMap": true /* 自动生成sourcemap文件 */,
    "outDir": "lib" /* 编译输出目录 */,
    "rootDir": "./src" /* 项目源码根目录，用来控制编译输出的目录结构 */,
    "strict": true /* 启用严格模式 */
  },
  "include": ["src/index.ts"],
  "exclude": ["node_modules", "lib"]
}
```

### 3. 配置 rollup.config.js

在配置之前，我们需要安装几个 rollup 插件
`yarn add @rollup/plugin-node-resolve @rollup/plugin-typescript @rollup/plugin-commonjs rollup-plugin-terser -D`

这几个分别是如下作用
@rollup/plugin-node-resolve 处理路径
@rollup/plugin-typescript 支持 ts
@rollup/plugin-commonjs 处理 commonjs
rollup-plugin-terser 压缩 umd 规范的输出文件

```js
const resolve = require("@rollup/plugin-node-resolve");
const typescript = require("@rollup/plugin-typescript");
const commonjs = require("@rollup/plugin-commonjs");
const { terser } = require("rollup-plugin-terser");

module.exports = [
  {
    input: "./src/index.ts",
    output: [
      {
        dir: "lib",
        format: "cjs",
        entryFileNames: "[name].cjs.js",
        sourcemap: false, // 是否输出sourcemap
      },
      {
        dir: "lib",
        format: "esm",
        entryFileNames: "[name].esm.js",
        sourcemap: false, // 是否输出sourcemap
      },
      {
        dir: "lib",
        format: "umd",
        entryFileNames: "[name].umd.js",
        name: "FE_utils", // umd模块名称，相当于一个命名空间，会自动挂载到window下面
        sourcemap: false,
        plugins: [terser()],
      },
    ],
    plugins: [resolve(), commonjs(), typescript({ module: "ESNext" })],
  },
];
```

### 4. 修改 package.json

我们直接看完整的 package.json

```json
{
  "name": "@lxnxbnq/utils",
  "version": "0.0.2-alpha",
  "main": "lib/index.cjs.js",
  "module": "lib/index.esm.js",
  "jsnext:main": "lib/index.esm.js",
  "browser": "lib/index.umd.js",
  "types": "lib/index.d.ts",
  "files": ["lib"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/SaebaRyoo/fe-utils.git"
  },
  "author": "SaebaRyoo <yuanddmail@163.com>",
  "license": "MIT",
  "scripts": {
    "build": "rollup -c",
    "test": "jest"
  },
  "devDependencies": {
    "@rollup/plugin-babel": "^6.0.3",
    "@rollup/plugin-commonjs": "^23.0.4",
    "@rollup/plugin-node-resolve": "^15.0.1",
    "@rollup/plugin-typescript": "^10.0.1",
    "@types/jest": "^29.2.4",
    "jest": "^29.3.1",
    "rollup": "^3.7.2",
    "rollup-plugin-terser": "^7.0.2",
    "ts-jest": "^29.0.3",
    "tslib": "^2.4.1",
    "typescript": "^4.9.4"
  },
  "description": "前端业务代码工具库",
  "bugs": {
    "url": "https://github.com/SaebaRyoo/fe-utils/issues"
  },
  "homepage": "https://github.com/SaebaRyoo/fe-utils#readme",
  "dependencies": {}
}
```

其中需要注意的有如下几个字段

告知使用者不同的规范引用哪个文件

- "main": "lib/index.cjs.js", // 当使用 commonjs 规范时会使用这个包
- "module": "lib/index.esm.js", // 使用 esm 时，会使用这个包
- "jsnext:main": "lib/index.esm.js", //这个同上，不过这个是社区规范，上面是官方规范
- "browser": "lib/index.umd.js", // umd 规范，当直接在浏览器中开发时，可以直接下载 release 包并在浏览器中使用 script 导入

ts 类型文件

- "types": "lib/index.d.ts",

使用`yarn run build`打包项目

- "scripts": {
  "build": "rollup -c",
  },

files 字段是用于约定在发包的时候 NPM 会发布包含的文件和文件夹。

"files": [
"lib"
],

### 5. 安装 jest + lint + prettier + husky + commit-msg 对代码的质量进行约束

首先是安装安装测试框架 jest，因为项目时基于 ts 写的，所以需要配置 jest 来支持 ts
`yarn add -D jest ts-jest @types/jest`

1. 创建配置文件
   `yarn jest --init`

2. 修改配置文件,完整如下

jest 的默认环境是 node，但是我们这个工具库是面向前端的，肯定需要操作 dom，所以需要安装`yarn add jest-environment-jsdom -D`来支持 DOM 和 BOM 操作

然后就是在使用到 DOM 或者 BOM 对象的测试文件的顶部加上这一行注释即可运行

```js
/**
 * @jest-environment jsdom
 */
```

或者在配置文件中修改运行环境为`testEnvironment: 'jsdom'`

```js
/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  preset: "ts-jest",
  testEnvironment: "jsdom", // 支持测试环境访问dom
  // 配置测试环境ua
  testEnvironmentOptions: {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
  },
};
```

3. 在 package.json 的 script 中添加 cli 命令

```json
{
  "scripts": {
    "test": "jest",
    "coveralls": "jest --coverage"
  }
}
```

4. 最后按照[这篇文章](https://juejin.cn/post/7179185223760871483)的步骤来配置规范代码的文件

## 开发

我们先在 src 的目录下写一个简单的 sum 方法以及一个单元测试

src/sum.ts

```ts
export function sum(...args: number[]): number {
  return args.reduce((prev, total) => total + prev, 0);
}
```

在入口中导入并导出

src/index.ts

```ts
export { sum } from "./sum";
```

写一个 sum 的单元测试

src/**test**/sum.test.ts

```ts
import { sum } from "../index";

describe("sum", () => {
  it("should work", () => {
    expect(sum()).toEqual(0);
  });
});
```

到这，基本上一个最简单的 npm 包就开发完了，接下来就是需要发布

## npm 包发布

### 1. 手动发布

首先需要准备一个账号，然后进行登录，输入你的 npm 账号、密码、邮箱
`npm login`

可以用`npm logout`退出当前账号

`npm who am i`查询当前登录的账号

> Scoped packages default to restricted, but you can either publish them as public using npm publish --access=public, or set their access as public using npm access public after the initial publish.
> 范围内的软件包默认为限制性的，但你可以使用`npm publish --access=public`将其发布为公共的，或者在初始发布后使用`npm access public`将其访问权限设置为公共的。

登录成功就可以通过`npm publish`将包推送到服务器上

如果某版本的包有问题，可以使用`npm unpublish [pkg]@[version]`将其撤回

**注意：如果使用`@[scope]/package`的命名形式，[scope]一定要写你的账号名，不然发布的时候会提示 404**

### 2. 使用 github action 发布 npm、创建 release 以及处理一些工作流程

如果不了解 github action 的话, 建议先学习一下[github actions](https://docs.github.com/en/actions)的一些概念

在根目录下创建`.github/workflows/node.js.yml`CI 配置文件（这里也可以在仓库上的 tab 栏中找到 Actions 生成）

**注意：如果你需要不同的 actions，可以在[Marketplace](https://github.com/marketplace)中查找需要的 action**

#### 目标

1. 自动发布 npm 包
2. 创建 release 并上传对应 asset
3. 跑单元测试，生成测试覆盖率提交到 coveralls

#### 准备工作

1. 在 npm 中生成 token

![npm_access_token](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3d25fb73438c471f8fad6e84ec15c47c~tplv-k3u1fbpfcp-zoom-1.image)

2. 然后复制 token 到 github 对应仓库的秘钥中

![actions secrets](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a1723d8e466c42df98a86fde8e853955~tplv-k3u1fbpfcp-zoom-1.image)

3. 设置一个变量名，我们这里设置的是`NPM_ACCESS_TOKEN`，后面可以在 CI 中通过`secrets.NPM_ACCESS_TOKEN` 获取到

#### 整体代码

有了以上的思路来看下面的整体代码

```yml
# This workflow will do a clean installation of node dependencies, cache/restore them, build the source code and run tests across different versions of node
# For more information see: https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs

name: Node.js CI

on:
  push:
    branches: ["main"]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x]
        # See supported Node.js release schedule at https://nodejs.org/en/about/releases/

    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: "yarn"
      - run: yarn
      # 测试，并生成测试覆盖率文件
      - run: yarn run coveralls
      - run: yarn run build
      # 上报
      - name: Coveralls
        uses: coverallsapp/github-action@master
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

  # publish-npm任务
  publish-npm:
    # 在ubuntu最新版本的虚拟机执行
    runs-on: ubuntu-latest
    # 设置变量
    strategy:
      matrix:
        node-version: [18.x]
    steps:
      # 检查并切换到main分支
      - name: 检查main分支
        # 使用actions/checkout插件
        uses: actions/checkout@v3

      # 初始化缓存
      - name: 缓存
        uses: actions/cache@v3
        id: cache-dependencies
        with:
          path: node_modules
          key: ${{runner.OS}}-${{hashFiles('**/yarn.lock')}}

      # 安装node
      - name: 设置Node.js
        # 使用actions/setup-node插件
        uses: actions/setup-node@v3
        with:
          # node版本
          node-version: ${{ matrix.node-version }}
      - run: yarn
      - run: yarn run build

      # 读取当前版本号
      - name: 读取当前版本号
        id: version
        uses: notiz-dev/github-action-json-property@release
        with:
          # 读取版本号
          path: "./package.json"
          prop_path: "version"

      - run: echo ${{steps.version.outputs.prop}}

      # 创建Release
      - name: release
        # 原本使用的 actions/create-release@latest来发版， actions/upload-release-asset@v1上传release-asset
        # 不过这两个action官方已经停止维护了，所以换成如下
        uses: softprops/action-gh-release@v1
        with:
          files: ./lib/index.umd.js
          name: v${{steps.version.outputs.prop}}
          tag_name: v${{steps.version.outputs.prop}}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # 发布NPM包
      - name: 发布NPM包
        # 执行发布代码
        run: |
          npm config set //registry.npmjs.org/:_authToken=$NPM_TOKEN
          npm publish
        env:
          # 配置 npm access token 环境变量
          NPM_TOKEN: ${{secrets.NPM_ACCESS_TOKEN}}

      # 刷新缓存
      - name: 刷新缓存
        run: |
          curl https://purge.jsdelivr.net/npm/iemotion-pic@latest/lib/name.json
```

## 为 readme 添加 badge(徽章)

我们会发现在一个开源项目中，readme 通常都会写的很好，而且还有很多的 badge,如 ant-design 的 readme

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/89d6d77ff1cb47549efff3c34806ad3c~tplv-k3u1fbpfcp-zoom-1.image)

那么这一切都是怎么完成的呢？一些简单的 badge 可以直接在[shields](https://shields.io/)中输入仓库名即可生成。

比如：

workflow 工作流状态： ![GitHub Workflow Status](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1b685d42f946452d9f203c47fa332849~tplv-k3u1fbpfcp-zoom-1.image)

npm 包版本： ![npm](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/672520d5f7e24fd5a4cd385fc88424a5~tplv-k3u1fbpfcp-zoom-1.image)

license: ![GitHub](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d888e9488a5e4fe7a1a2f12cc422959b~tplv-k3u1fbpfcp-zoom-1.image)

我们也可以根据自己需要来创建不同的 badge

不过要添加测试覆盖率的 badge 会稍稍有些麻烦。

1. 首先进入[coveralls 官网](https://coveralls.io/)，进去后需要通过 github 的授权

2. 授权后点击左侧侧边栏的 ADD REPOS 会进入如下页面

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7c665490a1314097ac2ad996345bb3f7~tplv-k3u1fbpfcp-zoom-1.image)

然后我们将需要生成 badge 徽章的库设置为 on 即可

3. 后面的流程就是在 CI 中执行测试脚本并生成测试覆盖率的文件然后上传到 coveralls 就可以了

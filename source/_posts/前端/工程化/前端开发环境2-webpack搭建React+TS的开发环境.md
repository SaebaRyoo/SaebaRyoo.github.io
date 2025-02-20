---
title: 如何搭建一个前端开发环境(二):Webpack(二) - 添加React + TS
date: 2022-11-04
categories:
  - 前端
tags:
  - Webpack
  - 工程化
---

**前端开发配置系列文章的 github 仓库为： https://github.com/SaebaRyoo/webpack-config ,如果您在看的过程中发现了什么不足和错误，感谢您能指出！**

> 上一篇总结了基础的 webpack 概念。那么，从这一篇就开始搭建一个在项目中使用的正式开发环境了

## 解析 React + TS

1. 首先是安装需要的库

`yarn add react react-dom react-hot-loader -S`

`yarn add typescript ts-loader @hot-loader/react-dom -D`

2. 修改 babel

```
{
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false
      }
    ],
    '@babel/preset-react'
  ],
  plugins: [
    'react-hot-loader/babel'
  ]
}
```

3. 配置 tsconfig.json

```json
{
  "compilerOptions": {
    "outDir": "./dist/",
    "sourceMap": true,
    "strict": true,
    "noImplicitReturns": true,
    "noImplicitAny": true,
    "module": "es6",
    "moduleResolution": "node",
    "target": "es5",
    "allowJs": true,
    "jsx": "react"
  },
  "include": ["./src/**/*"]
}
```

4. 然后就是配置解析 react 和 ts 的 loader

webpack.config.js

```js
const config = {
    ...
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, // 新增加了jsx，对React语法的解析
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.ts(x)?$/, // 对ts的解析
        loader: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  ...
};

module.exports = config;
```

## 解析图片和字体

1. 下载 loader

`yarn add file-loader url-loader -D`

2. 修改 webpack 配置

```js
const config = {
    ...
  module: {
    rules: [
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/, // 解析字体资源
        use: 'file-loader'
      },
      {
        test: /\.(png|jpg|jpeg|gif)$/, // 解析图片资源，小于10kb的图解析为base64
        use: [
            {
                loader: 'url-loader',
                options: {
                    limit: 10240
                }
            }
        ]
      },
    ]
  },
  ...
};
```

## 解析 css、less,使用 MiniCssExtractPlugin 将 js 中的 css 分离出来，形成单独的 css 文件，并使用 postcss-loader 生成兼容各浏览器的 css

1. 安装 loader

`yarn add css-loader style-loader less less-loader mini-css-extract-plugin postcss-loader autoprefixer -D`

2. 配置 postcss.config.js

```js
module.exports = {
  plugins: [require("autoprefixer")],
};
```

3. 配置 webpack

这里写了两个差不多的 css-loader 的配置，因为在项目中会同时遇到使用全局样式和局部(对应页面的)css 样式。所以，配置了两个，使用 exclude 和 css-loader 中的 options.modules: true 来区分， 当创建的 css 文件名中带有 module 的就表示为局部 css，反之为全局样式

```js
// 引入plugin
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const config = {
    ...
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
            }
          },
          'postcss-loader'
        ],
        exclude: /\.module\.css$/
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: true
            }
          },
          'postcss-loader'
        ],
        include: /\.module\.css$/
      },
      {
        test: /\.less$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'less-loader'
        ]
      }
    ]
  },

  plugins: [
    new MiniCssExtractPlugin()
  ],

  ...
};
```

## 使用文件指纹策略（hash、chunkhash、contenthash）

为什么会有这些配置呢？因为浏览器会有缓存，该技术是加快网站的访问速度。但是当我们用 webpack 生成 js 和 css 文件时，内容虽然变化了，但是文件名没有变化。所以浏览器默认的是资源并没有更新。所以需要配合 hash 生成不同的文件名。下面就介绍一下这三种有什么不同

### fullhash

该计算是跟整个项目的构建相关，就是当你在用这个作为配置时，所有的 js 和 css 文件的 hash 都和项目的构建 hash 一样

### chunkhash

hash 是根据整个项目的，它导致所有文件的 hash 都一样，这样就会发生一个文件内容改变，使整个项目的 hash 也会变，那所有的文件的 hash 都会变。这就导致了浏览器或 CDN 无法进行缓存了。

而 chunkhash 就是解决这个问题的，它根据不同的入口文件，进行依赖分析、构建对应的 chunk，生成不同的哈希

比如 a.87b39097.js -> 1a3b44b6.js 都是使用 chunkhash 生成的文件
那么当 b.js 里面内容发生变化时，只有 b 的 hash 会发生变化，a 文件还是 a.87b39097.js
b 文件可能就变成了 2b3c66e6.js

### contenthash

再细化，a.js 和 a.css 同为一个 chunk (87b39097),a.js 内容发生变化，但是 a.css 没有变化，打包后它们的 hash 却全都变化了，那么重新加载 css 资源就是对资源的浪费。

而 contenthash 则会根据资源内容创建出唯一的 hash，也就是内容不变，hash 就不变

**所以，根据以上我们可以总结出在项目中 hash 是不能用的，chunkhash 和 contenthash 需要配合使用**

webpack 配置如下

```js

const config = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    // chunkhash根据入口文件进行依赖解析
    filename: '[name].[chunkhash:8].js'
  },
  module: {
    rules: [
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: "asset/resource",
        generator: {
          filename: 'fonts/[hash:8].[ext].[query]'
        },
        // use: 'file-loader',
      },
      {
        test: /\.(png|jpg|jpeg|gif)$/,
        // webpack5中使用资源模块代替了url-loader、file-loader、raw-loader
        type: "asset",
        generator: {
          filename: 'imgs/[hash:8].[ext].[query]'
        },
        parser: {
          dataUrlCondition: {
            maxSize: 4 * 1024 // 4kb
          }
        }
        // use: [
        //   {
        //     loader: 'url-loader',
        //     options: {
        //       // 文件内容的hash,md5生成
        //       name: 'img/[name].[hash:8].[ext]',
        //       limit: 10240,
        //     },
        //   },
        // ],
      },
    ]
  },
  plugins: [
    ...
    new MiniCssExtractPlugin({
        filename: `[name].[contenthash:8].css`
    }),
    ...
  ],
};

module.exports = (env, argv) => {
  if (argv.hot) {
    // Cannot use 'contenthash' when hot reloading is enabled.
    config.output.filename = '[name].[fullhash].js';
  }

  return config;
};

```

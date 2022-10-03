---
title: 如何搭建一个前端开发环境(二):Webpack(二) - 添加React + TS
categories:
- 前端
tags: 
- Webpack
- 工程化
---

**前端开发配置系列文章的github仓库为： https://github.com/SaebaRyoo/webpack-config ,如果您在看的过程中发现了什么不足和错误，感谢您能指出！**

> 上一篇总结了基础的webpack概念。那么，从这一篇就开始搭建一个在项目中使用的正式开发环境了


## 解析React + TS

1. 首先是安装需要的库

`yarn add react react-dom react-hot-loader -S`

`yarn add typescript ts-loader @hot-loader/react-dom -D`

2. 修改babel

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

3. 配置tsconfig.json
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
        "jsx": "react",
    },
    "include": [
        "./src/**/*"
    ]
}
```

4. 然后就是配置解析react和ts的 loader

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

1. 下载loader

`yarn add file-loader url-loader -D`

2. 修改webpack配置

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

## 解析css、less,使用MiniCssExtractPlugin将js中的css分离出来，形成单独的css文件，并使用postcss-loader生成兼容各浏览器的css

1. 安装loader

`yarn add css-loader style-loader less less-loader mini-css-extract-plugin postcss-loader autoprefixer -D`

2. 配置postcss.config.js
```js
module.exports = {
  plugins: [
    require('autoprefixer')
  ]
};
```

3. 配置webpack

这里写了两个差不多的css-loader的配置，因为在项目中会同时遇到使用全局样式和局部(对应页面的)css样式。所以，配置了两个，使用exclude和css-loader中的options.modules: true来区分， 当创建的css文件名中带有module的就表示为局部css，反之为全局样式

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

为什么会有这些配置呢？因为浏览器会有缓存，该技术是加快网站的访问速度。但是当我们用webpack生成js和css文件时，内容虽然变化了，但是文件名没有变化。所以浏览器默认的是资源并没有更新。所以需要配合hash生成不同的文件名。下面就介绍一下这三种有什么不同

### fullhash

该计算是跟整个项目的构建相关，就是当你在用这个作为配置时，所有的js和css文件的hash都和项目的构建hash一样

### chunkhash

hash是根据整个项目的，它导致所有文件的hash都一样，这样就会发生一个文件内容改变，使整个项目的hash也会变，那所有的文件的hash都会变。这就导致了浏览器或CDN无法进行缓存了。

而chunkhash就是解决这个问题的，它根据不同的入口文件，进行依赖分析、构建对应的chunk，生成不同的哈希

比如 a.87b39097.js -> 1a3b44b6.js  都是使用chunkhash生成的文件
那么当b.js里面内容发生变化时，只有b的hash会发生变化，a文件还是a.87b39097.js 
b文件可能就变成了2b3c66e6.js

### contenthash
再细化，a.js和a.css同为一个chunk (87b39097),a.js内容发生变化，但是a.css没有变化，打包后它们的hash却全都变化了，那么重新加载css资源就是对资源的浪费。

而contenthash则会根据资源内容创建出唯一的hash，也就是内容不变，hash就不变



**所以，根据以上我们可以总结出在项目中hash是不能用的，chunkhash和contenthash需要配合使用**


webpack配置如下

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


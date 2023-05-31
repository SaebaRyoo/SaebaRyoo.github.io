---
title: 如何搭建一个前端开发环境(六):如何优化webpack?
categories:
- 前端
tags:
- 工程化
- Webpack
---


**前端开发配置系列文章的github仓库为： https://github.com/SaebaRyoo/webpack-config ,如果您在看的过程中发现了什么不足和错误，感谢您能指出！**


作为一个前端开发，Webpack一定不陌生，在前端这一领域，大多数的项目应该都是用webpack作为一个模块打包工具。但是当项目的规模变大后，应该都或多或少的遇到了性能相关的问题。


而以webpack作为工具，则可以将性能分为两种：

1. 构建速度

2. 页面加载速度

以这两个为目的，对我们的项目进行优化。

## 尽量使用高版本的webpack和node
Webpack和Node每次一大版本的更新都会伴随着性能优化，这是最直接明显的

## speed-measure-webpack-plugin

该插件的作用就是分析loader和plugin的打包速度，针对信息定制优化方案

安装`yarn add speed-measure-webpack-plugin -D`

webpack.config.js
```js
const SpeedMeasureWebpackPlugin = require('speed-measure-webpack-plugin')
const swp = new SpeedMeasureWebpackPlugin()

module.exports = swp.wrap(yourConfig);
```


## webpack-bundle-analyzer
分析打包模块体积


## 多线程进行TypeScript的类型检查
在项目中使用了ts-loader后，项目中ts文件的类型检查会非常的耗时。所以我们通过ts-loader的配置关闭类型检查，并使用fork-ts-checker-webpack-plugin在另一个的线程进行类型检查。这会大大减少webpack的编译时间。

`yarn add fork-ts-checker-webpack-plugin -D`

```js
module.exports = {
    module: {
        rules: [
            {
                test: /\.ts(x)?$/,
                use: [
                {
                    loader: 'ts-loader',
                    options: {
                    // 关闭类型检查，即只进行转译
                    // 类型检查交给 fork-ts-checker-webpack-plugin 在别的的线程中做
                    transpileOnly: true,
                    },
                },
                ],
                exclude: /node_modules/,
            },
        ]
    },

    plugins: [
        new ForkTsCheckerWebpackPlugin(),
    ]
}
```

## 预编译资源模块（该方案在webpack4之后，优化效果就不是很明显了）

使用webpack官方的DllPlugin进行分包
- 思路： 将一些基础且且比较稳定的包打包成一个文件，如react、react-dom、redux、react-redux
- 方法： DLLPlugin分包，DllReferencePlugin对manifest.json引用。引用manifest.json会自动关联DllPulugin中的包

这需要一个单独的 webpack.dll.js 配置文件

```js
const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.less', '.css'],
    modules: [__dirname, 'node_modules']
  },
  entry: {
    // 制定需要分离的包
    react: ['react', 'react-dom', 'redux', 'react-redux'],
  },
  output: {
    filename: '[name].dll.js',
    path: path.join(__dirname, 'dll/'),
    library: '[name]_[fullhash]',
  },
  plugins: [
    new webpack.DllPlugin({
      name: '[name]_[fullhash]',
      path: path.join(__dirname, 'dll', 'manifest.json'),
    }),
  ],
};

```

在根目录创建一个dll目录，然后运行`webpack --config webpack.dll.js`，将一些基础包提前编译出来，dll目录下会有 manifest.json react.dll.js两个文件

然后在主要的webpack配置中引用

需要安装一个插件将dll文件导入到html中
`yarn add add-asset-html-webpack-plugin -D`

```js
module.exports = {
    plugins: [
        // 将预编译的公共库导入到html中
        new AddAssetHtmlPlugin({ filepath: require.resolve('./dll/react.dll.js') }),
        // webpack4之后dllPlugin对性能的提升就不大了
        new webpack.DllReferencePlugin({
            context: __dirname,
            // manifest.json就是对我们要引入包的描述
            manifest: require('./dll/manifest.json'),
        }),
    ],
}
```



## 多进程并行压缩js代码, css代码压缩
```js
module.exports = {

  optimization: {
    minimize: true,
    minimizer: [
        // js压缩
        new TerserPlugin({
            parallel: 4 // 默认为当前电脑cpu的两倍 os.cpus().length - 1
        })
        // css压缩
        new CssMinimizerPlugin(),
    ]
  }
}
```


## 缩小构建目标
目的：尽可能的少构建模块

比如 babel-loader 不解析 node_modules

优化resolve.modules 配置（减少模块搜索层级）

优化resolve.mainFields配置

优化resolve.extensions配置

合理使用alias


## 使用tree shaking擦除无用的js和css
webpack中，只要使用的是es6的语法，默认都会对js代码进行tree shaking

但是css代码并不能tree shaking，所以需要使用到 purgecss-webpack-plugin

安装`yarn add purgecss-webpack-plugin@4.1.3 -D`.

**为什么要安装4.1.3版本呢？因为我使用的是webpack5，这个最新版本5.0.0在webpakc中有一个Constructor Error的错误，[具体请看](https://github.com/FullHuman/purgecss/issues/994)**

```js
const path = require('path');
const glob = require('glob');
const PATHS = {
  src: path.join(__dirname, 'src'),
};
module.exports = {
    plugins: [
        new PurgecssPlugin({
            paths: glob.sync(`${PATHS.src}/**/*`, { nodir: true }),
        }),
    ]
}
```

## 对图片进行压缩

首先安装对应插件
`yarn add image-minimizer-webpack-plugin @squoosh/lib -D`

在这个安装的过程中可能会出现错误(我是在使用 **imagemin** 时出现的，可能和@squoosh/lib无关)，可以按照以下方法逐步排除（我的是在mac中出现的，如果是在别的环境，就按照别的环境的命令安装）
- node lib/install.js error: `brew install automake autoconf libtool` https://github.com/imagemin/imagemin-mozjpeg/issues/11
- Permission denied @ apply2files: `sudo chown -R ${LOGNAME}:staff /usr/local/lib/node_modules`  https://stackoverflow.com/questions/61899041/macos-permission-denied-apply2files-usr-local-lib-node-modules-expo-cli-n
- Build error: no nasm (Netwide Assembler) found: `brew install nasm`

然后就是在生产构建流程中加入以下配置
```js
module.exports = {
  optimization: {

    minimizer: [
      //...

      new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.squooshMinify,
          options: {
            // Your options for `squoosh`
            // The document where you can find options is https://github.com/webpack-contrib/image-minimizer-webpack-plugin#optimize-with-squoosh
          },
        },
      }),
    ]
  }
}
```

## 对项目进行分包 更多细节可以看[这篇文章](https://juejin.cn/post/6919684767575179278)
基本分包策略：
1. 公共的库是一定要尽量拆的。
2. 公共的库尽量做到按需加载，这也是优化首屏加载需要注意的。
3. 分包不能太细，0KB 至 10 KB 的包是极小的包，应当考虑合并。10 KB 至 100 KB 的包是小包，比较合适；100 KB 至 200 KB 的包只能是比较核心重要的包，需要重点关注，大于 200KB 的包就需要考虑拆包了。当然，也不排除一些特殊情况。

```js
module.exports = {

  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      // chunks: 'async',
      // minSize: 20000,
      // minRemainingSize: 0,
      // minChunks: 1,
      // maxAsyncRequests: 30,
      // maxInitialRequests: 30,
      // enforceSizeThreshold: 50000,
      cacheGroups: {
        // 提取公共资源
        vendor: {
          test: /[\\/]node_modules[\\/]_?react(.*)/,
          name: 'vendors-react-bucket',
          priority: 20,
          chunks: 'all',
        },
      },
    },
  },
}
```

### 使用externals将第三方库排除在打包的bundle外

将一些比较稳定的，常用的第三方库分离出打包流程中，使用cdn进行加载，能很有效的降低bundle的体积，加快首屏渲染时间，突破浏览器对同一域名下资源并发请求的限制

```js
module.exports = {

  // 使用cdn来增加浏览器针对同一域名的并发限制，使用externals将这些库排除在bundle外
  externals: {
    react: 'react',
    'react-dom': {
      commonjs: 'react-dom',
      amd: 'react-dom',
      root: '_', // 指向全局变量
    },
    redux: 'redux',
    'react-redux': 'react-redux',
    'react-router': 'react-router',
    'react-router-dom': 'react-router-dom',
  },
}
```

然后将这些排除的第三方库的稳定包采用cdn部署，并在项目的入口`index.html`文件中引入
```html
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
```

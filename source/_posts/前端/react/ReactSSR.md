---
title: React SSR（Server Side Render）
date: 2020-09-10
categories:
  - 前端
tags:
  - React
---

## 客户端渲染 vs 服务端渲染

|          | 客户端渲染                                    | 服务端渲染                     |
| -------- | --------------------------------------------- | ------------------------------ |
| 请求     | 多个请求(HTML, 数据等)                        | 1 个请求(HTML)                 |
| 加载过程 | HTML 和数据串行加载                           | 1 个请求返回 HTML 和数据       |
| 渲染     | 前端加载空白 html，然后加载 js 生成 html 结构 | 服务端渲染出完整 html 结构返回 |
| 速度     | 有白屏时间                                    | 减少白屏时间                   |
| SEO      | 不利于 SEO                                    | 对于 SEO 友好                  |

**总结: 通过对比我们发现，SSR 的优势就是能够有效的减少请求，减少白屏时间，从而提升用户体验。还有重要的一点就是 SSR 它能直接在服务端生成丰富的 html 页面，有利于爬虫进行分析，因此对于我们的 SEO 更加友好，这在 ToC 的项目中比较重要**

## SSR 代码实现思路

具体代码看 [github 仓库](https://github.com/SaebaRyoo/Demos/tree/main/react-ssr)

### 服务端

- 使用 react-dom/server 的 renderToString 方法将 React 组件渲染成字符串
- 服务端路由返回对应的模板

### 客户端

- 打包出针对服务端的组件

### 注意点

服务端渲染需要注意的问题有以下几个：

1. 模块系统不同，前端使用的是 import 和 export node 使用的是 commonjs 中的 module.export 和 require。所以在使用时需要抹平这个差异
2. BOM 缺失，如 window 对象
   可以在 node 端添加这一段代码

```js
if (typeof window === "undefined") {
  global.window = {};
}
```

3. DOM 缺失
   比如代码中用到了 DOM 对象，可以使用`isBrowser`来做环境判断

```js
import React, { useState } from "react";

function isBrowser() {
  return !!(
    typeof window !== "undefined" &&
    window.document &&
    window.document.createElement
  );
}

export default () => {
  const [state, setState] = useState(isBrowser() && document.visibilityState);

  return state;
};
```

4. 样式问题
   内联 css 样式

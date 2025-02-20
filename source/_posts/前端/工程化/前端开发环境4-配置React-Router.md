---
title: 如何搭建一个前端开发环境(四):配置React-Router并对代码进行分割和动态import
date: 2022-11-06
categories:
  - 前端
tags:
  - 工程化
---

**前端开发配置系列文章的 github 仓库为： https://github.com/SaebaRyoo/webpack-config ,如果您在看的过程中发现了什么不足和错误，感谢您能指出！**

## React Router 快速了解

React Router 一共有 6 种 Router Components，分别是 BrowserRouter、HashRouter、MemoryRouter、NativeRouter、Router、StaticRouter

**详细请看[这里](https://saebaryoo.github.io/2022/09/29/react/ReactRouter/)**

在这个系列文章中，我们要做的是一个单页应用，所以使用的是 React Router6 BroserRouter, 它是基于 html5 规范的 window.history 来实现路由状态管理的。
它不同于使用 hash 来保持 UI 和 url 同步。使用了 BrowserRouter 后，每次的 url 变化都是一次资源请求。所以在使用时，需要在 Webpack 中配置，以防止加载页面时出现 404

## webpack 配置

webpack.config.js

```js

const config = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
    // 配置中的path是资源输出的绝对路径,而publicPath则是配置静态资源的相对路径
    // 也就是说 静态资源最终访问路径 = output.publicPath + 资源loader或插件等配置路径
    // 所以，上面输出的main.js的访问路径就是{__dirname}/dist/dist/main.js
    publicPath: '/dist',
    ...
  },
  devServer: {
    // 将所有的404请求redirect到 publicPath指定目录下的index.html上
    historyApiFallback: true,
    ...
  },
}
```

关于 publicPath 请看[这里](https://juejin.cn/post/6844903601060446221)

## 配置 React-router

1. 安装 react-router`yarn add react-router-dom`

2. 安装@babel/plugin-syntax-dynamic-import 来支持动态 import `yarn add @babel/plugin-syntax-dynamic-import -D`

3. 将动态导入插件添加到 babel 中

```json
{
  "plugins": ["@babel/plugin-syntax-dynamic-import"]
}
```

编写 react-router 配置,使用 React.lazy 和 React.Suspense 来配合 import 实现动态加载, 它的本质就是通过路由来分割代码成不同组件，Promise 来引入组件，实现只有在通过路由访问某个组件的时候再进行加载和渲染来实现动态导入

config/routes.tsx

```tsx
import React from "react";

const routes = [
  {
    path: "/",
    component: React.lazy(() => import("../src/pages/Home/index")),
  },
  {
    path: "/mine",
    component: React.lazy(() => import("../src/pages/Mine/index")),
    children: [
      {
        path: "/mine/bus",
        component: React.lazy(() => import("../src/pages/Mine/Bus/index")),
      },
      {
        path: "/mine/cart",
        component: React.lazy(() => import("../src/pages/Mine/Cart/index")),
      },
    ],
  },
];

export default routes;
```

src/pates/root.tsx

```tsx
import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import routes from "@/config/routes";

const Loading: React.FC = () => <div>loading.....</div>;

const CreateHasChildrenRoute = (route: any) => {
  return (
    <Route key={route.path} path={route.path}>
      <Route
        index
        element={
          <Suspense fallback={<Loading />}>
            <route.component />
          </Suspense>
        }
      />
      {RouteCreator(route.children)}
    </Route>
  );
};

const CreateNoChildrenRoute = (route: any) => {
  return (
    <Route
      key={route.path}
      path={route.path}
      element={
        <Suspense fallback={<Loading />}>
          <route.component />
        </Suspense>
      }
    />
  );
};

const RouteCreator = (routes: any) => {
  return routes.map((route: any) => {
    if (route.children && !!route.children.length) {
      return CreateHasChildrenRoute(route);
    } else {
      return CreateNoChildrenRoute(route);
    }
  });
};

const Root: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>{RouteCreator(routes)}</Routes>
    </BrowserRouter>
  );
};

export default Root;
```

App.tsx

```tsx
import * as React from "react";
import { sum } from "@/src/utils/sum";
import Header from "./components/header";
import img1 from "@/public/imgs/ryo.jpeg";
import img2 from "@/public/imgs/乱菊.jpeg";
import img3 from "@/public/imgs/weather.jpeg";
import Root from "./pages/root";

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
};

export default App;
```

index.tsx

```tsx
import * as React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./styles.css";
import "./styles.less";

const container = document.getElementById("app");
createRoot(container!).render(<App />);
```

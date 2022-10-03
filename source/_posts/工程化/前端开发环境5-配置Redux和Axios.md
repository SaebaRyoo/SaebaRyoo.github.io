---
title: 如何搭建一个前端开发环境(五):状态管理库Redux和Axios请求配置
categories:
- 前端
tags: 
- 工程化
---
**前端开发配置系列文章的github仓库为： https://github.com/SaebaRyoo/webpack-config ,如果您在看的过程中发现了什么不足和错误，感谢您能指出！**


## redux

### 为什么使用

在一个中大型的项目中，统一的状态管理是必不可少的。尤其是在组件层级较深的React项目中，可以通过redux和react-redux来跨层级传输组件(通过实现react的Context)。
1. 避免一个属性层层传递，代码混乱
2. view（视图）和model(模型)的分离，使得逻辑更清晰
3. 多个组件共享一个数据，如用户信息、一个父组件与多个子组件


**可以看一下这篇关于[redux概念和源码分析](https://saebaryoo.github.io/2022/10/01/react/redux%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0/)的文章**

### 怎么用

使用官方推荐的@reduxjs/toolkit来统一管理在redux开发过程中经常使用到的middleware

1. 安装相应工具`yarn add redux react-redux @reduxjs/toolkit`

2. 创建一个redux的初始管理入口 src/core/store.ts

```typescript
import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';

/**
 * 创建一个Redux store,同时自动的配置Redux DevTools扩展，方便在开发过程中检查
 **/
const store = configureStore({
});

// 定义RootState和AppDispatch是因为使用的是TS作为开发语言，
// RootState通过store来自己推断类型
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default store;

```

3. 在对应目录下创建不同组件的state

pages/mine/model/mine.ts

```typescript
import { AppThunk, RootState } from '@/src/core/store';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchCount } from '@/src/service/api';

// 为每个单独的store定义一个类型
interface CounterState {
  value: number;
}

// 初始state
const initialState: CounterState = {
  value: 0,
};

export const counterSlice = createSlice({
  name: 'mine',
  initialState,
  reducers: {
    increment: (state) => {
      // 在redux-toolkit中使用了immutablejs ，它允许我们可以在reducers中写“mutating”逻辑
      //（这里需要提一下redux的reducer本身是个纯函数，即相同的输入，总是会的到相同的输出，并且在执行过程中没有任何副作用。而这里的state.value+=1 实际就是state.value = state.value + 1，它修改了传入的值，这就是副作用。虽然例子中是简单类型，并不会修改源数据，但是如果存储的数据为引用类型时会给你的项目带来意想不到的bug），
      // 这就不符合redux对于reducer纯函数的定义了，所以使用immutablejs。让你可以写看似“mutating”的逻辑。但是实际上并不会修改源数据
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    // Use the PayloadAction type to declare the contents of `action.payload`
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

// 支持异步dispatch的thunk，项目中比较常见，因为很多时候需要和后端交互，获取到后端数据，然后再保存到store中
export const asyncIncrement =
  (amount: number): AppThunk =>
  async (dispatch, getState) => {
    // selectCount(getState());
    const response = await fetchCount(amount);
    dispatch(incrementByAmount(response.data));
  };

// Action creators are generated for each case reducer function
export const { increment, decrement, incrementByAmount } = counterSlice.actions;

// Other code such as selectors can use the imported `RootState` type
// export const selectCount = (state: RootState) => state.mine.value;

export default counterSlice.reducer;

```

4. 在视图中dispatch action 和使用state

mine/index.tsx

```tsx
import React from 'react';
import { decrement, increment, asyncIncrement } from './model/mine';
import { useAppSelector, useAppDispatch } from '@/src/utils/typedHooks';

const Mine: React.FC = () => {
  // The `state` arg is correctly typed as `RootState` already
  const count = useAppSelector((state) => state.mine.value);
  const dispatch = useAppDispatch();

  return (
    <div>
      <button
        aria-label="Increment value"
        onClick={() => dispatch(increment())}
      >
        Increment
      </button>
      <span>{count}</span>
      <button
        aria-label="Decrement value"
        onClick={() => dispatch(decrement())}
      >
        Decrement
      </button>
      <button
        aria-label="Decrement value"
        onClick={() => dispatch(asyncIncrement(2))}
      >
        asyncIncrement
      </button>
    </div>
  );
};

export default Mine;

```



## 使用Axios二次封装网络请求

1. 安装`yarn add axios`

2. 创建src/core/request.ts

```ts
import axios from 'axios';

// const { REACT_APP_ENV } = process.env;
const config: any = {
  // baseURL: 'http://127.0.0.1:8001',
  timeout: 30 * 1000,
  headers: {},
};

// 构建实例
const instance = axios.create(config);

// axios方法映射
const InstanceMaper = {
  get: instance.get,
  post: instance.post,
  delete: instance.delete,
  put: instance.put,
  patch: instance.patch,
};

const request = (
  url: string,
  opts: {
    method: 'get' | 'post' | 'delete' | 'put' | 'patch';
    [key: string]: any;
  }
) => {
  instance.interceptors.request.use(
    function (config) {
      // Do something before request is sent
      // 当某个接口需要权限时，携带token。如果没有token，重定向到/login
      if (opts.auth) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        config.headers.satoken = localStorage.getItem('satoken');
      }
      return config;
    },
    function (error) {
      // Do something with request error
      return Promise.reject(error);
    }
  );

  // Add a response interceptor
  instance.interceptors.response.use(
    function (response) {
      // Any status code that lie within the range of 2xx cause this function to trigger
      // Do something with response data
      console.log('response:', response);

      // http状态码
      if (response.status !== 200) {
        console.log('网络请求错误');
        return response;
      }

      // 后端返回的状态，表示请求成功
      if (response.data.success) {
        console.log(response.data.message);

        return response.data.data;
      }

      return response;
    },
    function (error) {
      // Any status codes that falls outside the range of 2xx cause this function to trigger
      // Do something with response error
      return Promise.reject(error);
    }
  );

  const method = opts.method;
  return InstanceMaper[method](url, opts.data);
};

export default request;

```

3. 配置webpack

在开发环境中，前端因为浏览器的同源限制，是不能跨域访问后端接口的。所以当我们以webpack作为开发环境的工具后，需要配置`devServer`的 proxy

```js

module.exports = {

  devServer: {
    proxy: {
      '/api': 'http://127.0.0.1:8001',
    },
  },
}
```

到这里，一个基础的前端开发环境就搭建完成了
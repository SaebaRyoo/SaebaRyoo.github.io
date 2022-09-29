---
title: React Hook
categories:
- 前端
tags: 
- React
- React Hook
---


## 自定义的hooks

**作用：** 将自定义hook内的内容平铺到组件内部

首先我们先写一个简单的useTimeout，该hook就是在指定时间后返回一个数据
```js
const useTimeout = wait => {
  const [data, setData] = useState(null);

  setTimeout(() => {
    setData('test')
  }, wait * 1000)

  return {data};
}

const App = () => {
  const {data} = useTimeout(1)
  return <span>{data}</span>
}
```

上面的代码等价于
```js
const App = () => {
  const [data, setData] = useState('')
  setTimeout(() => {
      setData('test')
  }, 1000)
  
  return <span>{test}</span>
}


```

再比如项目中有一些接口请求需要加上loading并根据这个loading加一些样式，例如tab, 分页，下拉框或者下拉刷新这类的请求。
但是这个逻辑其实都是一样的，都是变一下true和false。
那么通过对hook的认知，我们可以自定义一个useRequest

```jsx

// utils/hooks.js
export const useRequest = (fn, dependencies) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const request = () => {
    setLoading(true);
    fn()
    .then(setData)
    .finally(()=> {
      setLoading(false);
    })
  }

  useEffect(() => {
    request();
  }, dependencies)

  return {data, loading};
}


// App.js

import {useRequest} from './utils/hooks';
// 这个是请求库
import request from './utils/request';

// 该页面中有一个分页请求，组件用的是antd的Table
const App = () => {
  const [{ current, pageSize, total }, paginationChange] = useState<PaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const {data, loading} = useRequest(() => {
    // 当页面发生改变后就产生请求，并loading，然后返回数据以及loading的状态
    return request('GET', '/getData', {current, pageSize});
  }, [current, pageSize]);

  const handleOnChange = ({current, total, pageSize}) => {
    paginationChange({ current, total, pageSize });
  }
  return (
    <div>
      <Table
        loading={loading}
        columns={columns}
        dataSource={data}
        onChange={handleOnChange}
        pagination={{
          current: current,
          total: total,
          pageSize: pageSize
        }}
        rowKey="id"
      />
    </div>
  )
}

```

当然，我们也可以将一些鼠标事件封装在hook中，例如获取鼠标位置的操作
```js

// useMousePosition.js
const useMousePosition = () => {
  const [position, setPosition] = useState({x: 0, y: 0 })
  useEffect(() => {
    const updateMousePosition = (e) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }
    document.addEventListener('mousemove', updateMousePosition)
    return () => {
      document.removeEventListener('mousemove', updateMousePosition)
    }
  })
  return position
}

// App.js
import React from 'react'
import useMousePosition from './useMousePosition'

const App = () => {
  const {x, y} = useMousePosition()
  return (
    <div>
      <div>x: {x}</div>
      <div>y: {y}</div>
    </div>
  )
}
```


## useCallback

我们可以看一下useCallback的源码，下面有两个函数。
`mountCallback`是在初始化时调用，主要的作用就是记录callback和deps依赖项
`updateCallback`是当组件发生更新时调用的函数，它的作用就是会对比依赖，如果依赖未改变，则使用旧的callback，也就是 memoized 函数

```jsx

function mountCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  // 初始化时记录callback和deps
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

function updateCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  if (prevState !== null) {
    if (nextDeps !== null) {
      const prevDeps: Array<mixed> | null = prevState[1];
      // 组件发生更新时对比依赖，如果依赖未改变，则使用旧的callback
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        return prevState[0];
      }
    }
  }
  hook.memoizedState = [callback, nextDeps];
  return callback;
}
```

**那么它的作用是什么呢？**

返回一个 memoized 回调函数。且在callback中访问的state依赖于依赖项的更新，也就是如果想在callback中访问到新的state，则需要在依赖项中注明
如果依赖项没变，则会返回之前的callback，那么这个时候，这个旧的callback中访问的就是旧的state。
如果依赖项修改了，则会返回一个新的callback，并且访问已经更新后的state


## useMemo 


**作用：** 它可以针对耗时计算来缓存值，并根据依赖项是否更新决定是否再一次进行耗时计算

比如，组件内需要展示一个耗时计算的数据.
这时，可以通过useMemo来进行一个性能优化

```js
const computeExpensiveValue = (a, b) => {
  // do some expensive operations;
  return expensiveValue
}
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
```
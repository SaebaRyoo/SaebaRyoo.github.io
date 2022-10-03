---
title: React Hook
categories:
- 前端
tags:
- React
---

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
useCallback返回一个 memoized 回调函数。一般和`React.memo()`一起用于性能优化。

我们首先可以看下面这个没有使用`useCallback`的例子,即使使用了React.memo，且`DemoChildren`的依赖看上去并没有变化（每次都是传入getInfo方法）
但是无论是`input`还是`number`产生变化都会触发`DemoChildren`更新。这是因为无论哪一个，只要触发了更新，`App`这个函数组件都会被重新渲染。
然后`getInfo`这个函数的引用就会被重新分配，所以即使看上去`getInfo`没有变化，但是到了`React.memo`的默认`compair`中还是判断组件发生了变化，
进而导致子组件`DemoChildren`重新渲染。

```jsx
const DemoChildren = React.memo((props)=>{
    console.log('子组件更新')
    useEffect(()=>{
        props.getInfo('子组件')
    },[])
    return <div>子组件</div>
})

const App =()=>{
    const [number, setNumber] = useState(1)
    const [input, setInput] = useState('')
    const getInfo  = (tmp)=>{
        console.log(tmp)
    }
    return (
        <div>
            <input value={input} onChange={e => setInput(e.target.value)}/>
            <br/>
            <span>{number}</span><button onClick={ ()=>setNumber(number+1) } >增加</button>
            <DemoChildren getInfo={getInfo} />
        </div>
    )
}
```

然后我们在看这个例子，这个子组件`DemoChildren`只有两种情况下会产生更新
- 初始化
- 父组件的`number`state变化时

因为在父组件中对`getInfo`函数使用了`useCallback`进行函数缓存。所以子组件使用了React.memo后发现props并没有更新

```jsx
const DemoChildren = React.memo((props)=>{
    console.log('子组件更新')
    useEffect(()=>{
        props.getInfo('子组件')
    },[])
    return <div>子组件</div>
})

const App =()=>{
    const [number, setNumber] = useState(1)
    const [input, setInput] = useState('')
    const getInfo  = useCallback((tmp)=>{
        console.log(tmp)
    },[number])
    return (
        <div>
            <input value={input} onChange={e => setInput(e.target.value)}/>
            <br/>
            <span>{number}</span><button onClick={ ()=>setNumber(number+1) } >增加</button>
            <DemoChildren getInfo={getInfo} />
        </div>
    )
}

```

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




## Hooks解决了什么问题

### 1. 组件之间复用状态逻辑很难
React没有提供将一些将可复用性行为“附加”到组件的途径（例如，把组件连接到store）。常见的解决方案为 ”render prop“和”高阶组件“。但是它们需要**重新组织你的组件结构**，这会使你的代码变得非常难以理解和维护。我们可以在React DevTools中观察到，由 providers，consumers，高阶组件，render props 等其他抽象层组成的组件会形成“嵌套地狱”。
而Hooks则解决了：**为共享状态逻辑提供更好的原生途径**的问题。

举个例子，项目中有一些接口请求需要加上loading并根据这个loading加一些样式，例如tab, 分页，下拉框或者下拉刷新这类的请求。但是这个状态逻辑其实都是一样的。都是变true和false。那么，在使用了hooks之后，我们可以这么写一个hooks。
```jsx
// utils/hooks.js
const useLoading = (fn, deps) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(nul);

    const request = () => {
        setLoading(true);
        fn()
        .then(setData)
        .finally(() => {
            setLoading(false)
        })
    }

    useEffect(() => {
        request();
    }, deps)

    return { data, loading };
}

```


### 2. 复杂组件变得难以理解

期初，组件都很简单，但是逐渐被状态逻辑和副作用占据。每个生命周期常常包含一些不相关的逻辑。例如，组件常常componentDidMount和compoentDidUpdate中获取数据。但是，同一个componentDidMout中可能也包含很多其他的逻辑，如事件监听，而之后需要在componentWillUnMount中清除。相互关联且需要对照修改的代码被进行了拆分，而完全不相关的代码却在同一个方法中组合在一起。

且在多数情况下，由于一个状态逻辑在一个组件中无处不在，不可能将组件拆分成更小的粒度。虽然可以通过引入状态管理工具来结合使用。但是，这回增加额外的抽象概念。

而hooks可以将相互关联的部分拆分为更小的函数，而非强制按照生命周期划分。

如下，我们将一个鼠标移动事件封装在一个hooks中, 而useEffect hooks则可以代替`componentDidMount`、`compoentDidUpdate`和`componentWillUnMount`。使得逻辑更加的清晰
```jsx
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
  }, [])
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

那么，如果我们使用Class的话，需要使用render prop 获取children prop 才能解决以上这种横切问题（封装状态或行为共享给其他需要相同状态的组件）
```jsx
class MousePosition extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      x: 0,
      y: 0
    }
  }

  updateMousePosition = (e) => {
    this.setState({ x: e.clientX, y: e.clientY })
  }

  componentDidMount() {
    document.addEventListener('mousemove', this.updateMousePosition)
  }

  componentWillUnMount() {
    document.removeEventListener('mousemove', this.updateMousePosition)
  }

  render() {
    return this.props.render(this.state);
  }
}

const App = () => {
  return (
    <div>
      <MousePosition
        render={ (data) => {
          return [
            <div>x: {data.x}</div>,
            <div>y: {data.y}</div>
          ]
        }}
      />
    </div>
  )
}
```

或者HOC
```jsx
function withMousePosition(Component) {
  class Comp extends React.Component {
    render() {
      return (
        <MousePosition
          render={ data => (<Component {...this.props} data={data} />)}
        />
      )
    }
  }

  return Comp;
}

class MyApp extends React.Component {
  render () {
    const { data } = this.props;
    return (
      <div>
        <div>x: {data?.x}</div>
        <div>y: {data?.y}</div>
      </div>
    )
  }
}

const App = withMousePosition(MyApp)

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
```

### 3. 难以理解的Class
除了代码的复用和管理困难外，学习Class你还需要理解this的指向问题。现在，我们可以通过箭头函数来避免this的指向问题。

但是，我们需要知道，在不支持箭头函数之前，事件函数都需要通过bind这类方法来修正this的指向。否则，在调用一个事件处理函数时，this会指向window；


### 总结

1. hooks解决了class组件难以解决的状态或行为复用问题,可以创建涵盖各种场景的自定义 Hook，如表单处理、动画、订阅声明、计时器等
2. hooks可以有效避免在书写复杂组件时使用render prop或者高阶组件所带来的的让组件难以理解的问题。
3. 减少了多个生命周期的概念，学习和使用成本降低
4. 避免class中this的指向问题



## React Hooks 踩坑记录

### 只在最顶层使用Hook

React是通过Hook的调用顺序来确定state对应的`useState`。

所以，我们需要保证Hook的调用顺序在多次渲染之间保持一致。

**看一下官网的例子**

```jsx
// ------------
// 首次渲染
// ------------
useState('Mary')           // 1. 使用 'Mary' 初始化变量名为 name 的 state
useEffect(persistForm)     // 2. 添加 effect 以保存 form 操作
useState('Poppins')        // 3. 使用 'Poppins' 初始化变量名为 surname 的 state
useEffect(updateTitle)     // 4. 添加 effect 以更新标题

// -------------
// 二次渲染
// -------------
useState('Mary')           // 1. 读取变量名为 name 的 state（参数被忽略）
useEffect(persistForm)     // 2. 替换保存 form 的 effect
useState('Poppins')        // 3. 读取变量名为 surname 的 state（参数被忽略）
useEffect(updateTitle)     // 4. 替换更新标题的 effect

```

但如果我们将一个 Hook (例如 persistForm effect) 调用放到一个条件语句中,在第一次渲染中 name !== '' 这个条件值为 true，所以我们会执行这个 Hook。
但是在下一次渲染时我们可能清空了表单，表达式值变为 false。此时的渲染会跳过hook

```jsx

if (name !== '') {
  useEffect(function persistForm() {
    localStorage.setItem('formData', name);
  });
}

useState('Mary')           // 1. 读取变量名为 name 的 state（参数被忽略）
// useEffect(persistForm)  // 此 Hook 被忽略！
useState('Poppins')        // 2 （之前为 3）。读取变量名为 surname 的 state 失败
useEffect(updateTitle)     // 3 （之前为 4）。替换更新标题的 effect 失败
```

### hook的依赖项

在hook 中，`useEffect`、`useCallback`、`useMemo`等都提供第二个参数，它是一个依赖项数组（当我们不传时，每一次的状态更新都会被调用）。
当在第一个参数的回调函数中使用了props和state，就需要在依赖项中标明。不然，使用的都是初始值。

在useEffect等中，
- 当依赖项指定为 `[]` 数组时，则只会在首次更新时调用回调
- 当不指定依赖项时，则任意state更新都会触发回调
- 当指定依赖项时，则只在依赖项发生改变时执行回调

在useCallback、useMemo中，
- 当依赖项指定为 `[]` 数组时，都会执行，但是回调中的state都是初始值
- 当不指定依赖项时，则任意state更新都会触发回调
- 当指定依赖项时，则只在依赖项发生改变时执行回调

### useEffect和useLayoutEffect的区别
简单的说，就是调用时机不同，`useLayoutEffect`和原来`componentDidMount`、`componentDidUpdate`一致。
在react完成DOM更新后马上同步调用的代码，会阻塞页面渲染。而 `useEffect` 是会在整个页面渲染完才会调用的代码。

### 状态修改是异步的
```jsx
const MyComponent = () => {
  const [value, setValue] = useState(0);

  function handleClick() {
    setValue(1);
    console.log(value); // <- 0
  }

  return (
    <div>
      <span>value: {value} </span>
      <button onClick={handleClick}>点击</button>
    </div>
  );
}
```
useState 返回的修改函数是异步的，调用后并不会直接生效，因此立马读取 value 获取到的是旧值（0）
React 这样设计的目的是为了性能考虑，争取把所有状态改变后只重绘一次就能解决更新问题，而不是改一次重绘一次，也是很容易理解的。

### 在 timeout 中读不到其他状态的新值

```jsx
const MyComponent = () => {
  const [value, setValue] = useState(0);
  const [anotherValue, setAnotherValue] = useState(0);

  useEffect(() => {
    window.setTimeout(() => {
      console.log('setAnotherValue', value) // <- 0
      setAnotherValue(value);
    }, 1000);
    setValue(1);
  }, []);

  return (
    <span>Value：{value}, AnotherValue：{anotherValue}</span>
  );
}
```
因为在生成 timeout 闭包时，value 的值是 0。
虽然之后通过 setValue 修改了状态，但 React 内部已经指向了新的变量，而旧的变量仍被闭包引用，所以闭包拿到的依然是旧的初始值，也就是 0。

我们可以通过使用useRef
```jsx
const MyComponent = () => {
  const [value, setValue] = useState(0);
  const [anotherValue, setAnotherValue] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    window.setTimeout(() => {
      console.log('setAnotherValue', valueRef.current) // <- 0
      setAnotherValue(valueRef.current);
    }, 1000);
    setValue(1);
  }, []);

  return (
    <span>Value：{value}, AnotherValue：{anotherValue}</span>
  );
}
```


### 参考
https://zhuanlan.zhihu.com/p/87713171

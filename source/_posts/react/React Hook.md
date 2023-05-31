---
title: React Hook
categories:
- 前端
tags:
- React
---

## 类组件的不足（Hooks要解决的问题）
### 缺少逻辑复用机制

为了复用逻辑增加无实际渲染效果的组件（高阶组件、渲染属性），它们增加了组件层级显示十分臃肿，增加了调试的难度以及运行效率的降低


### 类组件经常会变得很复杂难以维护
- 将一组相干的业务逻辑拆分到了很多个生命周期函数中
- 在一个生命周期函数内存在多个不相干的业务逻辑

### 类成员方法不能保证this指向的正确性
- 通过bind修改this指向
- 箭头函数

## React Hooks 是用来干什么的

它的作用就是对函数型组件进行增强，让函数型组件可以存储状态，可以拥有处理副作用的能力。让开发者在不使用类组件的情况下，实现相同的功能

在React中，副作用指的是只要不是将数据变为视图的操作都视为副作用，如：
- 获取dom元素
- 发起ajax请求


## useState

- 接收唯一的参数即状态初始值，初始值可以为任意类型


## useReducer
- useReducer 和 redux 中 reducer 很像
- useState 内部就是靠 useReducer 来实现的
- useState 的替代方案，它接收一个形如 (state, action) => newState 的 reducer，并返回当前的 state 以及与其配套的 dispatch 方法
- 在某些场景下，useReducer 会比 useState 更适用，例如 state 逻辑较复杂且包含多个子值，或者下一个 state 依赖于之前的 state 等

```jsx
const initialState = 0;
function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return {number: state.number + 1};
    case 'decrement':
      return {number: state.number - 1};
    default:
      throw new Error();
  }
}
function init(initialState){
    return {number:initialState};
}
function Counter(){
    const [state, dispatch] = useReducer(reducer, initialState,init);
    return (
        <>
          Count: {state.number}
          <button onClick={() => dispatch({type: 'increment'})}>+</button>
          <button onClick={() => dispatch({type: 'decrement'})}>-</button>
        </>
    )
}
```


## useContext
用于跨组件传递状态，比如下面这个主题数据传输

```jsx

const themes = {
  light: {
    foreground: "#000000",
    background: "#eeeeee"
  },
  dark: {
    foreground: "#ffffff",
    background: "#222222"
  }
};

const ThemeContext = React.createContext(themes.light);

function App() {
  return (
    <ThemeContext.Provider value={themes.dark}>
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function Toolbar(props) {
  return (
    <div>
      <ThemedButton />
    </div>
  );
}

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return (
    <button style={{ background: theme.background, color: theme.foreground }}>
      I am styled by theme context!
    </button>
  );
}

```

## useEffect()

### 执行时机
- useEffect( () => {})
    - 只传入一个回调函数，那么这个钩子会在组件每次挂载时，和更新时被调用。相当于componentDidMount 和 componentDidUpdate
- useEffect(() => {}, [])
  - 传入一个函数和空数组,只会在挂载时被调用，相当于componentDidMount
  - 第二个参数可以用于监控当前组件的状态和传入的props中的状态，确保回调在特定的数据变化时才触发更新
- useEffect(() =>  () => {}])
  - 传入一个回调函数，在回调中返回一个函数，这个被返回的函数会在组件销毁前调用,相当于componentDidUnMount

## useRef
### 获取dom元素对象
```jsx
const App = () => {
  const username = useRef();

  const handler = () => {console.log(username)};

  return <input ref={username} onChange={handler} />
}
```

### 保存数据（跨组件周期）

即使组件重新渲染，保存的数据任然还在。保存的数据被更改不会触发组件重新渲染。

通常用`useRef`保存程序在运行当中的一些辅助数据

比如，我们要设置一个定时累加的任务，并且需要一个停止的方法。
但是将timerId定义在组件中时，每隔1秒，count都会更新一次，组件也会重新渲染，timerId就会被重新赋值一次：
```jsx
const App = () => {
  const [count, setCount] = useState(0);
  let timerId = null;
  useEffect(() => {
    timerId = setInterval(() => {
      setCount(count + 1)
    }, 1000)
  })

  const stopCount = () => {
    clearInterval()
  }

  return (
    <div>
      {count}
      <button onClick={stopCount}>停止</button>
    </div>
  )
}
```

这个时候我们就需要用到useRef来保存这个数据,组件重新渲染后，数据也不会消失

```jsx

const App = () => {
  const [count, setCount] = useState(0);
  let timerId = useRef();
  useEffect(() => {
    timerId.current = setInterval(() => {
      setCount(count + 1)
    }, 1000)
  })

  const stopCount = () => {
    clearInterval(timerId.current)
  }

  return (
    <div>
      {count}
      <button onClick={stopCount}>停止</button>
    </div>
  )
}
```


### 失控的Ref
对于`Ref`，什么叫失控？

首先是不失控的情况：
- 执行`ref.current`的`focus`,`blur`等方法
- 执行`ref.current.scrollIntoView`使`element`滚动到视野内
- 执行`ref.current.getBoundingClientRect`测量DOM尺寸

这些情况，虽然操作了`DOM`，但涉及的都是React控制范围外的因素，所以不算失控

但是下面的情况：
- 执行`ref.current.remove`移除DOM
- 执行`ref.current.appendChild`插入子节点

同样是操作DOM，但是这些原本应该在React控制范围内的操作，通过`ref`执行就属于失控的情况

### 限制失控
所以在react中，函数组件可以访问自己的`宿主元素`的DOM节点，但父函数组件是无法直接通过`ref`来访问到子函数组件内的宿主元素的DOM。这样就将`ref失控`的范围控制在了单个组件内，不会出现跨层级的失控
比如以下代码，点击了就会报错:
```jsx
function MyInput(props) {
  return <input {...props} />;
}

function Form() {
  const inputRef = useRef(null);

  function handleClick() {
    inputRef.current.focus();
  }

  return (
    <>
      <MyInput ref={inputRef} />
      <button onClick={handleClick}>
        input聚焦
      </button>
    </>
  );
}
```

### 使用forwardRef取消限制
但是在某些场景下，比如组件库开发，就需要通过`forwardRef`将`ref`暴露给使用者。
当然，这种是将整个DOM通过ref传递给了使用者，需要使用者自己来承担误用的风险
```jsx
const MyInput = forwardRef((props, ref) => {
  return <input {...props} ref={ref} />;
});

function Form() {
  const inputRef = useRef(null);

  function handleClick() {
    inputRef.current.focus();
  }

  return (
    <>
      <MyInput ref={inputRef} />
      <button onClick={handleClick}>
        Focus the input
      </button>
    </>
  );
}
```

### useImperativeHandle限制ref中的方法

比如，还是用上面的`MyInput`组件举例，这个组件，我们在封装是只能暴露给用户`focus`方法，需要屏蔽其他增删改的方法。那么就可以使用`useImerativeHandle`修改`MyInput`
```jsx

const MyInput = forwardRef((props, ref) => {
  const realInput = useRef(null);
  useImerativeHandle(ref, () => ({
    focus() {
      realInputRef.current.focus()
    }
  }))
  return <input {...props} ref={ref} />;
});

```

现在，`Form`组件中通过`inputRef.current`只能取到如下结构:
```jsx
{
  focus() {
    realInputRef.current.focus();
  },
}
```

**这样就杜绝了开发者通过ref取到DOM后，执行不该被使用的API，出现ref失控的情况。**

### 使用useImperativeHandle回传子组件内定义的方法
在一些情况下，父组件不光需要获取子组件的DOM,可能还需要获取子组件内的方法。那我们也可以通过`useImperativeHandle`来将方法绑定到ref上，然后再传给父组件
```tsx
type ChildRef = {
  getBoundingClientRect: () => DOMRect | undefined;
  handleClick: () => void;
};
const Father: React.FC = () => {
  const childRef = useRef<ChildRef>(null);

  useEffect(() => {
    console.log(childRef.current?.getBoundingClientRect());
  }, []);

  const handleClick = () => {
    childRef.current?.handleClick();
  };
  return (
    <div>
      <h1>father page</h1>
      <button onClick={handleClick}>父组件添加</button>
      <Child ref={childRef} />
    </div>
  );
};

export default Father;

const Child = React.forwardRef((props, ref: Ref<ChildRef>) => {
  // 子组件内重新定义ref获取子组件的dom
  const divRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const handleClick = () => {
    setCount((prev) => prev + 1);
  };

  useImperativeHandle(ref, () => {
    return {
      // 获取子组件DOM的getBoundingClientRect 方法
      getBoundingClientRect: () => {
        return divRef.current?.getBoundingClientRect();
      },
      // 获取子组件自定义的 handleClick 方法
      handleClick: () => handleClick(),
    };
  });

  return (
    <div ref={divRef}>
      {count}
      <button onClick={handleClick}>添加</button>
    </div>
  );
});

```


## useCallback

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

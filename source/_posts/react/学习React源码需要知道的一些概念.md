---
title: React 源码学习(二)
categories:
- 前端
tags: 
- React
- React源码学习
---

# [文章出处](https://react.iamkasong.com/preparation/idea.html#%E7%90%86%E8%A7%A3-%E9%80%9F%E5%BA%A6%E5%BF%AB)

## 理念
来自官网
> 我们认为，React 是用 JavaScript 构建快速响应的大型 Web 应用程序的首选方式。它在 Facebook 和 Instagram 上表现优秀。


对于框架来说，快速响应的性能是每个框架的特点。

那么如何理解**快速响应**。可以从以下两个角度看：

相比较Vue、angular使用模板语言的React，它采用的是原生js的写法，在开发UI界面时增加了更多的灵活性,但是高灵活性意味着高不确定性。

比如用Vue语句
```js
  <template>
      <ul>
          <li>0</li>
          <li>{{ name }}</li>
          <li>2</li>
          <li>3</li>
      </ul>
  </template>
```

当编译时，由于模版语法的约束，Vue可以明确知道在li中，只有name是变量，这可以提供一些优化线索。

而在React中，以上代码可以写成如下JSX：

```jsx
function App({name}) {
    const children = [];
    for (let i = 0; i < 4; i++) {
        children.push(<li>{i === 1 ? name : i}</li>)
    }
    return <ul>{children}</ul>
}
```

由于语法的灵活，在编译时无法区分可能变化的部分。所以在运行时，React需要遍历每个li，判断其数据是否更新。

基于以上原因，相比于Vue、Angular，缺少编译时优化手段的React为了速度快需要在运行时做出更多努力。

比如

- 使用PureComponent或React.memo构建组件
- 使用shouldComponentUpdate生命周期钩子
- 渲染列表时使用key
- 使用useCallback和useMemo缓存函数和变量

由开发者来显式的告诉React哪些组件不需要重复计算、可以复用。


### 老的React架构

Reconciler -> Renderer

- Reconciler（协调器）—— 负责找出变化的组件
- Renderer（渲染器）—— 负责将变化的组件渲染到页面上

### 新的React架构

Scheduler -> Reconciler -> Renderer

- Scheduler（调度器）—— 调度任务的优先级，高优任务优先进入Reconciler
- Reconciler（协调器）—— 负责找出变化的组件
- Renderer（渲染器）—— 负责将变化的组件渲染到页面上

### 代数效应与Generator
> 代数效应是函数式编程中的一个概念，用于将副作用从函数调用中分离。

从React15到React16,reconciler重构的一大目标就是：将老的`同步更新`的架构编程`异步可中断更新`;

`异步可中断更新`可以理解为：`更新`在执行过程中可能被打断（浏览器时间分片用尽或有更高优任务插队），当可以继续执行时恢复之前执行的中间状态。

这就是`代数效应`的提现


### Fiber架构

在React15及以前，Reconciler采用递归的方式创建虚拟DOM，递归过程是不能中断的。如果组件树的层级很深，递归会占用线程很多时间，造成卡顿。

为了解决这个问题，React16将递归的无法中断的更新重构为异步的可中断更新，由于曾经用于递归的虚拟DOM数据结构已经无法满足需要。于是，全新的Fiber架构应运而生。

**Fiber结构**

1. 作为架构
```js
// 指向父级Fiber节点
this.return = null;
// 指向子Fiber节点
this.child = null;
// 指向右边第一个兄弟Fiber节点
this.sibling = null;
```

组件结构
```jsx
const App = () => {
  return (
    <div>
      hello
      <h1>world</h1>
    </div>
  )
}
```
对应Fiber树
<div align="center">
   <img src="http://rj2tm9fta.hn-bkt.clouddn.com/fiber.png" width = "300" alt="" align=center />
</div>

2. 作为静态的数据结构
```js
// Fiber对应组件的类型 Function/Class/Host...
this.tag = tag;
// key属性
this.key = key;
// 大部分情况同type，某些情况不同，比如FunctionComponent使用React.memo包裹
this.elementType = null;
// 对于 FunctionComponent，指函数本身，对于ClassComponent，指class，对于HostComponent，指DOM节点tagName
this.type = null;
// Fiber对应的真实DOM节点
this.stateNode = null;
```

3. 作为动态的工作单元
```js
// 保存本次更新造成的状态改变相关信息
this.pendingProps = pendingProps;
this.memoizedProps = null;
this.updateQueue = null;
this.memoizedState = null;
this.dependencies = null;

this.mode = mode;

// 保存本次更新会造成的DOM操作
this.effectTag = NoEffect;
this.nextEffect = null;

this.firstEffect = null;
this.lastEffect = null;
```

一下两个字段保存调度优先级
```js
// 调度优先级相关
this.lanes = NoLanes;
this.childLanes = NoLanes;
```

### 双缓存
react采用的**双缓存**技术。react中同时最多可以存在两颗`Fiber树`。当前屏幕展示的为`current fiber`。正在内存中构建的为`workInProgress fiber树`。

它们通过`alternate`属性相连。
```js
currentFiber.alternate = workInProgress;
workInProgress.altername = currentFiber;
```
react应用的根节点(`fiberRootNode`)通过`current`指针在不同的fiber树的`rootFiber`之间切换来实现`Fiber树`的切换。

### 源码术语
- Reconciler工作的阶段被称为render阶段。因为在该阶段会调用组件的render方法。
- Renderer工作的阶段被称为commit阶段。就像你完成一个需求的编码后执行git commit提交代码。commit阶段会把render阶段提交的信息渲染在页面上。
- render与commit阶段统称为work，即React在工作中。相对应的，如果任务正在Scheduler内调度，就不属于work。


## 虚拟DOM
我们在使用开发时会写到如下的代码,这就是虚拟DOM。
```jsx
  <div className="wrap">
    hello world
  </div>
```
它叫jsx。那么为什么使用jsx呢，因为React认为渲染逻辑本质上与其他UI逻辑内在耦合，比如，在UI中绑定事件或者某些时刻状态发生变化时需要通知到UI，以及需要在UI中展示准备好的数据。而jsx和UI放在一起时，会在视觉上有辅助作用。

上面的jsx会通过babel转译为`React.createElement()`方法
```js
const element = React.createElement(
  'div',
  {className: 'wrap'},
  'hello world'
)
```
而createElement方法实际上是创建了一个对象，而这个对象，也就是我们说的虚拟DOM(简化版本)
```js
const element = {
  type: 'div',
  props: {
    className: 'wrap',
    children: 'hello world'
  }
}
```

## react的Diff算法
在react中，会将组建生成一个如上的虚拟DOM树。但是，即使是最前沿的算法中，将一颗树转化为另一颗树的复杂度也是O(n3), n 表示树中元素的数量。

这个算法太过昂贵，如果需要展示1000个元素，那么需要处理的计算量则是1000³，也就是10亿级别的。于是react通过两个假设的基础上，将复杂度降低到了O(n);

1. 两个不同类型的元素会产生不同的树；
2. 通过`key` props来告知react哪些子元素在不同的渲染下保持稳定；

#### 对比不同类型的元素
比如，当一个div元素，变成了一个span元素，那么react会卸载div元素以及它的所有子元素，即使子元素并没有发生更改
```jsx
<div>
  <Son />
</div>

<span>
  <Son />
</span>
```

#### 对比同类型的元素

react保留DOM节点，只对比并更新更改了的属性

```jsx
<div className="a" title="test"/>
<div className="b" title="test"/>
```
对比以上的两个元素，React只会修改DOM元素的class属性

```jsx
<div style={{color: 'red', width: 100}}/>
<div style={{color: 'green', width: 100}}/>
```
对比以上的style样式，只会更新DOM的color,而不会更新width

#### key
假设有如下list
```jsx
<ul>
  <li>a</li>
  <li>b</li>
</ul>


<ul>
  <li>a</li>
  <li>b</li>
  <li>c</li>
</ul>
```
现在需要向list中插入`<li>c</li>`。那么，在list的末尾插入开销是最小的，如果是插入到开头。React则不知道需要保留下面为更改的，那么就需要重新构建每一个元素。

为了解决这种问题，React新增了`key` props，当子元素拥有key时.React使用key来匹配原有树上的子元素以及最新树上的子元素，如下：加了key之后，React则会知道只有c是需要新增加的子元素

```jsx
<ul>
  <li key='a'>a</li>
  <li key='b'>b</li>
</ul>


<ul>
  <li key='a'>a</li>
  <li key='b'>b</li>
  <li key='c'>c</li>
</ul>
```

当子元素的位置不发生改变时，也可以使用数组的索引来作为key。如果有顺序修改，diff 就会变得慢。

当基于下标的组件进行重新排序时，组件 state 可能会遇到一些问题。由于组件实例是基于它们的 key 来决定是否更新以及复用，如果 key 是一个下标，那么修改顺序时会修改当前的 key，导致非受控组件的 state（比如输入框）可能相互篡改导致无法预期的变动。

在 Codepen 有两个例子，分别为 [展示使用下标作为 key 时导致的问题](https://codepen.io/pen?editors=0010)，以及[不使用下标作为 key 的例子的版本，修复了重新排列，排序，以及在列表头插入的问题](https://codepen.io/pen?&editable=true&editors=0010) 。


### vue和react对比

1. 性能上
react中，当某个组件的状态发生变化时，它会以该组件为根，重新渲染整个组件子树。如要避免不必要的子组件的重渲染，你需要在所有可能的地方使用 PureComponent，或是手动实现 shouldComponentUpdate 对比条件。同时你可能会需要使用不可变的数据结构来使得你的组件更容易被优化，这也就是react中的**运行时优化**，这样的话，优化的负担会落到开发身上。

而vue对比react有一个很大的优势，就是**编译时优化**。因为在vue应用中，组件的依赖是在渲染过程中自动追踪的，所以系统能精确知晓哪个组件确实需要被重渲染。并不会存在react中的子树问题。这个特点使得开发者不再需要考虑此类优化，从而能够更好地专注于应用本身。


2. 成本
react由于是函数式的编程思想，所以非常的灵活，写法很多遍，对使用js的掌握要求比较高。还需要掌握react生态中的redux等全家桶。而redux的概念也比较的多。比如action、reducer、store。想要入手react，需要掌握的知识和概念比较多。

vue 则采用模板语法，声明式的将数据渲染进DOM，有一定的约束，且官方维护一套方案，相对简单。

3. 适用场景
react适合中大型的后台管理系统。因为一般的中后台项目，场景和业务逻辑都相对复杂，而复杂就意味着定制化。这一点，react函数式编程思想的灵活性就体现了出来。可以较好的适应复杂的业务场景(all in js)。并且由于RN的存在，跨平台的方案也有了。

vue 由于是模板语法，在处理视图方面没有react那么灵活。个人认为适合一些业务场景不是特别复杂的中小型项目或者是toC的。
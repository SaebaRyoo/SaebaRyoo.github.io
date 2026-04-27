---
title: Zustand原理
date: 2026-03-23
categories:
  - 前端
tags:
  - React
  - 状态管理
---


Zustand 是一个轻量级的状态管理库，它利用 **外部存储 + 发布订阅 + React Hooks** 实现了简单而强大的状态管理。它的核心理念是：​**将状态从 React 组件中抽离到独立 store，通过细粒度订阅避免不必要的渲染**​。

下面从设计思想、核心实现原理、与 React 的结合方式以及关键特性来解析 Zustand 的原理。

---

## 一、设计思想

Zustand（德语“状态”之意）强调极简、直接。它不像 Redux 那样要求严格的 action 和 reducer 模式，而是允许直接修改状态（通过 `set` 函数），同时依然保持可预测性和性能。其核心特点：

* ​**单一 store 或按需创建多个 store**​：没有强制单一数据源，但通常推荐将相关状态放在一个 store 中。
* ​**直接修改状态**​：通过 `set(state => newState)` 更新，既支持对象合并，也支持函数式更新。
* ​**无 action 类型、无 reducer**​：减少样板代码，开发者只需定义状态和修改方法。
* ​**自动处理组件订阅**​：组件只订阅它实际使用的状态片段，未使用的状态变化不会触发重渲染。

---

## 二、核心实现原理

### 1. Store 创建：闭包 + 发布订阅

Zustand 的 `create` 函数会创建一个独立于 React 组件树的 store。store 内部使用**闭包**保存状态，并维护一个​**订阅者列表**​。

简化版实现如下：

```javascript
const createStore = (createState) => {
  let state;
  const listeners = new Set();

  const setState = (partial) => {
    const nextState = typeof partial === 'function' ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      state = Object.assign({}, state, nextState);
      listeners.forEach(listener => listener());
    }
  };

  const getState = () => state;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  state = createState(setState, getState);

  return { setState, getState, subscribe };
};
```

* **`setState`**：更新状态，并通知所有订阅者。
* **`getState`**：获取当前状态。
* **`subscribe`**：添加监听器，返回取消订阅函数。

### 2. 与 React 的集成：`useStore` Hook

Zustand 提供了 React Hook 来连接 store。核心是 `useStore`，它使用 `useSyncExternalStore`（或早期版本的 `useReducer` + `useEffect`）来订阅 store 的变化。



```javascript
import { useSyncExternalStore } from 'react';

function useStore(store, selector) {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
```

* `useSyncExternalStore` 是 React 18 提供的官方 API，用于订阅外部数据源。
* 每次 store 更新时，`useSyncExternalStore` 会调用 `selector` 获取最新值，并通过浅比较决定是否触发组件重新渲染。
* 如果不传入 `selector`，则返回整个状态。

### 3. 细粒度订阅与选择器

Zustand 的智能之处在于​**自动跟踪组件实际使用的状态片段**​。当组件通过选择器（selector）获取状态时，只有选择器返回值发生变化，组件才会重新渲染。

例如：

```javascript
const bears = useStore(state => state.bears);
```

组件只依赖 `bears`，当 store 中其他字段变化时，组件不会更新。这是通过 `useSyncExternalStore` 的 `getSnapshot` 结合选择器实现的：每次 store 更新时，重新调用 `selector(getState())`，并与上次快照进行​**严格相等比较**​（`Object.is`）。

### 4. 不可变更新与 Immer 支持

Zustand 默认使用浅合并进行状态更新。开发者可以在 `set` 中返回新对象，也可以直接修改状态（配合 Immer 中间件）。例如：

```javascript
import { produce } from 'immer';

const useStore = create((set) => ({
  bears: 0,
  increase: () => set(produce(state => { state.bears += 1; }))
}));
```

Immer 中间件内部包装了 `set`，允许在回调中直接修改草稿状态，并自动生成不可变更新。

---

## 三、中间件机制

Zustand 提供中间件来增强功能（如持久化、Redux DevTools 支持）。其中间件模式是​**高阶函数**​，接收 `create` 参数并返回增强后的 `create`。

```javascript
const middleware = (config) => (set, get, api) => {
  // 包装 set、get 等
  return config(wrappedSet, get, api);
};
```

例如 `persist` 中间件会拦截 `set`，将状态同步到 localStorage，并在初始化时读取存储的值。

中间件的组合使用 `compose` 或链式调用，如：

```javascript
const useStore = create(persist(devtools(myStore)));
```

---

## 四、关键特性原理

### 1. 无需 Provider

Zustand 不需要像 Redux 那样包裹 `<Provider>`，因为 store 是独立于组件树的外部对象，任何组件都可以直接调用 `useStore` 导入同一个 store 实例。

### 2. 异步支持

在 action 中可以直接使用异步函数，更新状态只需调用 `set`：
```javascript
fetchBears: async () => {
  set({ loading: true });
  const data = await api.fetch();
  set({ bears: data, loading: false });
}
```

### 3. 多 Store 共享

可以创建多个独立的 store，通过不同的 `useStore` 引用。它们之间互不干扰，但也可以在一个 store 中导入另一个 store 的 `getState` 来读取其他 store 的值。

### 4. 与 Redux DevTools 集成

通过 `devtools` 中间件，Zustand 会将 action（即修改状态的方法名）发送到 Redux DevTools，实现时间旅行调试。

---

## 五、与 Redux 的对比

| 特性          | Redux                                           | Zustand                                   |
| --------------- | ------------------------------------------------- | ------------------------------------------- |
| 核心原则      | 单向数据流、reducer 纯函数、action 描述变化     | 外部 store + set 函数直接修改             |
| 样板代码      | 较多（action types、action creators、reducers） | 极少，只需定义 store 和修改方法           |
| 与 React 集成 | React-Redux（Provider、connect、hooks）         | 直接使用`useStore`hook，无需 Provider |
| 性能优化      | 需手动编写选择器或使用 Reselect                 | 自动依赖收集，选择器默认浅比较            |
| 中间件生态    | 丰富（thunk、saga、observable）                 | 轻量级中间件，但可扩展                    |
| 体积          | 较大（\~15KB gzipped）                          | 极小（\~3KB gzipped）                     |
| 适用场景      | 大型复杂应用，强规范团队                        | 中小型应用，追求简洁与快速开发            |

---

## 六、总结

Zustand 的原理可以概括为：

1. ​**外部存储**​：通过闭包创建独立于 React 的 store，保存状态和订阅者列表。
2. ​**发布订阅**​：`setState` 更新状态后通知所有订阅者。
3. ​**React 集成**​：利用 `useSyncExternalStore` 实现细粒度订阅，通过选择器自动进行浅比较，避免无关渲染。
4. ​**灵活更新**​：支持对象合并、函数式更新、Immer 不可变更新，无需繁琐的 action 类型。
5. ​**中间件扩展**​：通过高阶函数增强 store，提供持久化、DevTools 等能力。

Zustand 的设计哲学是“保持简单”，它用极小的 API 覆盖了绝大部分状态管理需求，同时保证了高性能和良好的开发体验。对于希望摆脱 Redux 复杂度的开发者来说，Zustand 是一个极其优秀的替代方案。

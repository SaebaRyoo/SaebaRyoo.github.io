---
title: MobX 原理与实战指南
date: 2022-10-01
categories:
  - 前端
tags:
  - React
  - 状态管理
---

# MobX 原理与实战指南

MobX 是一个经过实战检验的、透明的响应式状态管理库。它的核心思想是：​**所有源自状态的东西，都会自动地、高效地获得更新**​。

本文档将结合原理与代码，帮你彻底理解 MobX。

## 1. 核心原理概览

MobX 的工作流程可以总结为三步：

1. **定义可观察状态（Observable State）**
   将应用的数据变为“可观察”的，以便追踪其变化。
2. **建立派生（Derivations）**
   * ​**计算值（Computed）**​：根据状态自动计算的值，会缓存结果。
   * ​**反应（Reaction）**​：状态变化时自动执行的副作用，例如更新 UI。
3. **通过动作（Action）修改状态**
   所有对状态的修改都应当通过动作完成，这能保证数据变更的统一与可预测。

```
graph LR
    A[Actions] -->|修改| B[Observable State]
    B -->|自动追踪并更新| C[Derivations]
    C --> D[Side Effects / UI]
    B -->|也支持| E[Computed Values]
```

## 2. 三大核心概念

| 概念                 | 作用                                                    | 代码表示                                                   |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| **State**      | 可观察的数据，是应用的唯一事实来源。                    | `makeObservable` / `makeAutoObservable`            |
| **Derivation** | 依赖状态自动计算的值（Computed）或副作用（Reactions）。 | `get computed()` / `autorun` / `observer` 组件 |
| **Action**     | 修改状态的唯一方式，保证所有变更可追踪、原子化。        | 普通方法加上 `action` 标记                             |

## 3. 工作机制：依赖追踪与精确更新

MobX 内部维护一张隐式的依赖关系图。当你在 reaction 或 computed 中“读取”某个 observable 属性时，MobX 会自动记录它们之间的依赖。之后当该属性被修改时，MobX 会精确地通知所有依赖于它的地方重新计算。

**技术实现**

* 底层使用 `Proxy`（或旧版中的 `Object.defineProperty`）拦截属性读写。
* 每个可观察数据内部有一个 `observers` 集合，存放所有依赖于它的 reaction 或 computed。

## 4. 代码示例：从基础到进阶

### 4.1 基础示例：Store 定义与自动响应

javascript

```
import { makeAutoObservable, autorun } from 'mobx';

class TodoStore {
    todos = [];
    filter = 'all';

    constructor() {
        makeAutoObservable(this);  // 一键将属性变成 observable，方法变成 action，getter 变成 computed
    }

    get filteredTodos() {
        console.log('计算 filteredTodos...');
        switch (this.filter) {
            case 'completed': return this.todos.filter(t => t.done);
            case 'active':    return this.todos.filter(t => !t.done);
            default:          return this.todos;
        }
    }

    addTodo(title) {
        this.todos.push({ title, done: false });
    }

    toggleTodo(index) {
        this.todos[index].done = !this.todos[index].done;
    }

    setFilter(filter) {
        this.filter = filter;
    }
}

const store = new TodoStore();

// 建立一个 reaction：当依赖的状态发生变化时，自动执行
autorun(() => {
    console.log('当前过滤后的待办列表', store.filteredTodos);
});

// 通过 action 修改状态 —— 可以看到控制台自动打印新的列表
store.addTodo('学习 MobX 原理');
store.addTodo('写一篇技术文章');
store.toggleTodo(0);
store.setFilter('completed');
```

​**效果**​：每次修改状态后，`autorun` 都会重新执行，内部的 `filteredTodos` 会重新计算，并打印新的结果。你不需要手动调用任何更新方法。

### 4.2 底层依赖追踪模拟（伪代码）

为了方便理解，MobX 内部每个可观察字段类似于下面的简化模型：

javascript

```
let activeReaction = null; // 全局记录当前正在执行的 reaction

class ObservableField {
    constructor(value) {
        this._value = value;
        this.observers = new Set();
    }
    get() {
        if (activeReaction) this.observers.add(activeReaction);
        return this._value;
    }
    set(newValue) {
        this._value = newValue;
        for (let obs of this.observers) obs.schedule();
    }
}
```

当你使用 `makeAutoObservable` 时，MobX 实际上就是把普通属性替换为类似的响应式字段。

### 4.3 在 React 中使用（`observer`）

jsx

```
import React from 'react';
import { observer } from 'mobx-react-lite';
import { makeAutoObservable } from 'mobx';

class CounterStore {
    count = 0;
    constructor() {
        makeAutoObservable(this);
    }
    increment() {
        this.count++;
    }
}

const store = new CounterStore();

const Counter = observer(() => {   // observer 将组件变为 reaction
    console.log('组件渲染');
    return (
        <div>
            <span>{store.count}</span>
            <button onClick={() => store.increment()}>+1</button>
        </div>
    );
});
```

* 组件内的 `store.count` 被读取时，MobX 自动建立依赖。
* 点击按钮调用 `increment`（action）修改 `count` 后，MobX 精确地只重新渲染这个组件。

### 4.4 正确使用 `computed` 的好处

❌ ​**错误做法**​：在 reaction 中手动计算派生值

javascript

```
autorun(() => {
    let filtered = store.todos.filter(/* ... */);
    console.log(filtered);
});
```

问题：每次任何依赖变化（即使不直接影响过滤结果）都会重新执行过滤逻辑，且结果无法被多个消费者复用。

✅ ​**正确做法**​：使用 `computed`

javascript

```
class Store {
    get filteredTodos() { /* ... */ }   // computed
}
// 然后在 reaction 中只读取 filteredTodos，MobX 会自动缓存并精确更新。
```

### 4.5 异步 Action 处理

javascript

```
class UserStore {
    user = null;
    constructor() {
        makeAutoObservable(this);
    }

    async fetchUser(id) {
        const response = await fetch(`/api/user/${id}`);
        const data = await response.json();
        this.user = data;   // 注意：虽然 await 后面，但仍然是 action（MobX 会流式处理）
    }
}
```

在严格模式下，MobX 允许异步 action 中的修改，只要最外层的函数被标记为 `action` 即可。也可以用 `flow` 获得更好的类型推断和错误处理。

## 5. 最佳实践与常见误区

* **黄金法则：能用 computed 的地方绝不用 reaction**
  计算值会缓存结果、自动派生、避免冗余计算。
* **严格模式下必须通过 action 修改状态**
  使用 `configure({ enforceActions: "observed" })` 可以让代码更健壮。
* **依赖追踪只发生在属性读取时**
  注意不要解构 observable：`const { count } = store` 会切断依赖，应该直接使用 `store.count`。
* **在 React 中始终用 ​`observer` ​包裹组件**
  即使组件只读取一个属性，也要包裹，否则数据变化时不会重绘。
* **理解原子更新**
  MobX 在一个 action 结束之前，不会触发任何 reaction。这保证了中间状态不会被观察到，提升性能。

## 6. 总结

MobX 通过“可观察数据 + 自动依赖追踪 + 精确更新”的模式，让状态管理变得自然而高效。你只需：

1. 用 `makeAutoObservable` 定义状态和动作。
2. 用 `computed` 定义派生值。
3. 在 React 中用 `observer` 包装组件。
4. 通过 action 修改状态。

剩下的变化传播、缓存、更新时机全部交给 MobX 自动处理。这套机制既保留了面向对象的直观性，又拥有极佳的性能，非常适合中大型应用。

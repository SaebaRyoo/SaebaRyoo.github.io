---
title: React18中的useTransition和useDeferredValue
categories:
- 前端
tags:
- React
---

React18 引入了一个关键概念 `并发性（Concurrency）`。 并发则涉及到多个`更新操作`的同时执行，这可以说是React18中最重要的功能。
除了并发，React18 新增了两个hook ，也就是`useTransition`和`useDeferredValue`。它们的作用都是降低`更新操作`的优先级，但问题是，何时应该使用它们？


## 并发(Concurrent)
在实现"并发"之前，渲染是同步的(**所谓的同步，就是指如果react的某个组件执行时间长，它无法中断，会一致执行，直到组件完成渲染到DOM。在这个过程中，由于Javascript是单线程的，因此渲染任务会占满JavaScript线程，阻塞浏览器的主线程，从而导致用户无法进行交互操作**)。

然而，有了并发渲染（**并发指的就是通过time slice将任务拆分为多个，然后react根据优先级来完成调度策略，将低优先级的任务先挂起，将高优先级的任务分配到浏览器主线程的一帧的空闲时间中去执行，如果浏览器在当前一帧中还有剩余的空闲时间，那么React就会利用空闲时间来执行剩下的低优先级的任务**），react的渲染和更新可以被中断和恢复。那么如果在执行某个组件更新过程中又有了新的更新请求到达。比如我们下面的`input输入事件`，那么React就会创建一个`新的更新版本`。这种情况下，在某个时间段内可能会同时存在多个`更新版本`。

为了优化上述问题，React 18 提供了新的 Hook 函数 `useTransition`，它可以将`多个版本的更新`打包到一起，在未来的某一帧空闲时间内执行，从而优化应用的性能和响应时间。而`useDeferredValue` 的作用是将某个值的更新推迟到未来的某个时间片内执行，从而避免不必要的重复渲染和性能开销。

## 没有使用任何优化手段，同步更新
假设我们有一个包含从0到19,999数字的数组。这些数字在用户界面上显示为一个列表。该用户界面还有一个文本框，允许我们过滤这些数字。例如，我可以通过在文本框中输入数字99来过滤掉以99开头的数字。

```jsx
import { useState, useTransition } from "react";

const numbers = [...new Array(20000).keys()];

export default function App() {
    const [query, setQuery] = useState("");

    const handleChange = (e) => {
        setQuery(e.target.value);
    };

    return (
        <div>
            <input type="number" onChange={handleChange}/>
            <div>
                {
                    numbers.map((i, index) => (
                        query
                            ? i.toString().startsWith(query)
                            && <p key={index}>{i}</p>
                            : <p key={index}>{i}</p>
                    ))
                }
            </div>
        </div>
    );
}
```


由于数组中有20,000个元素，过滤将是一个有点耗时的过程。当我们试图在文本框中输入一个数字时，我们可以观察到这一点。输入的数值出现在文本框中会有一个滞后，因为每一个按键之后的渲染都会花费一些时间。


## useTransition

接下来我们使用`useTransition`来修改一下上面的代码

```jsx
function App() {
    const [query, setQuery] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleChange = (e) => {
        startTransition(() => {
            setQuery(e.target.value);
        });
    };

    const list = useMemo(() => (
        numbers.map((i, index) => (
            query
                ? i.toString().startsWith(query)
                && <p key={index}>{i}</p>
                : <p key={index}>{i}</p>
        ))
    ), [query]);

    return (
        <div>
            <input type="number" onChange={handleChange} />
            <div>
                {
                    isPending
                        ? "Loading..."
                        : list
                }
            </div>
        </div>
    );
}
```

从上面可以看到`useTransation`返回一个包含两个子项的数组。

`isPending`: 告诉你目前是否有一些`更新操作`任然在等待中（尚未被React执行，并以较低的优先级处理）
`startTransition`: React会以一个较低的优先级调度被它包装的`更新操作`。

这样，就确保了用户和输入框的交互操作保持流畅。然后再通过`isPending`来判断是否可以更新UI。


## useDeferredValue

`useDeferredValue`的作用和`useTransition`一致，都是用于在不阻塞UI的情况下更新状态。但是使用场景不同。


`useTransition`是让你能够完全控制哪个`更新操作`应该以一个比较低的优先级被调度。但是，在某些情况下，可能无法访问实际的`更新操作`（例如，状态是从父组件上传下来的）。这时候，就可以使用`useDeferredValue`来代替。

用React 团队成员Dan的话说`useDeferredValue`主要是:

> useful when the value comes “from above” and you don’t actually have control over the corresponding setState call.

它的意思就是: 当值来自 "上面"，而你实际上不能控制相应的setState调用时，这个方法很有用。

这就比较契合我们上面所举例子的场景。

那我们就需要将上面的例子改成如下:
```jsx
import { useState, useMemo, useDeferredValue } from "react";

const numbers = [...new Array(200000).keys()];

export default function App() {
    const [query, setQuery] = useState("");

    const handleChange = (e) => {
        setQuery(e.target.value);
    };

    return (
        <div>
            <input type="number" onChange={handleChange} value={query} />
            <List query={query} />
        </div>
    );
}

function List(props) {
    const { query } = props;
    const defQuery = useDeferredValue(query);

    const list = useMemo(() => (
        numbers.map((i, index) => (
            defQuery
                ? i.toString().startsWith(defQuery)
                && <p key={index}>{i}</p>
                : <p key={index}>{i}</p>
        ))
    ), [defQuery]);

    return (
        <div>
            {list}
        </div>
    );
}
```

## 总结

如上所述，`useTransition`直接控制`更新状态的代码`，而`useDeferredValue`控制一个受状态变化影响的值。它们做的是同样的事,帮助提高用户体验(UX)，不应该同时使用这两者。

相反，如果你可以访问`更新操作`，并且有一些`更新操作`应该以较低的优先级处理，就使用`useTransition`。如果你没有这种权限，就使用`useDeferredValue`。


## 参考

[useTransition and useDeferredValue in React 18](https://blog.bitsrc.io/usetransition-and-usedeferredvalue-in-react-18-5d8a09f8c3a7)
[UseTransition() Vs UseDeferredValue() In React 18](https://blog.openreplay.com/usetransition-vs-usedeferredvalue-in-react-18/)

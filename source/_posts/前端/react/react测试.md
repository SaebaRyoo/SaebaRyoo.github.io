---
title: 关于React测试的思考
date: 2022-11-26
categories:
  - 前端
tags:
  - React
  - 测试
---

## 为什么要写单元测试

- 帮助开发者完善异常逻辑，提高程序健壮性
- 降低代码耦合度，防止在项目中出现修改了一处代码后，却影响了其他代码的尴尬场景
- 提高项目组件的职责的单一性，防止在组件内出现业务逻辑，降低复用效率
- 作为文档：在一个中大型项目中，随着时间的增长，一些组件的代码和逻辑会越来越复杂。而通过覆盖业务的单测，可以清晰呈现业务逻辑，从而降低上手成本

### 基础测试框架

Jest，用于完成基础的函数测试

### 辅助库

前端的测试不同于常规的后端逻辑测试，前端的单测设计到 DOM 和事件的模拟，所以需要一个辅助库来完成

#### React Testing Library（推荐）

这是官方推荐的测试库，主要有以下三个依赖：

- @testing-library/jest-dom：用于 dom、样式类型等元素的选取。
- @testing-library/react：提供针对 React 的单测渲染能力。
- @testing-library/user-event：用于单测场景下事件的模拟。

为什么推荐使用？

1. 更新及时，跟得上 react 的版本迭代
2. 测试思路：它不在意组件实现细节，而是聚焦在了组件能力本身(即从 developer 传入 props，然后通过 RTL 的 API 验证`render`函数输出的内容),从用户视角进行测试，如下，用户只会看到组件渲染后是否有`learn react test`这一串字符：

```js
test("renders learn react test link", () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react test/i);
  expect(linkElement).toBeInTheDocument();
});
```

#### Enzyme

Enzyme 有以下三个依赖需要安装

- enzyme：基础库。
- enzyme-adapter-react：对 React 的适配器，需要安装对应 React 版本的适配器。
- jest-enzyme：用于 enzyme 对 Jest 的环境适配。

为什么不推荐使用 Enzyme？主要有以下几个原因

1. Enzyme 依赖是配置 enzyme-adapter-react,但目前迭代速度停止在 16，后续版本都是开发者自己实现的。这对于公司开发一个项目来说非常不稳定。且现在对 Enzyme 进行维护的开发者很少
2. 测试思路， Enzyme 是基于 component 的 props 展开，从代码实现的层面验证组件
   如下：

```js
it("input with custom className & style", () => {
  const wrapper = shallow(<Input className="test" style={{ color: "red" }} />);
  expect(wrapper.exists(".test")).toEqual(true);
  expect(wrapper.find("div.test")).toHaveStyle("color", "red");
});
```

上面的代码更像是为的 developer 用户

所以对于需求可能会频繁变动的业务场景，相对来说比较脆弱。因为开发人员需要随着业务的变动频繁的修改单元测试。

比如，当某一业务组件的最终输出内容不变，但是因为一些原因后台数据结构的调整，或者我们在开发过程中需要调整业务组件的结构，那么我们业务组件中传入的 props 也会跟着改变。
这样，与之对应的单测也会随之废弃。可是在 UI 逻辑上并没有变化，这时候就会极大的增加业务开发的工作量，并且单元测试也失去了意义

## react-testing-library Api

react-testing-library 根据行为分类可以分为 3 大类 api，**它们决定了查询 api 命名的前缀**。查询的**参照物**决定了 api 的后缀。如 getByText，它使用 get 查询行为，以 Text 为参照物进行单独查询

### 以查询行为分类

- get
- query
- find

### 以参照物划分

在 Enzyme 中是按照 css 类名或者 id 来查询

#### 1. 角色 Role （元素定义）

- aria 属性（元素状态，属性）
  - aria-hidden： 不在 DOM 树上访问的元素；
  - aria-selected: 元素是否被选中；
  - aria-checked: 元素是否被勾选；
  - aria-current: 当前选中的元素；
  - aria-pressed: 被按压的元素；
  - aria-expanded:元素是否被展开；
  - aria-level: 区域的等级，值得一提的是，h1 - h6 会有默认的 aria-level 属性，值对应 1-6；
  - aria-describedby: 可以通过描述来定位额外的元素。

#### 2. 标签文本 LabelText

针对 label 标签的 text 查询，通过这个可以查询到对应 label 的输入节点（比如 input):

```js
// DomQuery.tsx
import { FC } from "react";

interface IProps {}

export const DomQuery: FC<IProps> = ({}) => {
  return (
    <div>
      {/* ... other content */}
      <label>
        testLabel
        <input />
      </label>
    </div>
  );
};
```

```js
// DomQuery.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { DomQuery } from "../components/DomQuery";

describe("tests for label", () => {
  // ...
  test("labelText", () => {
    render(<DomQuery />);
    const label = screen.getByLabelText("testLabel");
    screen.debug(label);
  });
});
```

#### 3. 占位符文本 PlaceholderText

通过 placeholder 来查询，也可以有效查到对应的表单元素，如果你没有使用 label 标签的时候，可以使用这个来作为替代

```js
// ./src/components/DomQuery/index.tsx
import { FC } from "react";

interface IProps {}

export const DomQuery: FC<IProps> = ({}) => {
  return (
    <div>
      {/* ... other content */}
      <input placeholder="a query by placeholder" />
    </div>
  );
};

// ./src/__test__/dom_query.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { DomQuery } from "../components/DomQuery";

describe("tests for placeholder", () => {
  // ...
  test("placeholder", () => {
    render(<DomQuery />);
    const placeholderInput = screen.getByPlaceholderText(
      "a query by placeholder"
    );
    screen.debug(placeholderInput);
  });
});
```

#### 4. 文本 Text

#### 5. 表单值 DisplayValue

根据表单元素的值来查询，也就是对应的 value 属性，当然不仅仅是通过 value，表单 onchange 进来或者是 defaultValue 也是同样可以生效的

```js
// ./src/components/DomQuery/index.tsx
import { FC } from "react";

interface IProps {}
export const DomQuery: FC<IProps> = ({}) => {
  return (
    <div>
      {/* ... other content */}
      <input defaultValue="a query by value" readOnly />
    </div>
  );
};
// ./src/__test__/dom_query.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { DomQuery } from "../components/DomQuery";

describe("tests for displayValue", () => {
  // ...
  test("value", () => {
    render(<DomQuery />);
    const valueInput = screen.getByDisplayValue("a query by value");
    screen.debug(valueInput);
  });
});
```

#### 6. 图片 AltText

这个则是根据 img 的 alt 来查询，相比之前的一些查询方式，这种从用户视角上就需要满足一定情况才能看见了（图片不能正常加载）

```js
// ./src/components/DomQuery/index.tsx
import { FC } from "react";

interface IProps {}

export const DomQuery: FC<IProps> = ({}) => {
  return (
    <div>
      {/* ... other content */}
      <img alt="a query by alt" />
    </div>
  );
};
// ./src/__test__/dom_query.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { DomQuery } from "../components/DomQuery";

describe("tests for alt", () => {
  // ...
  test("alt", () => {
    render(<DomQuery />);
    const altImg = screen.getByAltText("a query by alt");
    screen.debug(altImg);
  });
});
```

#### 7. 标题 Title (基本不会用)

#### 8. 后门 TestId

这个就特殊点了，这个其实是一个后门的查询方式，通过新增 data-testid 属性来进行查询，这个对整个页面的语义和功能是没有任何影响的，相当于只是我们单独加的一个标识来确定指定的区域，一般只有实在不知道怎么选取需要的区域，才会去使用它

```js
// ./src/components/DomQuery/index.tsx
import { FC } from "react";

interface IProps {}

export const DomQuery: FC<IProps> = ({}) => {
  return (
    <div>
      {/* ... other content */}
      <div data-testid="a not so good query"></div>
    </div>
  );
};
// ./src/__test__/dom_query.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { DomQuery } from "../components/DomQuery";

describe("tests for testid", () => {
  // ...
  test("testid", () => {
    render(<DomQuery />);
    const testidItem = screen.getByTestId("a not so good query");
    screen.debug(testidItem);
  });
});
```

### 安装

- 使用`yarn init vite react-test-demo` 创建一个项目

- 安装 jest 相关`yarn add jest babel-jest @testing-library/react @testing-library/user-event @testing-library/jest-dom jest-environment-jsdom -D`

- 安装对应的 babel 插件解析文件 `yarn add @babel/preset-react @babel/preset-typescript @babel/preset-env -D`

- `yarn add identity-obj-proxy -D`

### 配置

1. 创建一个 jest-setup.ts 用来帮助每个测试文件导入 jest-dom

```ts
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
```

2. 使用`npx jest --init`创建一个 jest 配置文件,选项可以按如下选择

```
The following questions will help Jest to create a suitable configuration for your project

✔ Would you like to use Jest when running "test" script in "package.json"? … yes
✔ Would you like to use Typescript for the configuration file? … yes
✔ Choose the test environment that will be used for testing › jsdom (browser-like)
✔ Do you want Jest to add coverage reports? … no
✔ Which provider should be used to instrument code for coverage? › babel
✔ Automatically clear mock calls, instances, contexts and results before every test? … yes
```

3. 修改 jest 配置文件

主要看下面的配置

jest.config.mjs

```js
export default {
  // ...

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    ".(css|less|scss|sass)$": "identity-obj-proxy", // 对css文件使用identity-obj-proxy进行代理,该包的作用是将对象的访问直接返回对应的字符串，比如 styles.title 将会返回 title 字符串
    "\\.(png|jpg|jpeg|gif|ttf|eot|svg)$": "<rootDir>/__mocks__/fileMock.js", // 对资源文件进行mock
  },

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: ["<rootDir>/jestSetup.ts"],
  // The test environment that will be used for testing
  testEnvironment: "jsdom",

  // A map from regular expressions to paths to transformers
  transform: {
    "^.+.(js|ts|tsx)$": "babel-jest", // 给jest添加一个转换器
  },
};
```

4. 修改 babel 配置帮助我们解析文件
   .babelrc

```js
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        }
      }
    ],
    [
      "@babel/preset-react",
      {
        "runtime": "automatic" // 自动导入react,不用在文件中显式的引入
      }
    ],
    "@babel/preset-typescript"
  ]
}
```

5. 编写一个测试用例

src/App.test.tsx

```tsx
import App from "./App";
import { render, screen } from "@testing-library/react";

describe("unit test of <App/>", () => {
  test("test is working", () => {
    render(<App />);
    expect(screen.getByText("Vite + React")).toBeInTheDocument();
  });
});
```

然后就会看到如下结果

```
 PASS  src/App.test.tsx
  unit test of <App/>
    ✓ test is working (30 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        1.369 s
Ran all test suites.
```

### 如何测试 Provider 包裹的组件

> 代码在[react-test-demo 仓库](https://github.com/SaebaRyoo/Demos/tree/main/react-test-demo)

先写一个用于创建测试 store 的 setupStore 方法, 默认使用项目中的 reducer

```ts
// 用于单元测试
export function setupStore(
  preloadedState: PreloadedState<RootState> | {} = {}
) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
}
```

然后再创建一个 src/test/testUitls.tsx 用于 Provider 包裹组件，并暴露一些方法

```tsx
import React from "react";
import type { PropsWithChildren } from "react";
import { setupStore } from "../stores/store";
import type { RootState, AppStore } from "../stores/store";
import { Provider } from "react-redux";
import { render } from "@testing-library/react";
import type { PreloadedState } from "@reduxjs/toolkit";
import type { RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// 这个 interface 扩展了 RTL 的默认 render 选项，同时允许用户指定其他选项，例如 initialState 和 store
interface ExtendedRenderOptions extends Omit<RenderOptions, "queries"> {
  preloadedState?: PreloadedState<RootState>;
  store?: AppStore;
}

// custom render for support Provider
export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState,
    // 如果没有传入 store, 则自动创建一个 store 实例
    store = setupStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
    return <Provider store={store}>{children}</Provider>;
  }
  // enhance render methods
  return {
    store, // 增加redux功能
    user: userEvent.setup(), // 在render前配置一个userEvent实例
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
```

### 组件中的 http 请求如何 mock

使用 `msw（mock service worker）`来 mock 网络请求。

它不同于其他 mock service 需要独立运行一个服务且对代码的侵入性比较强。它是利用的 Service Worker API，在网络层进行请求拦截。保证有 mock 和无 mock 的应用程序的行为一致，且不需要为了 mock 而对应用程序的代码做修改。具体说明在[官网](https://mswjs.io/docs/#why-service-workers)

它的工作流如下图
![](https://mermaid.ink/img/eyJjb2RlIjoic2VxdWVuY2VEaWFncmFtXG5cdEJyb3dzZXIgLT4-IFNlcnZpY2UgV29ya2VyOiAxLiByZXF1ZXN0XG4gIFNlcnZpY2UgV29ya2VyIC0tPj4gbXN3OiAyLiByZXF1ZXN0IGNsb25lXG4gIG1zdyAtLT4-IG1zdzogMy4gbWF0Y2ggYWdhaW5zdCBtb2Nrc1xuICBtc3cgLS0-PiBTZXJ2aWNlIFdvcmtlcjogNC4gTW9ja2VkIHJlc3BvbnNlXG4gIFNlcnZpY2UgV29ya2VyIC0-PiBCcm93c2VyOiA1LiByZXNwb25kV2l0aChtb2NrZWRSZXNwb25zZSlcblx0XHRcdFx0XHQiLCJtZXJtYWlkIjp7InRoZW1lIjoiZGVmYXVsdCJ9LCJ1cGRhdGVFZGl0b3IiOmZhbHNlfQ)

### 使用 userEvent 来模拟用户操作

为什么使用 user-event 而不是 fire-event？这在[官方的介绍](https://testing-library.com/docs/user-event/intro/#differences-from-fireevent)中说的比较明确。这里只强调一下重点：

因为用户在操作一个 dom 的时候，并不一定是只触发一个事件，而是可能会触发多个事件。
比如当用户在一个文本框内输入时，input 首先会是会触发 focus，然后是键盘和 onchange。

`fireEvent`派发一个 DOM 事件，而`userEvent`模拟的是整个交互。它允许你描述一个用户交互来替代一个具体的事件。

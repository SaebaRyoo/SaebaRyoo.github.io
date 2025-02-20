---
title: 前端日常-基于RBAC和React-Router(V6)的权限控制
date: 2025-02-20
categories:
  - 前端
tags:
  - React
  - React-Router
---

---

## theme: channing-cyan

在一个后台管理系统中，安全是很重要的。不光后端需要做权限校验，前端也需要做权限控制。
我们可以大致将权限分为 3 种： **接口权限**、**页面权限**、**按钮权限**。

在这当中，前端主要关注点则是**页面权限**，**按钮权限**，而前端做这些的主要目的则是：

- 禁止用户访问一些无权限访问的页面
- 过滤不必要的请求，减少服务器压力

这是具体的[代码实现](https://github.com/SaebaRyoo/Demos/tree/main/react-auth-demo/client)，下面主要是思路的整理，以及一些核心实现

## 接口权限

接口权限一般是用户登录后，后端根据账号密码来`认证`和`授权`，并颁发`token`或者`session`等来保存用户登录状态。

后续客户端请求一般是在`header`中携带`token`，后端通过对 token 进行`鉴权`是否合法来控制是否可以访问接口。

一般后台会通过用户的角色等来做对应的接口`权限控制`。

而需要我们前端做的是在请求中携带好登录后回传的`token`,我们以**axios**为例

```ts
const instance = axios.create(config);

instance.interceptors.request.use(
  (request: any) => {
    request.headers["access_token"] = localStorage.getItem("access_token");
    return request;
  },
  (err) => {
    Promise.reject(err.response);
  }
);

instance.interceptors.response.use(
  (response) => {
    if (response.status !== 200) return Promise.reject(response.data);

    if (response.data.code === 401) {
      //token过期或者错误
      window.location.replace("/login");
    }
    return response.data.data;
  },
  (err) => {
    Promise.reject(err.response);
  }
);
```

## 页面权限

首先，我们先完成`路由配置`

`src/routes/routes.tsx`

```tsx
export type RoutesType = {
  path: string;
  element: ReactElement;
  children?: RoutesType[];
};

const routers: RoutesType[] = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/foo",
    element: <Foo />,
    children: [
      {
        path: "/foo/auth-button",
        element: <MyAuthButtonPage />,
      },
    ],
  },
  {
    path: "/protected",
    element: <Protected />,
  },

  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
  },

  // 配置404，需要放在最后
  {
    path: "/*",
    element: <NotFound />,
  },
];
```

然后是基于`路由配置`来生成对应的路由组件

`src/routes/root.tsx`

```tsx
const Root = () => {
  // 创建一个有子节点的Route
  const CreateHasChildrenRoute = (route: RoutesType) => {
    return (
      <Route path={route.path} key={route.path}>
        <Route
          index
          element={
            <AuthRoute key={route.path} path={route.path}>
              {route.element}
            </AuthRoute>
          }
        />
        {route?.children && RouteAuthFun(route.children)}
      </Route>
    );
  };

  // 创建一个没有子节点的Route
  const CreateNoChildrenRoute = (route: RoutesType) => {
    return (
      <Route
        key={route.path}
        path={route.path}
        element={
          <AuthRoute path={route.path} key={route.path}>
            {route.element}
          </AuthRoute>
        }
      />
    );
  };

  // 处理我们的routers
  const RouteAuthFun = (routeList: any) => {
    return routeList.map((route: RoutesType) => {
      let element: ReactElement | null = null;
      if (route.children && !!route.children.length) {
        element = CreateHasChildrenRoute(route);
      } else {
        element = CreateNoChildrenRoute(route);
      }
      return element;
    });
  };

  return (
    <BrowserRouter>
      <Routes>{RouteAuthFun(routers)}</Routes>
    </BrowserRouter>
  );
};
```

最后是只需要在入口中写入`Root`组件即可

```tsx
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Provider store={store}>
    <Root />
  </Provider>
);
```

上面只是完成了基本的配置，下面才是权限相关

路由权限主要分为两个方向：

### 1. 菜单权限

一般来说，后台通过维护`user`、`role`、`menu`、`user_role`、`menu_role`这几张表来做基于 RBAC 的权限设计。

所以，在登录接口中，一般后台会返回用户对应的`角色`、`菜单`等信息。我们通过`redux-toolkit`保存登录数据。大致信息如下(**未真正请求接口，只写了初始数据**):

`src/pages/login/Login.slice.ts`

```ts
interface LoginState {
  username: string;
  role: string;
  menuLists: any[];
}

// Define the initial state using that type
const initialState: LoginState = {
  username: "ryo",
  role: "admin",
  menuLists: [
    {
      id: "1",
      name: "首页",
      icon: "icon-home",
      url: "/",
      parent_id: "0",
    },
    {
      id: "2",
      name: "foo",
      icon: "icon-foo",
      url: "/foo",
      parent_id: "0",
    },
    {
      id: "2-1",
      name: "auth-button",
      icon: "icon-auth-button",
      url: "/foo/auth-button",
      parent_id: "2",
    },
  ],
};
```

这里的`role`表示当前用户的角色,`menuLists`为用户可访问的菜单

然后在首页中生成菜单列表

```tsx
const getMenuItem = (menus: any): any => {
  return menus.map((menu: any) => {
    if (menu.children) {
      return (
        <div key={menu.url}>
          <Link to={menu.url}>{menu.name}</Link>
          {getMenuItem(menu.children)}
        </div>
      );
    }

    return (
      <div key={menu.url}>
        <Link to={menu.url}>{menu.name}</Link>
      </div>
    );
  });
};

function genMenu(array: any, parentId = "0") {
  const result = [];
  for (const item of array) {
    if (item.parent_id === parentId) {
      const menu = { ...item };
      menu.children = genMenu(array, menu.id);
      result.push(menu);
    }
  }
  return result;
}

function Home() {
  const menuLists = useAppSelector((state) => state.login.menuLists);
  const menuTree = genMenu(menuLists);
  return (
    <div>
      <h1>home page</h1>
      {getMenuItem(menuTree)}
    </div>
  );
}

export default Home;
```

但是，只**根据权限列表来动态生成菜单**并不能完全实现权限相关的目的。用户还可以通过**在地址栏输入 url**的方式来访问没有在菜单中显示的页面。

### 2. 路由权限

我们可以通过实现一个`AuthRoute`来解决上述的问题。

通过`AuthRoute`来拦截页面的访问操作。

`src/routes/AuthRoute.tsx`

```tsx
// 无需权限认证的白名单
// 一般是前端的一些报错页
const DONT_NEED_AUTHORIZED_PAGE = ["/unauthorized", "/*"];

const AuthRoute = ({ children, path }: any) => {
  // 该flag用于控制 受保护页面的渲染时机，需要等待useEffect中所有的权限验证条件完成后才表示可以渲染
  const [canRender, setRenderFlag] = useState(false);
  const navigate = useNavigate();
  const menuLists = useAppSelector((state) => state.login.menuLists);
  const menuUrls = menuLists.map((menu) => menu.url);
  const token = localStorage.getItem("access_token") || "";

  // 在白名单中的无需验证，直接跳转
  if (DONT_NEED_AUTHORIZED_PAGE.includes(path)) {
    return children;
  }

  useEffect(() => {
    // 用户未登录
    if (token === "") {
      message.error("token 过期，请重新登录!");
      navigate("/login");
    }

    // 已登录
    if (token) {
      // 已登录需要通过logout来控制退出登录或者是token过期返回登录界面
      if (location.pathname == "/login") {
        navigate("/");
      }

      // 已登录，根据后台传的权限列表做判断
      if (!menuUrls.includes(location.pathname)) {
        navigate("/unauthorized", { replace: true });
      }
    }

    // 当上面的权限控制通过后，再渲染受保护的页面
    setRenderFlag(true);
  }, [token, location.pathname]);

  if (!canRender) return null;
  return children;
};
export default AuthRoute;
```

然后，在我们生成`Route`的时候在`element`属性中使用`AuthRoute`,这一步，我们已经在上面`src/routes/root.tsx`这个文件中写进去了。

到这里，我们就通过实现`AuthRoute`来拦截页面访问，做权限相关处理。

然后我们可以运行该[仓库](https://github.com/SaebaRyoo/Demos/tree/main/react-auth-demo/client)
代码来看效果。

目前没有实现登录相关功能，所以需要手动在`localStorage`中添加`access_token`来模拟登录。

- **如果没有登录(没有 access_token)或者登录已过期，访问任何路由都会被路由到`/login`。**
- **如果已经登录，但是再访问登录页面，会被路由到`/`首页**
- **如果已经登录，但是访问了一个你无访问的页面,如`/protected`，则会被路由到`/unauthorized`页面**

## 按钮权限

按钮级别的权限，根据当前用户角色的不同，可以看到的按钮和操作不同。这里我只简单实现了一个`AuthButton`

`src/coponents/auth-button/index.tsx`

```tsx
import { Button } from "antd";
import type { ButtonProps } from "antd";
import React from "react";
import { useAppSelector } from "../../hooks/typedHooks";

interface AuthButtonProps extends ButtonProps {
  roles: string[];
}

const AuthButton: React.FC<AuthButtonProps> = ({ roles, children }) => {
  const role = useAppSelector((state) => state.login.role);

  if (roles.includes(role)) {
    return <Button>{children}</Button>;
  }
  return null;
};

export default AuthButton;
```

使用方法如下，新增了一个`roles`属性，表示哪些角色可以看见该按钮

`src/pages/foo/auth-button.tsx`

```tsx
const ButtonPermission: React.FC = () => {
  const role = useAppSelector((state) => state.login.role);
  return (
    <div>
      <h1>Button Permission</h1>
      <AuthButton roles={["admin", "user"]}>添加</AuthButton>
      <AuthButton roles={["admin"]}>编辑</AuthButton>
      <AuthButton roles={["admin"]}>删除</AuthButton>
    </div>
  );
};

export default ButtonPermission;
```

我们可以手动的修改`Login.slice.ts`中的`role`来查看不同的情况。

这种实现方式比较简单，大伙可以根据自己的具体场景选择更好的方案

## 参考

- [认证、授权、鉴权和权限控制](https://www.hyhblog.cn/2018/04/25/user_login_auth_terms/)
- https://segmentfault.com/a/1190000020887109

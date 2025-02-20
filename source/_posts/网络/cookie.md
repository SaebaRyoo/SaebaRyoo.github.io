---
title: cookie详解
date: 2023-09-04
categories:
  - 网络
tags:
  - 浏览器
---

## Cookie 相关知识

- [github](https://github.com/mqyqingfeng/Blog/issues/157)
- [掘金](https://segmentfault.com/a/1190000038824618#item-2-3)

## 常见问题

### 主域名可以访问子域名的 cookie 吗？

在浏览器中，主域名是无法直接访问子域名的 cookie 的，这是由**同源策略**所限制的。**同源策略**要求两个页面只有在**协议**、**主机**和**端口号**都相同的情况下，才能互相访问对方的数据，这样可以保护用户的隐私安全。

例如，在主域名为  `example.com`  的情况下，子域名  `www.example.com`  和  `api.example.com`  的 cookie 不能相互访问。

然而，由于**同源策略**允许设置文档的域名（`document.domain`），通过设置该属性可以使主域名允许访问子域名的 cookie。具体实现方法如下：

1.  在所有需要进行 cookie 共享的页面中设置：

```
document.domain = "example.com";
```

这样就使得所有子域名和主域名的  `document.domain`  都相同，从而实现了跨域共享 cookie。

2.  在任意一个子域名中创建一个 cookie，例如：

```
document.cookie = "mycookie=myvalue; domain=example.com; expires=Fri, 31 Jul 2022 23:59:59 GMT; path=/";
```

在上面的代码中，使用了  `domain`  参数来指定 cookie 的父域名为  `example.com`。

3.  在其他子域名的页面中可以读取这个 cookie，并进行相关操作，例如：

```
console.log(document.cookie); // 输出："mycookie=myvalue"
```

需要注意的是，通过设置  `document.domain`  属性来实现 cookie 共享需要满足以下条件：

- 主域名和子域名的  `document.domain`  值必须相同；
- 主域名和子域名的**协议**、**端口号**必须相同；
- 当前页面的域名必须是完整的（含有顶级域名）。

如果不满足以上条件的话，将无法完成 cookie 共享。

### 子域名是否可以访问主域名的 cookie？

子域名可以访问父域名下的 cookie，因为在同一个主域名下，子域名和父域名共享同一个 cookie 存储机制。也就是说，当在  `example.com`  域名下创建一个 cookie 时，其子域名  `www.example.com`  和  `api.example.com`  也能够通过 JavaScript 对其进行读取或修改，只要这些子域名没有设置自己的 cookie。

这是因为在同一个主域名下，所有的子域名都属于同一个域，浏览器会默认将 cookie 的域名设置为主域名，未指定的子域名会自动与主域名进行共享。例如，在主域名  `example.com`  中设置了一个名为  `mycookie`  的 cookie：

```
document.cookie = "mycookie=test; domain=example.com";
```

那么在  `www.example.com`  和  `api.example.com`  下直接访问时，都可以通过 JavaScript 读取到该 cookie：

```
console.log(document.cookie);  // 输出："mycookie=test"
```

需要注意的是，**在不同主域名下的子域名之间是不能共享 cookie 的，因为主域名不同，它们的域也不同，不受同源策略限制**。为了解决这个问题，可以使用**跨域通信技术**，如 CORS、JSONP、postMessage 等。

### cookie 与 web 安全

#### cookie 如何应对 XSS 漏洞

XSS 漏洞的原理是，由于未对用户提交的表单数据或者 url 参数等数据做处理就显示在了页面上，导致用户提交的内容在页面上被做为 html 解析执行。

**常规方案**：对特殊字符进行处理，如"<"和">"等进行转义。

**cookie 的应对方案**：对于用户利用 script 脚本来采集 cookie 信息，我们可以将重要的 cookie 信息设置为 HttpOnly 来避免 cookie 被 js 采集。

#### cookie 如何应对 CSRF 攻击

CSRF，中文名叫跨站请求伪造，原理是，用户登陆了 A 网站，然后因为某些原因访问了 B 网站（比如跳转等），B 网站直接发送一个 A 网站的请求进行一些危险操作，由于 A 网站处于登陆状态，就发生了 CSRF 攻击（核心就是利用了 cookie 信息可以被跨站携带）！

**常规方案**：采用验证码或 token 等。

**cookie 的应对方案**：由于 CSRF 攻击核心就是利用了 cookie 信息可以被跨站携带，那么我们可以对核心 cookie 的 SameSite 设置为 Strict 或 Lax 来避免。

### cookie、sessionStorage、localStorage 的区别

| 列头       | cookie                                | sessionStorage               | localStorage                                 |
| ---------- | ------------------------------------- | ---------------------------- | -------------------------------------------- |
| 请求方式   | cookie 始终在同源的 http 请求中被携带 | 请求中不主动携带             | 请求中不主动携带                             |
| 数据大小   | 4K(4 \* 1024 Byte)                    | 5M(5 _ 1024 _ 1024)          | 5M                                           |
| 数据有效期 | 只在设置 cookie 过期时间之前有效      | 仅在当前浏览器窗口关闭前有效 | 永久存储                                     |
| 作用域     | 所有同源窗口中共享                    | 所有同源窗口中共享           | 不在不同的浏览器窗口中共享，即使是同一个页面 |

### 哪些信息适合放到 cookie 中

cookie 的增多无疑会**加重网络请求的开销**，而且每次请求都会将 cookie 完整的带上，因此对于那些“每次请求都必须要携带的信息（如`身份信息`、`A/B分桶信息`等）”，才适合放进 cookie 中，其他类型的数据建议放进 localStorage 中。

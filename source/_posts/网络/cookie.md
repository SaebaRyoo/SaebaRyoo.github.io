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

### 主域名与子域名如何共享 cookie？

默认情况下，cookie 的 `domain` 是**当前设置它的域名本身**，不会自动共享给其他域名。无论是主域名还是子域名，想要让双方都能访问同一个 cookie，**必须在设置 cookie 时显式指定 `domain` 为一级域名**。

例如，在 `www.example.com` 或 `example.com` 任意一方设置 cookie 时，指定 `domain=example.com`：

```
document.cookie = "mycookie=myvalue; domain=example.com; path=/";
```

这样，`example.com`、`www.example.com`、`api.example.com` 等所有该主域名下的子域名都可以读取到这个 cookie：

```
console.log(document.cookie); // 输出："mycookie=myvalue"
```

如果设置 cookie 时**不指定 `domain`**，则该 cookie 只属于当前域名，其他子域名或主域名均无法访问。

需要注意的是，**不同主域名之间的子域名无法共享 cookie**，这是由同源策略决定的。跨主域名的数据共享需要使用 CORS、postMessage 等跨域通信技术。

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

---
title: React Router中HashRouter和BrowserRouter的区别
categories:
- 前端
tags: 
- React
- React-Router
---
# 传参方式
### HashRouter
1. 通过在url中增加**查询字符串**。如 `<Link to={{pathname: '/test', search: '?id=1'}}>`或者`<Link to="/test?id=1">`(浏览器刷新后，数据不丢 。获取方式：`this.props.location.search`)
2. 通过**params**，表现形式`<Link to="/test/:id">`(浏览器刷新后，数据不丢。获取方式：`this.props.params`) 
3. 通过**query**(**query**是一个自定义属性，你可以写成test，对应的取也用test即可)属性，`<Link to={{pathname: '/test', query: {id: 1}}}>`(浏览器刷新后，数据丢失， 获取方式：`this.props.location.query`。 )
### BrowserRouter
1. **通过在url中增加查询字符串**。如 `<Link to={{pathname: '/test', search: '?id=1'}}>`或者`<Link to="/test?id=1">`(浏览器刷新后，数据不丢。获取方式：`this.props.location.search`)
2. 通过**params**，表现形式`<Link to="/test/:id">`(浏览器刷新后，数据不丢。  获取方式：`this.props.params`) 
3. 通过**state**，如`<Link to={{pathname: '/test', state: {id: 1}}}>`(浏览器刷新后，数据不丢 获取方式：this.props.location.state)
# 区别
### HashRouter
1. **HashRouter**使用URL（即window.location.hash）的哈希部分来保持UI与URL同步的。在地址栏显示样式会增加一个#前缀，如：**http://www.some.com/#/demo/**这种形式
2. HashRouter的主要作用是兼容低版本浏览器
3. 当hash变化时，并不会再一次产生资源请求
4. 通过**window.onhashchange**监听变化
### BrowserRouter
1. 使用的是基于HTML5规范的**window.history**来管理路由状态，并且react-router中通过 **pushState， popState，replaceState**来同步ui的变化
2. IE10+及以上浏览器支持HTML5的history api
3. 生产中服务器需要配置，并且url变化会向服务器请求资源。比如用nginx作为web服务器时，需要配置以下规则来重定向到**index.html(单页面入口)**
```
    location / {
        try_files $uri $uri/ /index.html;
    }
```
# 疑问
### 为什么history.state可以在刷新页面后依然保存数据
> 浏览器会将在history过程中传入的state对象序列化以后保留在本地，所以当重新载入这个页面的时候，可以拿到这个对象。

# 参考链接
1. https://developer.mozilla.org/zh-CN/docs/Web/API/History_API#%E8%A7%84%E8%8C%83
2. https://www.impressivewebs.com/html5-history-api-syntax/
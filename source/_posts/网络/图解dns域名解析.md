---
title: 图解dns域名解析
date: 2023-09-04
categories:
  - 网络
---

> [我的掘金](https://juejin.cn/user/588993961408685/posts)

## 域名

拿我们常用的 `www.baidu.com`举例，它并不是完整的域名，完整的域名还需要加上一个`www.baidu.com.`(注意最后有一个`.`)。

这个`.`号就表示`根域名`，只不过在实际使用中为了方便省略了。

根域名的下一级是`顶级域名`，这里的`.com`就是`顶级域名`(常有的`顶级域名`还有`.cn`、`.net`等) 。

再往下就是`权威域名(二级域名)`，这里的`.baidu.com`就是`权威域名`，是用户自己可注册的域名。

## DNS 概念

`DNS`即 `domain name system`域名系统的缩写，将域名和 ip 的映射关系保存在一个 `分布式数据库` 中

## 图解 DNS 域名解析

当用户输入一个域名时，就会按照如下数字顺序`迭代查询`。如果本地缓存中没有缓存域名对应 ip 的解析,则会从根域名开始查找，一直迭代到二级域名服务器，最后返回域名对应的 ip

![dns.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e65ea5eb4fc4477d826b26b4630367d4~tplv-k3u1fbpfcp-watermark.image?)

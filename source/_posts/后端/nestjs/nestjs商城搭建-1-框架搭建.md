---
title: 使用nestjs搭建商城(一)-框架搭建
date: 2022-10-17
categories:
  - 后端
tags:
  - Node
  - Nest.js
---

## 需求分析

Toytopia 一个 b2c 模式的玩具网站，涵盖小孩到成人的各种玩具，可以以下面的为例

- https://www.toysrus.com/
- https://www.target.com/c/toys/-/N-5xtb0

## 系统设计

这是一个 btoc 电商模式。运营商通过和其他渠道对接，生产自己定制的玩具产品。然后在该网站上售卖，游客/未登录用户 可以访问，但是在添加购物车和购买时需要提示登录/注册。且可以下单，完成线上支付，用户还可以参与秒杀抢购

### 前后端分离

Portal 前端:

- next.js 做服务端渲染 ?

网站管理后台:

- 框架: React + antd
- 开发标准: Typescript
- 构建工具: vite?webpack?

后端：

- 框架: nest.js
- 架构模式: 微服务架构
- 数据库: mysql、redis、mongodb
- 部署: docker + k8s
- 其他等

### 技术架构

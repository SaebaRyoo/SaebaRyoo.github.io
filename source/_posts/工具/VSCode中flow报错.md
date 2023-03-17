---
title: 关于查看React源码使用flow，却提示ts类型检查的错误
date: 2022-11-01 21:50
categories:
- 工具
---

## 问题

在看React源码时，因为React使用的是flow,但是一直会报TS的类型错误

## 解决

首先是查询到了先要安装flow的扩展`Flow Language Support`，然后又下载了flow`brew install flow`，又在设置中修改了flow的path`/usr/local/bin/flow`。但是还报错


最后再Stack Overflow找到了另一种方式

在VSCode的工作区设置如下，关闭了当前项目的ts类型报错和js的验证
```json
{
  "typescript.validate.enable": false,
  "javascript.validate.enable": false,
}

```

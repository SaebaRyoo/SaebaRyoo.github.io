---
title: 关于查看React源码使用flow，却提示ts类型检查的错误
date: 2022-11-01 21:50
categories:
  - 开发问题记录
tags:
  - vscode
---

## 问题

在看 React 源码时，因为 React 使用的是 flow,但是一直会报 TS 的类型错误

## 解决

首先是查询到了先要安装 flow 的扩展`Flow Language Support`，然后又下载了 flow`brew install flow`，又在设置中修改了 flow 的 path`/usr/local/bin/flow`。但是还报错

最后再 Stack Overflow 找到了另一种方式

在 VSCode 的工作区设置如下，关闭了当前项目的 ts 类型报错和 js 的验证

```json
{
  "typescript.validate.enable": false,
  "javascript.validate.enable": false
}
```

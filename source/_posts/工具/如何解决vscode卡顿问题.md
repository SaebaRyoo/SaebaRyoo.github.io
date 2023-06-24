---
title: 记一次关于vscode在mac中卡顿的问题
date: 2023-06-24 21:17
categories:
- 工具
tags:
- vscode
---

公司发的机器是19款MacBook Pro Intel i7的，一开始就是在vscode官网下载的默认的Universal版本的。然后在用了一段时间后，突然就很卡。无论是滚动，还是点击鼠标和选中代码。

一开始定位的问题是下载的插件比较多，然后是设置问题，然后在网上找到了如下配置：

1. 在 首选项-> 设置中，搜素`search.follow`配置，然后将“控制是否在搜索中跟踪符号链接”的√去掉

2. 还是在设置中搜索`exclude`，然后在`Files:exclude`下面有一个添加模式，输入`**/node_modules`，设置忽略node_modules这个文件夹

3. 还有一个是关闭`editor.formatOnSave`。但是这个在项目开发中对代码格式的规范非常有用。所以没有关

在进行了上面的操作后，感觉到稍微好了点，但是作用不大。


所以又继续google,找到了一篇[文章](https://www.v2ex.com/t/939225)

感觉和我的问题基本一样，不同的只是电脑的cpu,

所以，我下载了`intel`版的vscode，然后再次打开项目，速度飞起






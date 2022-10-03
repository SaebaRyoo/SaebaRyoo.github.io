---
title: 《从零实现React18》学习总结
categories:
- 前端
tags:
- React
---


> 本文章是用来总结卡颂大佬的[《从零实现React18》](https://appjiz2zqrn2142.h5.xiaoeknow.com/p/decorate/homepage)课程的。

## 章节1

主要讲解了一个项目的搭建应该从以下几个角度出发：
- 项目结构（是选择Multi-repo还是Mono-repo）
- 打包工具
- 如何定义开发规范

## 章节2
这一章主要讲了如何去实现jsx这个与宿主环境无关的方法，它在react包中。虽然是和宿主环境无关，但是这个方法是react中的基础，它会在运行时将已经转化后的jsx元素变为ReactElement

## 章节3 - 5
因为`ReactElement`是React中用来描述jsx中单一节点的数据结构，无法表达节点间的关系，且无法拓展(如：表达状态)。所以在`Reconciler`中还实现了`FiberNode`作为介于`ReactElement`和`真实DOM`间的`虚拟DOM`。然后实现`workLoop`的工作循环，而这一流程主要为`beginWork`、`completeWork`和`commit`.

`JSX语法`在`编译时`被babel编译为被编译成`ReactElement`,然后在`beginWork`阶段通过`ReactElement`生成`FiberNode`，最后在`commit`阶段将`离屏DOM`插入到Continaer中编程真正的`DOM`

在`ReactDOM.render`时创建`fiberRootNode`和`rootFiber`且`beginWork`流程中通过diff来对更新`wip`。并添加对应的`flags`。

然后在`completeWork`中将`flags`冒泡到父节点中，标记`subtreeflags`,为后续commit提供基础

在第四章中还实现了通用的更新机制`Update`和`UpdateQueue`，并在`ReactDOM`初始化时接入了这套更新机制,
不过目前并没有实现完整的updateQueue链表结构，只能支持单一hook的初始化和更新

## 章节6

这一章节主要作用是实现`commit`操作，串联Reconciler逻辑与真实DOM操作。通过在`completeWork`中冒泡的`flags`，在完成所有子树的`归`的逻辑后，执行插入等DOM节点操作

而commit这个过程中会产生`突变(Mutation)`，所谓`Mutation`就是将**一个属性的值从a直接变为b,比如color: red -> color: green**,而`Mutation`又被
分成了三个子阶段
- beforeMotation: 突变前
- mutation
- layout: 突变后

然后可以在这个`Mutation`的过程中执行副作用，
这章目前只实现了在`mutation子阶段`插入DOM节点和Text文本节点创建等基础操作。

并且后面用的`useEffectLayout`hook就是在`layout`子阶段执行（目前未实现）

## 章节7
通过在`beginWork`流程添加对函数组件的`tag`类型的判断，并实现`renderWithHooks`方法执行函数组件并获取函数组件的`child`对应的`HostComponent`来实现函数组件。

## 章节8
通过实现`Hook`数据结构来管理状态，以链表的形式存储多个hooks，并通过next指向下一个hook ,
这也是为什么react强调函数组件内hooks的调用顺序不能变(定义useState等hooks只在函数组件的顶层定义，不要在条件中定义).

不同生命周期中的hooks集合不一样，通过实现`内部数据共享层`获取当前使用的hooks集合

## 章节9
与逻辑无关，介绍了不同的源码调试方法以及react官方测试用例

## 章节10

这一章节主要介绍了update流程中的beginWork、completeWork和commitWork流程。
在beginWork的`reconciler`流程中实现了了对单一节点和text节点的`diff`。
单节点通过`key`和`type`判断当前`fiber`是否可以复用，如果不能复用则会标记删除再创建。
文本节点是只要`currentFiber.tag`没有变化都会复用原来的fiber结构，只更新`workInProgress.pendingProps`。
然后在`completeWrok`阶段标记更新。最后在`commitWork`流程中添加了`commitUpdate`和`commitDeleteion`方法来分别对应`Update`和`Deletion`的副作用操作的执行

最后就是实现了update流程中的`useState`hook, 实现`updateWorkInProgressHook`获取存放执行当前hook的全局变量`workInProgressHook`，
然后计算出新的state。


## 章节11

本章是针对浏览器宿主环境模拟实现的事件模型，主要模拟了浏览器事件捕获、冒泡流程,以及合成事件对象


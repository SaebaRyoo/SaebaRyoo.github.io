---
title: Java SDKMAN使用指南
date: 2026-09-04
categories:
  - 后端
tags:
  - Java
---


# 1. 安装sdkman
https://github.com/sdkman/sdkman-cli

`curl -s https://get.sdkman.io | bash`


# 2. sdkman常用指令

```sh
# 查看 sdkman 版本
$ sdk version

# 查看 sdkman 版本
$ sdk current

# 查看 sdkman 使用的当前 java 版本
$ sdk current java

# 更新本地 sdkman 缓存
$ sdk update

# 强制升级 sdkman
$ sdk selfupdate force

# 列出可用的 java 版本，还可以列出别的平台 $ sdk list maven
$ sdk list java

# 查看安装地址
$ sdk home java 11.0.16-zulu

# 安装指定版本
$ sdk install java 11.0.16-zulu

# 卸载指定版本
$ sdk uninstall java 11.0.16-zulu

# 将制定版本设为默认（全局）
$ sdk default java 11.0.16-zulu

# 配置本地的版本(临时，本地目录)
$ sdk use java 11.0.16-zulu
```


# 3. 使用sdkman搞定java环境

[使用sdkman搞定java环境](https://github.com/tonngw/macman/blob/main/docs/10.%20sdkman%20%E5%87%A0%E5%88%86%E9%92%9F%E6%90%9E%E5%AE%9A%20Java%20%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83%EF%BC%8C%E4%B8%80%E5%AE%9A%E4%B8%8D%E8%A6%81%E9%94%99%E8%BF%87%E5%95%8A%EF%BC%81.md)

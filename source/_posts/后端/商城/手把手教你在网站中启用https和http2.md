---
title: 手把手教你在网站中启用https和http2
date: 2025-03-14
categories:
  - 后端
tags:
  - 安全
  - Nest.js
---

# 1. 前言

在当今互联网时代，网站的安全性和加载速度成为用户体验中至关重要的两个因素。启用HTTPS可以通过加密通信保护数据的传输，防止敏感信息被窃取或篡改；而HTTP/2则在提升网站加载速度和优化网络资源利用方面发挥了重要作用。这篇文章将手把手教你如何在网站中启用HTTPS和HTTP/2，帮助你构建一个既安全又高效的网络环境。

# 2. 前期准备

## 2.1. 云服务

自己准备一个云服务器，或者按照这篇文章申请免费的[亚马逊服务器](https://juejin.cn/post/7251914510436466725)

## 2.2. 已经被备案的域名

我这里已经准备了一个已经备案的 [ibuy.xin](https://ibuy.xin) 域名

# 3. 申请免费的ssl证书

要配置**https**,，需要申请**ssl**证书，可以在阿里云，阿里云官网等网站申请免费的**ssl**证书。

也可以通过这篇[文章](https://zhuanlan.zhihu.com/p/174755007)中提供的资料去查找

本文以在阿里云申请为例。

## 3.1. 登录阿里云

登录阿里云后上**搜索ssl**,点击 **数字证书管理服务**

![](/imgs/hou-duan/33.png)

## 3.2. 购买免费ssl证书

在**ssl证书管理**里面选择**个人测试证书** ，然后点击**立即购买，** 购买完成后点击**创建证书**，点击创建证书后下面列表会出现一个待申请状态的证书，点击**证书申请**，填写申请的信息。

![](/imgs/hou-duan/34.png)

一般等个几分钟就可以了。

## 3.3. 下载SSL证书

在审核通过后，在管理列表里会有对应的证书，点进去后**切换到下载**的tab页面，就会出现如下页面，我们使用的是nginx部署的，下载nginx那一列就行

![](/imgs/hou-duan/35.png)

# 4. 上传证书到服务器

我们后面会用docker部署nginx，对应的volume目录是 `/usr/local/docker-volumes/nginx`

所以，需要先在服务器这个目录下创建一个`cert`，然后将下载下来的证书`<cert-file-name>.pem`和`<cert-file-name>.key`上传到该目录中。

# 5. docker部署nginx

在进入到服务器中后执行下面的操作

## 5.1. 拉取镜像

`docker pull nginx`

## 5.2. 创建挂载目录

    mkdir -p /usr/local/docker-volumes/nginx/{conf,log,html}

## 5.3. 运行容器

    docker run --name nginx -d -p 80:80 nginx

## 5.4. 复制nginx默认配置

配置volume

    docker cp nginx:/etc/nginx/nginx.conf /usr/local/docker-volumes/nginx
    docker cp nginx:/etc/nginx/conf.d /usr/local/docker-volumes/nginx
    docker cp nginx:/usr/share/nginx/html /usr/local/docker-volumes/nginx
    docker rm -f nginx

## 5.5. 修改default.conf文件

编辑default.conf文件

    vim /usr/local/docker-volumes/nginx/conf.d/default.conf

我们会在nginx的配置文件中来完成对https和http2的支持，**需要注意，里面各种路径对应的是容器内的路径。**

**第一个server模块用来监听80端口的http请求，并将该请求跳转到第二个server模块所监听的https的请求**

    server {
        # 监听 80 端口（HTTP），支持 IPv4 和 IPv6
        listen 80;
        listen [::]:80;

        # 服务器名称（域名）
        server_name ibuy.xin;

        # 强制 HTTP 跳转到 HTTPS（301 永久重定向）
        return 301 https://$host$request_uri;
    }

    server {
        # 监听 443 端口（HTTPS），支持 HTTP/2
        listen 443 ssl http2;
        listen [::]:443 ssl http2;

        # 服务器名称（域名）
        server_name ibuy.xin;

        # SSL 证书及密钥（请确保文件路径正确）
        ssl_certificate /etc/nginx/cert/ibuy.xin.pem;
        ssl_certificate_key /etc/nginx/cert/ibuy.xin.key;

        # SSL 会话缓存和超时时间，优化性能
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # 自定义 TLS 协议和加密套件，增强安全性
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;
        ssl_protocols TLSv1.2 TLSv1.3; # 仅允许安全的 TLS 版本
        ssl_prefer_server_ciphers on; # 优先使用服务器端的加密算法

        # 设置网站根目录（前端部署路径）
        root /usr/share/nginx/html/dist;

        location / {
            # 用于 SPA 支持 browserHistory
            try_files $uri $uri/index.html /index.html;
        }

        # 处理 500、502、503、504 错误，返回自定义错误页面
        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }

        # 代理 API 请求到后端 NestJS 服务
        location /api/ {
            proxy_pass http://ibuy-service-nestjs:8000/v1/; # 代理到后端服务（如果 NestJS 使用 HTTPS，需要改成 https）

            # 设置请求头信息，传递客户端 IP 和协议
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

        }
    }

## 5.6. 重新运行nginx镜像

在配置中加上`ibuy-portal-backend_default`网络

    docker run --name nginx -m 200m -p 80:80 -p 443:443 \
    -v /usr/local/docker-volumes/nginx/nginx.conf:/etc/nginx/nginx.conf \
    -v /usr/local/docker-volumes/nginx/conf.d:/etc/nginx/conf.d \
    -v /usr/local/docker-volumes/nginx/cert:/etc/nginx/cert \
    -v /usr/local/docker-volumes/nginx/html:/usr/share/nginx/html \
    -v /usr/local/docker-volumes/nginx/log:/var/log/nginx \
    -e TZ=Asia/Shanghai \
    --restart=always \
    --network ibuy-portal-backend_default \
    --privileged=true -d nginx

1.  容器基础配置\
    \--name nginx\
    为容器指定一个名称 nginx，便于后续管理（启动/停止/查看日志等）。

\-m 200m\
限制容器内存使用上限为 200MB，防止容器占用过多资源。

\-d\
以 后台守护进程模式 运行容器（detached mode），终端不阻塞。

2.  网络与端口映射\
    \-p 80:80\
    将宿主机的 80 端口 映射到容器的 80 端口，允许外部通过 HTTP 访问服务。

\-p 443:443\
将宿主机的 443 端口 映射到容器的 443 端口，允许外部通过 HTTPS 访问服务。

\--network ibuy-portal-backend\_default\
将容器连接到名为 ibuy-portal-backend\_default 的 自定义 Docker 网络，实现与其他容器（如后端服务）的通信。

3.  数据卷挂载（持久化配置与数据）\
    \-v /usr/local/docker-volumes/nginx/nginx.conf:/etc/nginx/nginx.conf\
    将宿主机的 Nginx 主配置文件挂载到容器内，覆盖容器默认配置。

\-v /usr/local/docker-volumes/nginx/conf.d:/etc/nginx/conf.d\
挂载 Nginx 子配置目录，用于管理多站点配置（如你的 server 块配置）。

\-v /usr/local/docker-volumes/nginx/cert:/etc/nginx/cert\
挂载 SSL 证书目录，容器内可通过 /etc/nginx/cert 访问证书文件。

\-v /usr/local/docker-volumes/nginx/html:/usr/share/nginx/html\
挂载网站静态文件目录，容器内 Nginx 可直接服务此目录下的内容（如你的 dist 前端文件）。

\-v /usr/local/docker-volumes/nginx/log:/var/log/nginx\
挂载日志目录，持久化保存 Nginx 的访问日志和错误日志。

4.  环境与权限控制\
    \-e TZ=Asia/Shanghai\
    设置容器时区为 亚洲/上海，确保日志时间与服务器本地时间一致。

\--privileged=true\
赋予容器 特权模式，允许容器访问宿主机的敏感设备或内核功能（慎用！仅在需要时开启）。

5.  容错与运维\
    \--restart=always\
    设置容器 自动重启策略：无论退出状态如何，容器意外停止时都会自动重启（适合生产环境）。

# 6. 验证SSL证书是否配置成功

## 6.1. 验证https

证书安装完成后，您可通过访问证书绑定的域名验证该证书是否安装成功。

<https://ibuy.xin/> 这里替换成你自己的网站域名

访问网站看到有把小锁就表示https配置好了

![](/imgs/hou-duan/36.png)

## 6.2. 验证http2.0

打开我们的浏览器的控制台，查看 protocal ，为h2则表示启用成功

![](/imgs/hou-duan/37.png)

---
title: 使用Docker + Jenkins + Nginx 实战前端自动化部署
date: 2025-02-20
categories:
  - 运维
tags:
  - Docker
  - Git
  - Nginx
---

# 1. docker 部署 nginx

## 1.1. 拉取镜像

`docker pull nginx`

## 1.2. 创建挂载目录

    mkdir -p /usr/local/docker-volumes/nginx/{conf,log,html}

## 1.3. 运行容器

    docker run --name nginx -d -p 80:80 nginx

## 1.4. 复制 nginx 默认配置

    docker cp nginx:/etc/nginx/nginx.conf /usr/local/docker-volumes/nginx
    docker cp nginx:/etc/nginx/conf.d /usr/local/docker-volumes/nginx
    docker cp nginx:/usr/share/nginx/html /usr/local/docker-volumes/nginx
    docker rm -f nginx

## 1.5. 修改 default.conf 文件

后续就是修改 default.conf 文件

    vim /usr/local/docker-volumes/nginx/conf.d/default.conf

然后将 default.conf 改成如下

    server {
        listen       80;
        server_name  localhost;
    ​
        #charset koi8-r;
        access_log  /var/log/nginx/host.access.log  main;
        error_log  /var/log/nginx/error.log  error;
    ​
        #location / {
        #    root   /usr/share/nginx/html;
        #    index  index.html index.htm;
        #}

        静态资源目录
        root /usr/share/nginx/html/dist;

        location / {
            # 用于配合 browserHistory使用
            try_files $uri $uri/index.html /index.html;

            # 如果有资源，建议使用 https + http2，配合按需加载可以获得更好的体验
            # rewrite ^/(.*)$ https://preview.pro.ant.design/$1 permanent;
        }

        # 添加API代理配置
        location /api/ {
            # 注意，这里的host写的是后端在docker中的服务名,因为我们的后端是用docker部署的
            proxy_pass http://backend-nestjs:8001/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    ​
        #error_page  404              /404.html;
    ​
        # redirect server error pages to the static page /50x.html
        #
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   /usr/share/nginx/html;
        }
    }

## 1.6. 查看 docker 网络

因为我的后端也是用的 docker 部署的，所以在运行 nginx 镜像前需要将两个容器放在相同的网络中。不然不同的 docker 容器无法相互连接。

使用`docker network ls`查看后端部署的网络，我定了一个名为`ibuy-backend_ibuy_network`的网络。

## 1.7. 重新运行 nginx 镜像

在配置中加上`ibuy-backend_ibuy_network`网络

    docker run --name nginx -m 200m -p 80:80 \
    -v /usr/local/docker-volumes/nginx/nginx.conf:/etc/nginx/nginx.conf \
    -v /usr/local/docker-volumes/nginx/conf.d:/etc/nginx/conf.d \
    -v /usr/local/docker-volumes/nginx/html:/usr/share/nginx/html \
    -v /usr/local/docker-volumes/nginx/log:/var/log/nginx \
    -e TZ=Asia/Shanghai \
    --restart=always \
    --network ibuy-backend_ibuy_network \
    --privileged=true -d nginx

到这里，nginx 相关配置基本完成

# 2. 部署 Github Action

此前也用过 github action 。不过是用来发布 npm 包。这次使用 github action 部署前端自动化是因为在使用 jenkins 做自动部署时，我的服务器内存太小。只有 2GB。所以在服务器内部使用 jenkins 进行前端项目的 CI/CD 时会占满内存。

所以就想着吧 CI/CD 这个步骤给移出去，这就想到了[GitHub Actions](https://docs.github.com/zh/actions)

## 2.1. Github Action 简介

- **GitHub Actions** 部署文件通常以 `xxx.yml` 命名，路径为项目根目录下 `/.github/workflows/xxx.yml` 。
- Jobs 中使用的 Action 可以去 github 的[macketplace](https://github.com/marketplace)寻找

一般的 workflow 流程如下

1.  Action
    1.  条件
    2.  分支
2.  Jobs
    1.  运行环境
        1.  步骤一
        2.  步骤二
        3.  步骤 N
        4.  发布到服务器

## 2.2. 创建 workflow

根据上面的分析，我们可以在前端项目的根目录创建如下的 **.github/workflows/web-deploy.yml**

    # 当前工作流的名称
    name: web-deploy
    on:
      push: # 什么时候触发
        branches:
          - main # 哪个分支

    jobs: # 构建的任务，一个工作流有多个构建任务，
      build-and-deploy:
        runs-on: ubuntu-latest # 在什么服务器上面执行这些任务，这里使用最新版本的ubuntu

        steps: # 构建任务的步骤，一个任务可分为多个步骤
          # 切换分支
          - name: Checkout
            uses: actions/checkout@v4
          # 步骤2 给当前服务器安装node
          - name: use node
            uses: actions/setup-node@v4.2.0
            with:
              node-version: 20
              cache: 'yarn'
          # 步骤3 下载项目依赖
          - name: install
            # --production只会安装dependencies的依赖，
            # 如果你构建时依赖devDependencies的包, 请谨慎使用该优化项
            run: yarn install --production --no-progress
          # 步骤4 打包node项目
          - name: build
            run: yarn build
          # 步骤5 部署项目到服务器
          - name: ssh deploy
            uses: easingthemes/ssh-deploy@v5.1.0
            with:
              # Private key part of an SSH key pair
              SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
              # Remote host
              REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
              # Remote user
              REMOTE_USER: ${{ secrets.REMOTE_USER }}
              # Source directory, path relative to `$GITHUB_WORKSPACE` root, eg: `dist/`
              SOURCE: '/dist/'
              # 在执行 rsync 前, 先创建静态资源目录
              SCRIPT_BEFORE: |
                mkdir -p /usr/local/docker-volumes/nginx/html/dist
                rm -rf /usr/local/docker-volumes/nginx/html/dist/*
              # 静态资源目标目录
              TARGET: '/usr/local/docker-volumes/nginx/html/dist'

因为要部署到服务器端，所以要了解连接到服务器的方式，我们选择 ssh 连接，网上也用 sftp 连接连接的教程。

我们用的 Action 是[**ssh deploy**](https://github.com/marketplace/actions/ssh-deploy#configuration) \*\*\*\*，它相关的配置项可以点链接详细查看

## 2.3. 在服务器配置秘钥

- 登录我们的服务器，在 `root` 目录下输入，直接回车到底

<!---->

    ssh-keygen -m PEM -t rsa -b 4096

- 此时， `/root/.ssh/` 下生成了私钥文件 `id_dsa` 、公钥文件`id_dsa.pub` ，然后根据公钥文件生成`authorized_keys` ，

<!---->

    cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys

- 给以上三个文件分别设置权限。

<!---->

    chmod 600 ~/.ssh/id_rsa

<!---->

    chmod 600 ~/.ssh/id_rsa.pub

<!---->

    chmod 600 ~/.ssh/authorized_keys

## 2.4. 在 github 项目中设置仓库秘钥

进入到你的 github 项目中，点击顶部导航栏的**Setting。** 然后点击 **Secrets and variables -> New repository secret** 创建 workflow 中需要的三个变量，分别是

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/1659586d856641488d580b8394982d52~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639463&x-orig-sign=zGLWO7e8JhqZEnQ4weaV81KtMN8%3D)

### 2.4.1. REMOTE_HOST

你的服务器 ip

### 2.4.2. REMOTE_USER

填写 root

### 2.4.3. SSH_PRIVATE_KEY

用于连接服务器的秘钥，你需要在服务器中 `cat` 密钥，将所有内容复制到上图的 **SSH_PRIVATE_KEY** 中

    cat ~/.ssh/id_rsa

## 2.5. 提交代码，并查看仓库的 Actions

首先到前端项目中提交你的代码（要包含 workflow）。

然后再到 github 上查看对应的仓库，点击 Actions 查看对应的工作流

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/929865602f414878b21ccb5afd730c0f~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639463&x-orig-sign=tJsnbmoakcXgIdldutod33G0cZU%3D)

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/ec539490a0d84b11b8fdb84950763144~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639463&x-orig-sign=sPiyGf1q1gyClOtjmVQYjrlWCpM%3D)

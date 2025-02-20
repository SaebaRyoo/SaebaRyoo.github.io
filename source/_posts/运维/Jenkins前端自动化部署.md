---
title: 使用Docker + Jenkins + Nginx 实战前端自动化部署
date: 2025-02-20
categories:
  - 运维
tags:
  - Docker
  - Jenkins
  - Nginx
---

> 本文用于学习和记录

# 1. 前提条件

- 安装 Docker 和 Docker Compose
- 安装 Jenkins
- 拥有一个前端项目的代码库（例如 GitHub）

## 1.1. 准备一台服务器

服务器一台，请根据自己的项目选择不同配置的服务器，如果你的项目很大，内存太小，则会导致 build 失败

## 1.2. 安装 docker

看 docker 相关安装步骤

## 1.3. 安装 jdk

### 1.3.1. 检查系统是否自带 jdk

```bash
java --version
```

### 1.3.2. 如果有就删除

```bash
rpm -qa | grep -i java | xargs -n1 rpm -e --nodeps
#rpm -qa:查询所安装的所有rpm包
#grep -i:忽略大小写
#xargs -n1:表示每次只传递一个参数
#rpm -e --nodeps:强制卸载软件
```

### 1.3.3. 检查是否删除

```bash
#查看是否还在即可
rpm -qa | grep -i java
#或者查看java版本
java -version
```

### 1.3.4. 通过[wget 下载](https://link.juejin.cn/?target=https%3A%2F%2Fso.csdn.net%2Fso%2Fsearch%3Fq%3Dwget%25E4%25B8%258B%25E8%25BD%25BD%26spm%3D1001.2101.3001.7020)jdk1.8 并解压

#### 1.3.4.1. 进入 home 目录并创建 jdk 文件夹

```bash
cd /home   //进入home文件夹
mkdir jdk  //创建jdk文件夹
cd jdk     //进入jdk文件夹
```

#### 1.3.4.2. 进入 jdk 文件通过 wget 下载 jdk1.8

```bash
wget \
--no-check-certificate \
--no-cookies \
--header \
"Cookie: oraclelicense=accept-securebackup-cookie" \
http://download.oracle.com/otn-pub/java/jdk/8u131-b11/d54c1d3a095b4ff2b6607d096fa80163/jdk-8u131-linux-x64.tar.gz
```

#### 1.3.4.3. 解压安装包

```bash
tar xvf jdk-8u131-linux-x64.tar.gz
```

#### 1.3.4.4. 配置环境变量

    vim /etc/profile

然后在最后一行插入以下内容

    export JAVA_HOME=/home/jdk/jdk1.8.0_131 # 你的jdk文件路径
    export CLASSPATH=$:CLASSPATH:$JAVA_HOME/lib/
    export PATH=$PATH:$JAVA_HOME/bin

然后运行`source /etc/profile`使文件生效

#### 1.3.4.5. 查看是否安装成功

```bash
java -version
```

## 1.4. 安装 jenkins

### 1.4.1. 使用 docker 安装

#### 1.4.1.1. 拉取镜像

    docker pull jenkins/jenkins:latest

#### 1.4.1.2. 创建挂载目录

挂载目录用于存放数据

```bash
//创建目录
mkdir -p /usr/local/docker-volumes/jenkins_data

//授权权限
chmod 777 /usr/local/docker-volumes/jenkins_data
```

#### 1.4.1.3. 启动 Jenkins 容器

启动命令如下

```bash
docker run -d \
  -p 8082:8080 \  # 映射 Jenkins Web 端口
  -p 50000:50000 \  # 映射 Jenkins Agent 端口
  -v /usr/local/docker-volumes/jenkins_data:/var/jenkins_home \  # 挂载 Jenkins 数据目录
  -v /usr/bin/docker:/usr/bin/docker \  # 挂载 Docker 二进制文件
  -v /var/run/docker.sock:/var/run/docker.sock \  # 挂载 Docker 套接字
  -e TZ=Asia/Shanghai \  # 设置时区
  -u root \ # 以 root 身份进入
  --memory="2g" \  # 限制内存为 2GB
  --cpus="2" \  # 限制 CPU 为 2 核
  --restart=on-failure \  # 容器失败时自动重启
  --name myjenkins \  # 容器名称
  --health-cmd "curl -f http://localhost:8080 || exit 1" \  # 健康检查
  --health-interval=30s \  # 健康检查间隔
  --health-timeout=10s \  # 健康检查超时时间
  --health-retries=3 \  # 健康检查重试次数
  jenkins/jenkins:latest  # Jenkins 镜像
```

#### 1.4.1.4. 验证是否启动成功

    docker ps -a | grep myjenkins

然后检查 STATUS，正常如下

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/f3cff85a941448479548aa14e584ec94~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=2uSuLD6PZwrUWTrwFefkfEfGxjQ%3D)

#### 1.4.1.5. 修改插件源

Jenkins 在安装插件时，下载相关插件包特别慢，我们可以将 Jenkins 默认的插件数据源变更为国内数据源，然后重启 Jenkins

##### 1.4.1.5.1. 进入目录

以我们的例子为准，我们挂载的 volume 如下

    cd /usr/local/docker-volumes/jenkins_data/updates

##### 1.4.1.5.2. 修改 default.json 的源

    sed -i 's#http://updates.jenkins-ci.org/download/#https://mirrors.tuna.tsinghua.edu.cn/jenkins/#g' default.json
    sed -i 's#http://www.google.com/#https://www.baidu.com/#g' default.json

##### 1.4.1.5.3. 修改 hudson.model.UpdateCenter.xml 的 url

将该文件修改为如下内容

    <?xml version='1.1encoding='UTF-8'?>
    <sites>
        <site>
            <id>default</id>
            <urI>http://mirror.esuni.jp/jenkins/updates/update-center.json</url》
        </site>
    </sites>

#### 1.4.1.6. 登录 jenkins

在我们访问了 `ip:8082`后，界面会跳出来

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/c115a80eac7544b5b426989e87c6967c~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=fxYNJVbZ3tPSqAfJBkg0yUKX8pg%3D)

然后我们就可以通过以下的方式获取密码

##### 1.4.1.6.1. 查看日志

`docker logs myjenkins`，找到**Please use the following password to proceed to installation**

这句话后面的就是初始密码

##### 1.4.1.6.2. 查看文件

查看我们挂载的目录

    cd /usr/local/docker-volumes/jenkins_data/secrets

    cat initialAdminPassword

#####

#### 1.4.1.7. 安装插件

选择**安装推荐的插件**

下载完成，就可以进入 jenkins 进行操作了

#### 1.4.1.8. 插件推荐

- Locale（中文插件）
- Maven Integration（maven 构建工具）
- Publish Over SSH（远程推送工具）
- Role-based Authorization Strategy（权限管理）
- Deploy to container（自动化部署工程所需要插件，部署到容器插件）
- git parameter（用户参数化构建过程里添加 git 类型参数）

#### 1.4.1.9. 安装 node

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/30aee06e464c4a36b960cf8e38279f00~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=0f1l4bFRvA1oXaVZLiGVVjf1fHE%3D)

#### 1.4.1.10. 配置 node

我们进入`Dashboard > 系统管理 > Tools `进行如下配置

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/70fad0103df9412b85e359b262d16099~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=kLYJWX9DcsfS9QLjDgSirH%2FGYxQ%3D)

#### 1.4.1.11. 配置 github

进入`Dashboard > 系统管理 > System` 配置如下信息

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/56a2b4c7a67f4c6dab74ea3378a93cf4~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=BDMxLnlG722X0JuoZA%2FkoUmo9b8%3D)

点击添加

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/d47908b9f1e44d9f8370f846d657bb47~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=EqAKMtQ8scJziAViAVAdikbthDk%3D)我们去 github 获取秘钥填写进 secret 里面

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/e015d76dc551459885aea599531bbd2e~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=3wOXHveCgkYHP2IxA78smAm94Lo%3D)

然后点击测试，如果如第一张图的返回一样，则表示成功

点击高级![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/096566de0b4f46b1b7a5c6dd87088019~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=2tvYxOiXkoZWff%2FJz1LWc8F2fbI%3D)

将这个 url 复制到 github 仓库里面进行配置

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/1c2192804d574924a9f488c71e823f49~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=j1XgC1GyPwKg90%2B9o0Sh8R7nyNU%3D)

点击 Webhooks，在这里粘贴我们刚刚复制的 url 地址

#### 1.4.1.12. 创建一个任务

到 Dashboard 首页，点击新建任务

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/1dea6fd866f1439691e5413e4b75da02~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=UQRD1MCLA6XdiIBv6ZdPgugdxZw%3D)

输入 github 地址

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/4909f79eead04ceaa7d6bc7ff6bc51ef~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=ToZXap%2BfPVbz%2FLgDaAOV9LZUWTU%3D)

找到 **源码管理标题** 然后点击 Git, 添加 github 账号密码

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/73657bf5a7044ba4b1daf7dedfbcaed8~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=4eALj95hldA%2BspAY7gl4izZkoZY%3D)

**_后面有个指定分支，别填错。要和你 git 项目的主分支一样_**

---

触发器选择 GitHub hook trigger for GITScm polling

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/5a61e9302e7149b6b35f600cc361d8ad~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=vnxRll4Q5c4KqC%2BwXau7C5%2Bw01A%3D)

构建环境选择 node

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/35a5454b5aab4dcfb1088be81ae14713~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=2m9OJL0eny1CHHhGsBmJWXcBtjo%3D)

添加构建步骤

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/6fa38a8245954a9996b839722025001d~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=%2BaUNsKCtNn88NaRClZU7hj0Zcys%3D)

输入命令

    # 设置Node内存限制
    # export NODE_OPTIONS="--max_old_space_size=1024"

    # 配置yarn
    yarn config set registry https://registry.npm.taobao.org/
    yarn config set strict-ssl false
    yarn config set cache-folder .yarn-cache
    yarn config set network-timeout 300000

    # 清理之前的构建缓存
    rm -rf node_modules
    rm -rf .yarn-cache

    # 使用yarn安装依赖
    yarn install --production --prefer-offline --network-timeout 300000 --network-concurrency 4 --no-progress

    # 构建项目
    yarn build

    # 部署步骤
    rm -rf /home/nginx/html/*
    docker stop ibuy-admin-web || true
    docker rm ibuy-admin-web || true
    docker build -t reactginxcontainer .

    # 运行新容器时添加资源限制
    docker run \
      -p 3000:80 \
      -d \
      --name ibuy-admin-web \
      reactginxcontainer

完成后如下，然后点击保存即可

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/6a80dce2984c4327833736e20e7998a8~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgU2FlYmFSeW8=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNTg4OTkzOTYxNDA4Njg1In0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1740639296&x-orig-sign=4cPL29BGSSuv8m664fDaVY3hlPk%3D)

### 1.4.2. 给前端项目配置环境

#### 1.4.2.1. 创建 Dockerfile

首先，为前端项目创建一个 Dockerfile，用于打包前端项目：

    FROM nginx
    COPY dist/ /usr/share/nginx/html/
    COPY nginx/default.conf /etc/nginx/conf.d/default.conf

#### 1.4.2.2. 创建一个 nginx/`default.conf` 文件，用于 Nginx 配置：

    server {
        listen       80;
        server_name  localhost;
    ​
        #charset koi8-r;
        access_log  /var/log/nginx/host.access.log  main;
        error_log  /var/log/nginx/error.log  error;
    ​
        location / {
            root   /usr/share/nginx/html;
            index  index.html index.htm;
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

        # 添加API代理配置 这里是可选项，如果你是前后端分离的项目这里需要配置
        # proxy_pass就是你的后端接口地址
        location /api/ {
            proxy_pass http://127.0.0.1:8001/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

### 1.4.3. 推送代码

完成上述操作后就可以直接在本地 push 代码了

### 1.4.4. 开始构建

然后我们切换到我们的 jenkins 管理界面，到 dashboard 中选择我们创建的任务。就可以看到构建进度和状态了。到这里部署完成

# 参考

- <https://juejin.cn/post/7377643248187146251>

---
title: nginx服务器详细解析
date: 2025-03-17
categories:
  - 运维
tags:
  - Nginx
description: 本文全面介绍了Nginx服务器的核心概念和实践应用。从基础的安装配置到进阶的性能优化，详细讲解了反向代理、负载均衡、安全配置等核心功能。文章同时提供了大量实用的配置示例，适合从入门到进阶。
---

## 1. 基础篇

### 1.1 Nginx介绍

**Nginx是一款轻量级的Web服务器、反向代理服务器，是由俄罗斯的程序设计师Igor Sysoev所开发，使用C语言开发。由于其内存占用少，启动速度极快，具有高并发处理能力，在互联网项目中被广泛应用。**

#### 1.1.1 主要特点

* **内存占用少，并发能力强**
* **高度模块化的设计，具有很好的扩展性**
* **高可靠性和稳定性**
* **支持热部署，不停机更新配置和程序版本**

#### 1.1.2 核心功能

* **HTTP服务器（静态资源服务器）**
* **反向代理服务器**
* **负载均衡**
* **邮件代理服务器**
* **支持FastCGI、SSL、Virtual Host、URL Rewrite、Gzip等功能**
* **支持第三方模块扩展**

**目前，Nginx在全球网站中的市场份额超过33.5%，位居第二，仅次于Apache。其优秀的性能和丰富的功能使其成为现代Web架构中不可或缺的组件。**

### 1.2 Nginx下载安装

#### 1.2.1 版本选择

* **Mainline version：开发版，包含新功能和修复**
* **Stable version：稳定版，建议生产环境使用**
* **Legacy versions：老版本**

#### 1.2.2 安装方式

1. **包管理器安装（推荐）**

```bash
# CentOS/RHEL
yum install nginx

# Ubuntu/Debian
apt-get install nginx
```

2. **源码编译安装**

```bash
# 下载源码
wget http://nginx.org/download/nginx-1.20.1.tar.gz

# 解压
tar -zxvf nginx-1.20.1.tar.gz

# 配置、编译、安装
./configure
make
make install
```

3. **Docker容器化部署（推荐生产环境）**

```bash
# 拉取nginx镜像
docker pull nginx

# 创建挂载目录
mkdir -p /usr/local/docker-volumes/nginx/{conf,log,html,cert}

# 运行临时容器并复制配置
docker run --name nginx -d -p 80:80 nginx
docker cp nginx:/etc/nginx/nginx.conf /usr/local/docker-volumes/nginx/
docker cp nginx:/etc/nginx/conf.d /usr/local/docker-volumes/nginx/
docker cp nginx:/usr/share/nginx/html /usr/local/docker-volumes/nginx/
docker rm -f nginx

# 启动正式容器
docker run --name nginx -m 200m -p 80:80 -p 443:443 \
-v /usr/local/docker-volumes/nginx/nginx.conf:/etc/nginx/nginx.conf \
-v /usr/local/docker-volumes/nginx/conf.d:/etc/nginx/conf.d \
-v /usr/local/docker-volumes/nginx/cert:/etc/nginx/cert \
-v /usr/local/docker-volumes/nginx/html:/usr/share/nginx/html \
-v /usr/local/docker-volumes/nginx/log:/var/log/nginx \
-e TZ=Asia/Shanghai \
--restart=always \
--network host \
--privileged=true -d nginx
```

### 1.3 Nginx基本命令和配置

#### 1.3.1 常用命令

```bash
# 强制关闭Nginx，可能不保存相关信息
nginx -s stop

# 平稳关闭Nginx，保存相关信息
nginx -s quit

# 重新加载配置
nginx -s reload

# 重新打开日志文件
nginx -s reopen

# 指定配置文件
nginx -c filename

# 测试配置文件语法
nginx -t

# 显示版本信息
nginx -v

# 显示详细版本信息
nginx -V
```

#### 1.3.2 配置文件结构

**Nginx配置文件主要由以下6个部分组成：**

1. **main：用于进行nginx全局信息的配置**
2. **events：用于nginx工作模式的配置**
3. **http：用于进行http协议信息的一些配置**
4. **server：用于进行服务器访问信息的配置**
5. **location：用于进行访问路由的配置**
6. **upstream：用于进行负载均衡的配置**
   整体结构如下：

```nginx
# 全局配置块：影响nginx全局的配置
main {
    worker_processes 4;    # 工作进程数，通常设置为CPU核心数
    worker_connections 1024;    # 每个工作进程的最大连接数
}

# 事件块：配置影响nginx服务器或与用户的网络连接
events {
    use epoll;    # 事件驱动模型，Linux系统推荐使用epoll
    worker_connections 1024;    # 每个工作进程的最大连接数
}

# HTTP块：配置代理、缓存、日志等绝大多数功能
http {
    # 基础配置
    include mime.types;    # 文件扩展名与文件类型映射表
    default_type application/octet-stream;    # 默认文件类型
    
    # 服务器块：配置虚拟主机的相关参数
    server {
        listen 80;    # 监听端口
        server_name example.com;    # 服务器名称
        
        # location块：配置请求的路由和页面处理
        location / {
            root /usr/share/nginx/html;    # 根目录
            index index.html;    # 默认页面
        }
        
        location /api/ {
            proxy_pass http://backend;    # 反向代理配置
        }
    }
    
        # upstream块：配置负载均衡服务器组
    upstream backend {
        server 127.0.0.1:8001 weight=3;    # 权重为3
        server 127.0.0.1:8002 weight=2;    # 权重为2
    }
}
```

#### 1.3.3 Location匹配规则

```nginx
location [ = | ~ | ~* | ^~ ] url {
    # 配置内容
}
```

**匹配修饰符说明：**

* ​=：精确匹配，要求请求的URL与配置的URL完全相同
  ​
* ​​^\~：前缀匹配，不检查正则表达式**
  ​
* ​\~：区分大小写的正则匹配**
  ​
* ​~：不区分大小写的正则匹配
  ​
* ​/：通用匹配，所有请求都会匹配到
  ​

**匹配优先级（从高到低）：**

1. = 精确匹配
2. ​^~ 前缀匹配
3. ​~ 和 **~正则匹配**
4. / 通用匹配

**配置示例：**

```nginx
# 精确匹配
location = /api {
    # 只匹配 /api 请求
}

# 前缀匹配
location ^~ /static/ {
    # 匹配所有以 /static/ 开头的请求
    root /usr/share/nginx/html;
}

# 正则匹配（区分大小写）
location ~ \.(gif|jpg|png)$ {
    # 匹配以 .gif、.jpg、.png 结尾的请求
}

# 正则匹配（不区分大小写）
location ~* \.(js|css)$ {
    # 匹配以 .js、.css 结尾的请求
}

# 通用匹配
location / {
    # 匹配所有请求
    root /usr/share/nginx/html;
    index index.html;
}
```

**注意事项：**

1. **多个location配置的情况下，匹配顺序优先级很重要**
2. ​**正则表达式中如果包含字符**​`^~`，不要误认为是前缀匹配
3. **如果正则表达式与前缀字符串都可以匹配，按照优先级采用第一个匹配的规则**
   root：用于指定访问根目录时，访问虚拟主机的web目录
   index：在不指定访问具体资源时，默认展示的资源文件列表

### 1.4 Nginx核心功能与实际应用

#### 1.4.1 静态资源服务

**Nginx作为静态资源服务器的性能远优于Tomcat等应用服务器。它可以高效处理如HTML、CSS、JavaScript、图片、视频等静态资源。**

**配置示例：**

```nginx
server {
    listen 80;                    # 监听80端口
    server_name example.com;       # 服务器域名
    charset utf-8;                # 设置编码
    
    # 静态文件配置
    location / {
        root /usr/share/nginx/html;   # 静态文件根目录
        index index.html index.htm;    # 默认首页
        expires 30d;                   # 静态文件缓存30天
        add_header Cache-Control "public, no-transform";
    }
    
    # 针对不同类型文件的处理
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        root /usr/share/nginx/html;     # 媒体文件目录
        expires 7d;                     # 缓存7天
        access_log off;                 # 关闭访问日志
    }
}
```

#### 1.4.2 反向代理

**反向代理就是隐藏真实的服务器地址，保护真实的服务器，用户在访问时访问的是代理服务器。**

**nginx 中常见的反向代理指令有两个：proxy\_pass 和 fastcgi\_pass，前者使用标准的 HTTP 协议转发，后者使用 FastCGI 协议转发。这里我们以 proxy\_pass 为例来做介绍。**

**proxy\_pass 有两种配置写法：**

1. **直接指向要代理的地址，可以是一台具体的主机（ip），也可以是一个具体的网址 **

```nginx
# 简单反向代理
server {
    listen 80;
    server_name example.com;
    
    # 代理到单一服务器
    location /api/ {
        proxy_pass http://backend:8080/;    # 后端服务地址
        
        # 设置代理请求头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

2. **可以搭配负载均衡指向一组服务器（参考负载均衡）**

```nginx
# 负载均衡反向代理
upstream backend_servers {
    server 192.168.1.10:8080 weight=3;    # 权重为3
    server 192.168.1.11:8080 weight=2;    # 权重为2
    keepalive 32;                         # 保持连接数
}

server {
    listen 80;
    server_name example.com;
    
    location /api/ {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;            # 使用HTTP/1.1
        proxy_set_header Connection "";    # 启用keepalive
    }
}
```

**代理配置说明：**

1. ​**proxy_pass**：指定后端服务器地址
2. ​**proxy_set_header**：设置代理请求头信息
3. ​**proxy_connect_timeout**：与后端服务器连接超时时间
4. ​**proxy_send_timeout**：发送请求给后端服务器超时时间
5. ​**proxy_read_timeout**：从后端服务器读取响应超时时间

#### 1.4.3 负载均衡

**负载均衡是Nginx的核心功能之一，负载均衡是解决高并发、海量数据问题的常用手段。Nginx提供了多种负载均衡策略，通过反向代理实现请求分发，解决单点服务器性能瓶颈问题,可以根据实际需求选择合适的方案。**

##### 1.4.3.1 基础配置

```nginx
# 定义后端服务器组
upstream backend {
    server 192.168.1.10:8080 weight=3;    # 权重为3
    server 192.168.1.11:8080 weight=2;    # 权重为2
}

server {
    listen 80;
    server_name example.com;
    
    location / {
        proxy_pass http://backend;    # 代理到服务器组
    }
}
```

##### 1.4.3.2 负载均衡策略

1. **轮询（默认）**

**默认方式，按时间顺序逐一分配到不同的后端服务器**

```nginx
upstream backend {
    server 192.168.1.10:8080;    # 轮询方式平均分配请求
    server 192.168.1.11:8080;
}
```

2. **加权轮询**

**weight值越大，分配到的访问机率越高**

```nginx
upstream backend {
    server 192.168.1.10:8080 weight=3;    # 访问比例为3
    server 192.168.1.11:8080 weight=2;    # 访问比例为2
}
```

3. **IP哈希**

**根据客户端IP分配，可用于会话保持**

```nginx
upstream backend {
    ip_hash;    # 启用IP哈希
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
}
```

4. **最少连接**

**优先分配给连接数最少的服务器**

```nginx
upstream backend {
    least_conn;    # 优先分配给连接数最少的服务器
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
}
```

5. **备份服务器**

**当主服务器不可用时才会启用的备份服务器**

```nginx
upstream backend {
    server 192.168.1.10:8080;            # 主服务器
    server 192.168.1.11:8080 backup;    # 备份服务器
}
```

**高级配置参数：**

```nginx
upstream backend {
    server 192.168.1.10:8080 weight=3 max_fails=3 fail_timeout=30s;    # 健康检查
    server 192.168.1.11:8080 weight=2 max_conns=1000;                  # 连接数限制
    keepalive 32;    # 保持连接数
}
```

**参数说明：**

* ​**max_fails**：允许请求失败的次数
* ​**fail_timeout**：经过max_fails失败后，服务暂停的时间
* ​**max_conns**：最大并发连接数
* ​**keepalive**：保持的空闲连接数

#### 1.4.4 限流配置

**Nginx限流是限制用户请求速度的重要机制，用于防止服务器过载。Nginx的限流基于漏桶算法实现，主要包括以下三种：**

##### 1.4.4.1 正常限制访问频率

```nginx
# 限制每个IP每秒只能发送1个请求
limit_req_zone $binary_remote_addr zone=one:10m rate=1r/s;

server {
    location /api/ {
        limit_req zone=one;
        proxy_pass http://backend;
    }
}
```

##### 1.4.4.2 突发限制访问频率

```nginx
# 允许突发流量，但超过设定值后排队处理
limit_req_zone $binary_remote_addr zone=two:10m rate=1r/s;

server {
    location /api/ {
        limit_req zone=two burst=5 nodelay;
        proxy_pass http://backend;
    }
}
```

##### 1.4.4.3 限制并发连接数

```nginx
# 限制每个IP最多保持3个并发连接
limit_conn_zone $binary_remote_addr zone=three:10m;

server {
    location /download/ {
        limit_conn three 3;
        proxy_pass http://backend;
    }
}
```

## 2. 进阶篇

### 2.1 性能优化

#### 2.1.1 Gzip压缩

以下配置需要添加在 **http 块**中，用于全局启用和配置Gzip压缩：

```nginx
# 启用Gzip压缩 - http块配置
gzip on;                           # 启用Gzip压缩功能
gzip_min_length 1k;                # 小于1k的文件不压缩，避免压缩很小的文件
gzip_comp_level 6;                 # 压缩级别1-9，级别越高压缩率越大但CPU消耗也越高
gzip_types text/plain text/css text/javascript application/json application/javascript application/xml;    # 指定需要压缩的MIME类型
gzip_vary on;                      # 添加Vary: Accept-Encoding响应头，用于CDN缓存
gzip_proxied any;                  # 对所有代理请求进行压缩
```

#### 2.1.2 缓存配置

以下配置需要添加在 **server 块**中的 **location 块**内，用于配置静态资源的浏览器缓存：

```nginx
# 静态资源缓存 - server块中的location配置
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;                    # 设置浏览器缓存过期时间为30天
    add_header Cache-Control "public, no-transform";    # 允许公共缓存，禁止转换
    access_log off;                # 关闭访问日志以提高性能
}
```

#### 2.1.4 连接优化

以下配置需要添加在 **http 块**中，用于优化客户端连接参数：

```nginx
# 连接超时设置 - http块配置
keepalive_timeout 65;              # 保持长连接的超时时间，单位秒
keepalive_requests 100;            # 单个长连接最大请求数
client_body_timeout 10;            # 读取请求体的超时时间，单位秒
client_header_timeout 10;          # 读取请求头的超时时间，单位秒
send_timeout 10;                   # 向客户端发送响应的超时时间，单位秒
```

### 2.2 HTTPS和HTTP/2配置

#### 2.2.1 基础HTTPS配置

以下配置需要添加在 **http 块**中，包含两个 **server 块**配置，用于实现HTTP到HTTPS的重定向和HTTPS服务器的安全配置：

```nginx
# HTTP重定向到HTTPS - http块中的第一个server配置
server {
    listen 80;                    # 监听80端口
    server_name example.com;       # 域名配置
    return 301 https://$server_name$request_uri;    # 将所有HTTP请求永久重定向到HTTPS
}

# HTTPS服务器配置 - http块中的第二个server配置
server {
    listen 443 ssl http2;         # 监听443端口并启用SSL和HTTP/2
    server_name example.com;       # 域名配置
    
    # SSL证书配置 - 在server块中配置SSL证书路径
    ssl_certificate /etc/nginx/cert/example.com.pem;        # SSL证书公钥
    ssl_certificate_key /etc/nginx/cert/example.com.key;    # SSL证书私钥
    
    # SSL协议和加密套件配置 - 增强HTTPS安全性
    ssl_protocols TLSv1.2 TLSv1.4;    # 只允许TLS 1.2和1.4，禁用不安全的协议
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;    # 配置加密算法
    ssl_prefer_server_ciphers on;     # 优先使用服务器的加密套件配置
    
    # SSL会话缓存 - 优化SSL握手性能
    ssl_session_cache shared:SSL:10m;    # 配置10MB的共享会话缓存
    ssl_session_timeout 10m;            # 设置SSL会话缓存超时时间
    
    # HSTS配置 - 强制客户端使用HTTPS
    add_header Strict-Transport-Security "max-age=31536000";    # 启用HSTS，有效期一年
}
```

#### 2.2.2 HTTP/2优化

以下配置需要添加在 **http 块**或 **server 块**中，用于优化HTTP/2性能：

```nginx
# HTTP/2特定优化 - http块或server块配置
http2_push_preload on;              # 启用服务器推送，支持preload资源预加载
http2_max_concurrent_streams 128;    # 限制每个连接的最大并发流数量
http2_idle_timeout 3m;              # 设置空闲连接的超时时间为3分钟
```

### 2.3 安全加固

#### 2.3.1 DDoS防护

以下配置包含多个层次的DDoS防护措施：

```nginx
# IP连接限制 - http块配置
limit_conn_zone $binary_remote_addr zone=addr:10m;    # 在http块中定义共享内存区，用于存储IP连接计数
limit_conn addr 100;                                  # 在http块或server块中限制每个IP的并发连接数

# 请求频率限制 - http块和location块配置
limit_req_zone $binary_remote_addr zone=req_limit:10m rate=10r/s;    # 在http块中定义请求限制区，限制每秒请求数
location / {
    limit_req zone=req_limit burst=20 nodelay;    # 在location块中配置请求限制，允许短时突发20个请求
}

# TCP洪水攻击防护 - server块配置
server {
    listen 80 backlog=65535;    # 设置等待连接队列大小，防止TCP SYN洪水攻击
    listen 443 ssl http2 backlog=65535;    # SSL端口同样设置较大的等待队列
}
```

#### 2.3.2 访问控制

以下配置展示了多种访问控制方式，可以添加在 **server 块**中：

```nginx
# 禁止特定User-Agent - server块配置
if ($http_user_agent ~* (Scrapy|Curl|WebBench)) {
    return 403;    # 检测到爬虫等工具时返回禁止访问
}

# IP访问控制 - server块中的location配置
location /admin/ {
    allow 192.168.1.0/24;    # 允许特定IP段访问管理界面
    deny all;                # 禁止其他所有IP访问
}

# 防盗链配置 - server块中的location配置
location ~* \.(gif|jpg|jpeg|png|bmp|swf)$ {
    valid_referers none blocked server_names *.example.com;    # 设置允许的来源域名
    if ($invalid_referer) {
        return 403;    # 对于非法引用的请求返回禁止访问
    }
}
```

### 2.4 日志管理

#### 2.4.1 访问日志

以下配置需要添加在 **http 块**中，用于定义日志格式和配置访问日志：

```nginx
# 日志配置 - http块配置
http {
    # 定义主日志格式，包含客户端IP、访问时间、请求信息等
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    # 配置访问日志
    access_log /var/log/nginx/access.log main buffer=32k flush=5s;    # 启用主日志格式，使用32k缓冲，每5秒刷新
    access_log /var/log/nginx/access_json.log json buffer=32k;        # 启用JSON格式日志，便于日志分析
}
```

#### 2.4.2 错误日志

以下配置可以添加在 **main 块**、**http 块**、**server 块**或 **location 块**中，用于配置错误日志：

```nginx
# 错误日志配置 - 可在main、http、server或location块中配置
error_log /var/log/nginx/error.log warn;    # 设置错误日志级别为warn

# 可选的错误日志级别（从详细到简略）
# error_log /var/log/nginx/error.log debug;  # 调试级别：输出所有调试信息
# error_log /var/log/nginx/error.log info;   # 信息级别：输出有用的信息
# error_log /var/log/nginx/error.log notice; # 通知级别：输出普通但重要的信息
# error_log /var/log/nginx/error.log warn;   # 警告级别：输出警告信息
# error_log /var/log/nginx/error.log error;  # 错误级别：输出错误信息
# error_log /var/log/nginx/error.log crit;   # 严重错误级别：输出严重错误信息
```

#### 2.4.3 日志轮转

```nginx
# 日志轮转配置（logrotate）
/var/log/nginx/*.log {
    daily                   # 每天轮转
    missingok               # 忽略丢失的日志文件
    rotate 52               # 保留52个备份
    compress                # 压缩轮转后的日志
    delaycompress           # 延迟压缩到下一次轮转
    notifempty              # 空文件不轮转
    create 640 nginx adm    # 创建新日志文件的权限和所有者
    sharedscripts          # 所有日志共用一个脚本
    postrotate
        # 重新打开日志文件
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

### 2.5 监控和调试

#### 2.5.1 状态监控

以下配置需要添加在 **server 块**中的 **location 块**内，用于配置Nginx状态监控页面：

```nginx
# 状态监控配置 - server块中的location配置
location /nginx_status {
    stub_status on;           # 启用状态页，显示连接数等统计信息
    access_log off;           # 关闭访问日志，减少磁盘IO
    allow 127.0.0.1;          # 只允许本地IP访问，提高安全性
    deny all;                 # 拒绝其他所有IP访问
}
```

#### 2.5.2 调试配置

以下配置包含两部分：
1. 调试日志配置（可添加在 **main 块**、**http 块**、**server 块**或 **location 块**中）
2. 调试信息配置（需要添加在 **server 块**中的 **location 块**内）

```nginx
# 调试日志配置 - 可在main、http、server或location块中配置
error_log /var/log/nginx/debug.log debug;    # 启用调试级别的日志记录

# 调试信息配置 - server块中的location配置
location /debug/ {
    add_header X-Debug-Message $request_uri;    # 在响应头中添加当前请求的URI
    add_header X-Server-Name $hostname;         # 在响应头中添加服务器主机名
    add_header X-Request-ID $request_id;        # 在响应头中添加唯一请求ID
}
```

## 3. 最佳实践

### 3.1 性能优化建议

1. **合理使用缓存**

以下配置需要添加在 **http 块**中，用于优化文件缓存：

```nginx
# 文件缓存配置 - http块配置
open_file_cache max=1000 inactive=20s;    # 最多缓存1000个文件，20秒内未被访问则清除
open_file_cache_valid 30s;                # 每30秒检查一次缓存的有效性
open_file_cache_min_uses 2;               # 文件被访问2次后才会被缓存
open_file_cache_errors on;                # 缓存文件找不到等错误信息
```

2. **优化工作进程**

以下配置需要添加在 **main 块**中，用于优化Nginx工作进程：

```nginx
# 工作进程配置 - main块配置
worker_processes auto;           # 自动设置工作进程数为CPU核心数
worker_cpu_affinity auto;        # 自动绑定工作进程到CPU核心

# 进程优先级配置
worker_priority -5;              # 提高工作进程优先级（-20到19，值越小优先级越高）
```

3. **优化事件模型**

以下配置需要添加在 **events 块**中，用于优化连接处理：

```nginx
# 事件模型配置 - events块配置
events {
    use epoll;                # 使用epoll事件模型，提高并发处理能力
    worker_connections 10240;  # 每个工作进程同时处理的最大连接数
    multi_accept on;           # 允许同时接受多个新连接
}
```

### 3.2 安全最佳实践

1. **隐藏版本信息**

以下配置需要添加在 **http 块**中，用于隐藏Nginx版本信息：

```nginx
# 版本信息配置 - http块配置
server_tokens off;    # 在错误页面和响应头中隐藏Nginx版本号
```

2. **配置安全响应头**

以下配置需要添加在 **http 块**或 **server 块**中，用于增强安全性：

```nginx
# 安全响应头配置 - http块或server块配置
add_header X-Frame-Options "SAMEORIGIN";          # 防止网站被嵌入恶意iframe中
add_header X-XSS-Protection "1; mode=block";      # 启用浏览器XSS防护
add_header X-Content-Type-Options "nosniff";      # 禁止浏览器猜测内容类型
add_header Content-Security-Policy "default-src 'self'";  # 限制资源只能从本站加载
```

3. **限制上传文件大小**

以下配置需要添加在 **http 块**、**server 块**或 **location 块**中，用于限制上传文件大小：

```nginx
# 上传限制配置 - http块、server块或location块配置
client_max_body_size 10m;    # 限制客户端请求体大小为10MB
```

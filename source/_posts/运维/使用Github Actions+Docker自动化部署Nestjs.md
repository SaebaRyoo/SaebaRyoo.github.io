---
title: 使用Github Actions+Docker自动化部署Nestjs
date: 2025-02-23
categories:
  - 运维
tags:
  - Docker
  - Git
  - Nestjs
---

# 1. **如何安全部署**

**在下面的部署工作中，我们会将 Linux 服务器的 SSH 私钥配置到 GitHub 的 Secrets 中，虽然是一种常见的自动化部署方式，但需要谨慎处理以确保安全性。**

## 1.1. **优点**

- ​**自动化部署**​**：通过 GitHub Actions 实现自动化部署，减少人工操作，提高效率。**

## 1.2. **潜在风险**

- ​**私钥泄露**​**：如果 GitHub 账号被入侵，攻击者可能获取到 Secrets 中的 SSH 私钥，从而访问你的服务器。**
- ​**私钥滥用**​**：如果私钥被用于多个服务器，一旦泄露，所有相关服务器都会受到影响。**

## 1.3. **安全方案**

### 1.3.1. **创建专用用户：**

**在服务器上创建一个专门用于部署的用户，并限制其权限。**

#### 1.3.1.1. **创建部署账户**

**Linux 系统中创建用户账户的最基本方法是使用 useradd 命令**

```bash
useradd -d /home/deploy deploy
```

**上面的命令等同于下面的命令，不过他简化了为 deploy 用户指定"家目录"的操作**

```bash
useradd deploy
sudo chown deploy:deploy /home/deploy
sudo chmod 700 /home/deploy
```

#### 1.3.1.2. **设置密码**

**新用户创建后，需要为其设置密码，我们可以使用以下命令修改 deploy 用户的密码**

```bash
passwd deploy
```

#### 1.3.1.3. **为用户分配用户组**

**我们创建了 deploy 用户后，它默认就有一个 deploy 组，我们可以通过**`<span class="ne-text">groups deploy</span>`来查看这个用户的组。如果想要查看全部的组就使用`<span class="ne-text">cat /etc/group</span>`。

**因为我们后续会使用 docker 部署，所以为了**确保 `<span class="ne-text">deploy</span>` 用户有权限访问 Docker 守护进程。我们可以使用以下命令

```bash
sudo usermod -aG docker deploy
```

#### 1.3.1.4. **删除和冻结用户账户**

**在某些情况下，可能需要删除或冻结用户。这时候就需要使用 userdel 命令，或者 passwd**

```bash
# 删除用户以及他的 家目录
userdel deploy

# 冻结用户账户，使其无法登录
passwd -l deploy
```

### 1.3.2. **限制私钥权限（暂未使用）**

​**限制私钥权限**​**：为 GitHub Actions 使用的 SSH 私钥配置最小权限。例如：**

- **仅允许该私钥访问特定的目录（如部署目录）。**
- **禁止该私钥执行危险操作（如 **`<span class="ne-text">sudo</span>` 或修改系统文件）。

# 2. **给 nestjs 项目增加 docker 配置**

## 2.1. **创建 Dockerfile 镜像文件**

```dockerfile
# 使用官方 Node.js 运行时作为基础镜像
FROM node:20.18.0-alpine AS builder

# 设置工作目录为 /ibuy-backend
WORKDIR /ibuy-backend

# 复制 package.json 和 yarn.lock 文件
COPY package*.json yarn.lock ./
#
## 安装依赖（使用 yarn 代替 npm）
RUN yarn install

# 复制项目的其他文件
COPY . .
#
## 使用 yarn 进行构建
RUN yarn build

# 暴露应用的端口
EXPOSE 8001

# 设置启动命令
CMD ["node", "dist/main.js"]
```

## 2.2. **创建 docker-compose.yml 部署文件**

**这个**`<span class="ne-text">environment</span>`是按照你.env 文件中的变量来配置的，`<span class="ne-text">.env</span>`后面会讲到

```yaml
version: "2.5"

services:
  # NestJS service
  backend-nestjs:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ibuy-backend-nestjs
    # 设置docker 网络，因为前端项目也是通过docker容器单独部署的
    networks:
      - ibuy_network
    ports:
      - "8001:8001"
    volumes:
      - ~/data/docker-volumes/ibuy-backend/logs:/ibuy-backend/logs
    environment:
      - NODE_ENV=production
      - POSTGRES_HOST=${POSTGRES_HOST}
      - POSTGRES_PORT=${POSTGRES_PORT}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DATABASE}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - MINIO_HOST=${MINIO_HOST}
      - MINIO_PORT=${MINIO_PORT}
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY} # Access key for MinIO
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY} # Secret key for MinIO
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=${JWT_EXPIRES_IN}
      - ES_NODE=${ES_NODE}
      - ELASTIC_USERNAME=${ELASTIC_USERNAME}
      - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
    restart: always

networks:
  ibuy_network:
    driver: bridge
```

# 3. **配置 Github Workflow**

## 3.1. **Github Action 简介**

- **GitHub Actions** 部署文件通常以 `<span class="ne-text">xxx.yml</span>` 命名，路径为项目根目录下 `<span class="ne-text">/.github/workflows/xxx.yml</span>` 。
- **Jobs 中使用的 Action 可以去 github 的**[macketplace](https://github.com/marketplace)寻找

**一般的 workflow 流程如下**

1. **Action**

   1. **条件**

2. **分支**
3. **Jobs**

   1. **运行环境**

4. **步骤一**
5. **步骤二**
6. **步骤 N**
7. **发布到服务器**

## 3.2. **创建 workflow**

**根据上面的分析，我们可以在前端项目的根目录创建如下的 \*\***.github/workflows/deploy.yml\*\*

```yaml
name: Docker Image CI/CD

on:
  push:
    branches:
      - main # 当 main 分支有推送时触发

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      # 切换分支
      - name: Checkout
        uses: actions/checkout@v4

      # 部署到服务器
      - name: Deploy to server
        uses: easingthemes/ssh-deploy@v5.1.0
        with:
          # 服务器的主机地址
          REMOTE_HOST: ${{ secrets.SERVER_HOST }}
          # 服务器用户名
          REMOTE_USER: ${{ secrets.SERVER_USERNAME }}
          # 服务器私钥
          SSH_PRIVATE_KEY: ${{ secrets.SERVER_PRIVATE_KEY }}
          # 本地源目录
          SOURCE: "."
          #          EXCLUDE: "/node_modules/"
          # 部署前执行的脚本
          SCRIPT_BEFORE: |
            # 创建工作目录
            mkdir -p ~/work/ibuy-backend
            # 删除构建目录
            rm -rf ~/work/ibuy-backend/dist
          # 目标目录（将github上已经提交的内容全部上传到服务器对应为止）
          TARGET: "~/work/ibuy-backend"
          # 部署后执行的脚本
          SCRIPT_AFTER: |
            # 进入工作目录
            cd ~/work/ibuy-backend

            # 构建并启动 Docker 容器
            docker-compose up --build -d
```

因为要部署到服务器端，所以要了解连接到服务器的方式，我们选择 ssh 连接，网上也用 sftp 连接连接的教程。

​**我们用的 Action 是**[**ssh deploy**](https://github.com/marketplace/actions/ssh-deploy#configuration) **，它相关的配置项可以点链接详细查看**

​

## 3.3. **在服务器配置秘钥**

- **使用**`<span class="ne-text">deploy</span>`用户登录我们的服务器，在 `<span class="ne-text">root</span>` 目录下输入，直接回车到底

```yaml
ssh-keygen -m PEM -t rsa -b 4096
```

- **此时， **`<span class="ne-text">~/.ssh/</span>` 下生成了私钥文件 `<span class="ne-text">id_dsa</span>` 、公钥文件`<span class="ne-text">id_dsa.pub</span>` ，然后根据公钥文件生成`<span class="ne-text">authorized_keys</span>` ，

```bash
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```

- **给以上三个文件分别设置权限。**

```c
chmod 600 ~/.ssh/id_rsa
```

```c
chmod 600 ~/.ssh/id_rsa.pub
```

```c
chmod 600 ~/.ssh/authorized_keys
```

## 3.4. **在 github 项目中设置仓库秘钥**

**进入到你的 github 项目中，点击顶部导航栏的\*\***​Setting。​**然后点击 **Secrets and variables -> New repository secret\*\* 创建 workflow 中需要的三个变量，分别是

![](https://cdn.nlark.com/yuque/0/2025/png/411665/1739775808823-a0836f96-220a-408d-a58d-0abd591a7ece.png)

### 3.4.1. **REMOTE_HOST**

**你的服务器 ip**

### 3.4.2. **REMOTE_USER**

**填写 **`<span class="ne-text">deploy</span>`用户

### 3.4.3. **SSH_PRIVATE_KEY**

**用于连接服务器的秘钥，你需要在**服务器中 `<span class="ne-text">cat</span>` 密钥，将所有内容复制到上图的 **SSH_PRIVATE_KEY** 中

```c
cat ~/.ssh/id_rsa
```

# 4. **服务器设置**

**使用**`<span class="ne-text">deploy</span>`用户登录服务器，然后输入`<span class="ne-text">pwd</span>`。我们会发现当前用户的工作目就是我们设置的家目录`<span class="ne-text">/home/deploy</span>`

![](https://cdn.nlark.com/yuque/0/2025/png/411665/1740295209014-52f4acdc-f863-46c2-ba88-9add391f2d4f.png)

**然后我们创建 nestjs 的工作目录**

```yaml
mkdir -p ~/work/ibuy-backend
```

**这里的**`<span class="ne-text">"~"</span>`指的就是我们的家目录 `<span class="ne-text">/home/deploy</span>`。

**因为我们的.env 文件不能外露到 github 上，所需要使用**`<span class="ne-text">vim .env</span>`手动创建以下我们的`<span class="ne-text">.env</span>`文件，将下面的内容拷贝到`<span class="ne-text">.env</span>`中

**注意：这里要按照你自己的环境变量配置**

```plain
JWT_SECRET=xxx
JWT_EXPIRES_IN=10d


#postgre
POSTGRES_HOST=your-host
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=xxx
POSTGRES_DATABASE=mall


# redis
REDIS_HOST=your-host
REDIS_PORT=6379
REDIS_PASSWORD=xxx


# minio
MINIO_HOST=your-host
MINIO_PORT=9000
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=xxx
MINIO_ACCESS_KEY=xxx
MINIO_SECRET_KEY=xxx

# elasticsearch dev enviroment
ES_NODE=http://your-host:9200
ELASTIC_USERNAME=elastic
ELASTIC_PASSWORD=xxx
ES_PORT=9200
```

# 5. **其他方案问题**

**在使用 github action 部署时发现 nestjs 的项目在 build 时不会将 node_modules 打包进去，这就导致需要将所有的文件拉到服务器上再执行构建任务。正好有一篇**[文章](https://juejin.cn/post/7065724860688760862#heading-2)也讲到了这个问题。它是自己创建了一个`<span class="ne-text">webpack.config.js</span>`文件，忽略掉`<span class="ne-text">externals</span>`以及一些 nest 提供的插件。但是这有一个很大的隐患：只适用于简单的纯 js 项目，如果遇到了依赖库里有动态加载，二进制依赖，使用了 fs 读写文件，这几种情况打包成一个文件会出问题

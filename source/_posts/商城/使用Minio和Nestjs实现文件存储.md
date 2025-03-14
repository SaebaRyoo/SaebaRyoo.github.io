---
title: 使用Minio和Nestjs实现文件存储
date: 2025-03-03
categories:
  - 商城
tags:
  - Nest.js
  - Docker
---

> 本文详细介绍了如何在商城项目中使用 MinIO 和 Nest.js 实现文件存储功能。文章分为四个主要部分：
>
> 1. 使用 Docker 部署 MinIO 服务
> 2. MinIO 的基础配置（创建 bucket 和 AccessKey）
> 3. 配置 MinIO 访问策略，实现文件的公开访问
> 4. 在 Nest.js 中集成 MinIO，实现文件上传、下载、删除等功能
>
> 通过本文的实践，你将学会如何搭建一个完整的文件存储服务，适用于电商等需要文件存储的业务场景。

# 1. **使用 docker 安装 Minio**

## 1.1. **拉取镜像**

`<span class="ne-text">docker pull minio/minio</span>`

## 1.2. **创建数据卷并提升权限**

```typescript
mkdir -p /usr/local/minio/data /usr/local/minio/config

chmod -R 777 /usr/local/minio/data
chmod -R 777 /usr/local/minio/config
```

## 1.3. **使用 minio/minio 镜像启动容器**

```typescript
docker run \
--name minio \
-p 9000:9000  \
-p 9090:9090  \
-d \
-e "MINIO_ROOT_USER=minio" \
-e "MINIO_ROOT_PASSWORD=minio123" \
-v /usr/local/minio/data:/data \
-v /usr/local/minio/config:/root/.minio \
minio/minio server  /data --console-address ":9090" --address ":9000"
```

- **docker run：这是 Docker 命令行工具用来运行一个新容器的命令。**
- **--name minio：这个参数为容器指定了一个名称，这里名称被设置为 minio。使用名称可以更方便地管理容器。**
- **-p 9000:9000：这个参数将容器内的 9000 端口映射到宿主机的 9000 端口。MinIO 服务默认使用 9000 端口提供 API 服务。**
- **-p 9090:9090：这个参数将容器内的 9090 端口映射到宿主机的 9090 端口。这是 MinIO 的控制台（Console）端口，用于访问 MinIO 的图形用户界面。**
- **-d：这个参数告诉 Docker 以“detached”模式运行容器，即在后台运行。**
- **-e "MINIO_ROOT_USER=minio"：设置环境变量 MINIO_ROOT_USER，这是访问 MinIO 服务的用户名称，这里设置为 minio。**
- **-e "MINIO_ROOT_PASSWORD=minio123"：设置环境变量 MINIO_ROOT_PASSWORD，这是访问 MinIO 服务的用户密码，这里设置为 minio123。**
- **-v /usr/local/minio/data:/data：这个参数将宿主机的目录/usr/local/minio/data 挂载到容器的/data 目录。MinIO 会将所有数据存储在这个目录。**
- **-v /usr/local/minio/config:/root/.minio：这个参数将宿主机的目录/usr/local/minio-config 挂载到容器的/root/.minio 目录。这个目录用于存储 MinIO 的配置文件和数据。**
- **minio/minio：这是要运行的 Docker 镜像的名称，这里使用的是官方发布的 MinIO 镜像。**
- **server /data：这是传递给 MinIO 程序的命令行参数，告诉 MinIO 以服务器模式运行，并且使用/data 目录作为其数据存储位置。**
- **--console-address ":9090"：这个参数指定 MinIO 控制台服务的监听地址和端口。在这个例子中，它设置为监听所有接口上的 9090 端口。**
- **--address ":9000"：这个参数指定 MinIO API 服务的监听地址和端口。在这个例子中，它设置为监听所有接口上的 9000 端口。**

**然后就可以访问 http://localhost:9090 查看控制台**

**在使用 127.0.0.1:9090 时无法访问，应该是没有设置跨域。**

# 2. **创建 bucket 和 AccessKey**

**这个直接在很简单，直接在访问 **`<span class="ne-text">http://localhost:9090</span>`在控制台操作即可。

**注意，这里生成的 AccessKey 后续在 nestjs 中接入 minio 的 api 时会用到，所以需要记录下来**

# 3. **配置策略**

**经过上面的安装和配置，我们已经可以正常的访问 minio 了。并且我们创建了一个名为**`<span class="ne-text">mall</span>`的 bucket，用于存储商品相关的图片对象。不过，minio 的资源访问，默认是需要通过 AccessKey 或者账号密码来访问的。但是我们是一个 b2c 的商城，在后台管理系统重上传的图需要能在公网访问。

**但是默认的策略，公网无法访问。我们需要自己配置策略**

## 3.1. **进入 bucket 配置 策略**

![](https://cdn.nlark.com/yuque/0/2024/png/411665/1730862358097-b2cdf644-e332-450e-9ada-75e26882dc71.png)

**修改策略选择为\*\***Custom\*\*
![](https://cdn.nlark.com/yuque/0/2024/png/411665/1730862421791-77078017-9f00-4eab-a224-66d65e54fa3a.png)

**然后配置如下**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::<account_id>:user/<user_name>"]
      },
      "Action": ["s3:PutObject", "s3:AbortMultipartUpload", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::mall/*"]
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::<account_id>:user/<user_name>"]
      },
      "Action": ["s3:ListBucket", "s3:ListBucketMultipartUploads"],
      "Resource": ["arn:aws:s3:::mall"]
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::mall"]
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::mall/*"]
    }
  ]
}
```

## 3.2. **策略解析**

**这个策略一共有 4 个声明，主要做了以下事情**

#### 3.2.1.1. **1. 第一个声明：**

```json
{
  "Effect": "Allow",
  "Principal": {
    "AWS": ["arn:aws:iam::<account_id>:user/<user_name>"]
  },
  "Action": ["s3:PutObject", "s3:AbortMultipartUpload", "s3:DeleteObject"],
  "Resource": ["arn:aws:s3:::mall/*"]
}
```

- ​**Effect**​**: **`<span class="ne-text">Allow</span>` — 允许执行指定的操作。
- ​**Principal**​**: **`<span class="ne-text">arn:aws:iam::<account_id>:user/<user_name></span>` — 指定这个策略适用的 IAM 用户。`<span class="ne-text"><account_id></span>` 和 `<span class="ne-text"><user_name></span>` 需要替换为实际的 AWS 账户 ID 和用户名。
- ​**Action**​**: 允许的操作：**

  - `<span class="ne-text">s3:PutObject</span>` — 允许将对象（如文件）上传到桶中。
  - `<span class="ne-text">s3:AbortMultipartUpload</span>` — 允许中止一个多部分上传操作。
  - `<span class="ne-text">s3:DeleteObject</span>` — 允许删除桶中的对象。

- ​**Resource**​**: **`<span class="ne-text">arn:aws:s3:::mall/*</span>` — 这个权限作用于 `<span class="ne-text">mall</span>` 存储桶中的所有对象（即桶中的所有文件）。

​**总结**​**：该声明允许指定的 IAM 用户上传文件、删除文件，以及中止未完成的多部分上传操作，作用于 **`<span class="ne-text">mall</span>` 存储桶中的所有文件。

#### 2. 第二个声明：

```json
{
  "Effect": "Allow",
  "Principal": {
    "AWS": ["arn:aws:iam::<account_id>:user/<user_name>"]
  },
  "Action": ["s3:ListBucket", "s3:ListBucketMultipartUploads"],
  "Resource": ["arn:aws:s3:::mall"]
}
```

- ​**Effect**​**: **`<span class="ne-text">Allow</span>` — 允许执行指定的操作。
- ​**Principal**​**: **`<span class="ne-text">arn:aws:iam::<account_id>:user/<user_name></span>` — 同样是指定 IAM 用户。
- ​**Action**​**: 允许的操作：**

  - `<span class="ne-text">s3:ListBucket</span>` — 允许列出存储桶中的对象。
  - `<span class="ne-text">s3:ListBucketMultipartUploads</span>` — 允许列出正在进行的多部分上传任务。

- ​**Resource**​**: **`<span class="ne-text">arn:aws:s3:::mall</span>` — 这些操作只作用于 `<span class="ne-text">mall</span>` 存储桶本身，而不是桶中的具体文件。

​**总结**​**：该声明允许指定的 IAM 用户列出 **`<span class="ne-text">mall</span>` 存储桶中的文件，或者查看当前正在进行的多部分上传任务。

#### 3. 第三个声明：

```json
{
  "Effect": "Allow",
  "Principal": {
    "AWS": ["*"]
  },
  "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
  "Resource": ["arn:aws:s3:::mall"]
}
```

- ​**Effect**​**: **`<span class="ne-text">Allow</span>` — 允许执行指定的操作。
- ​**Principal**​**: **`<span class="ne-text">"*"</span>` — 这个策略适用于所有主体，即公开访问。
- ​**Action**​**: 允许的操作：**

  - `<span class="ne-text">s3:GetBucketLocation</span>` — 允许获取存储桶的位置。
  - `<span class="ne-text">s3:ListBucket</span>` — 允许列出存储桶中的对象。

- ​**Resource**​**: **`<span class="ne-text">arn:aws:s3:::mall</span>` — 这些操作作用于 `<span class="ne-text">mall</span>` 存储桶本身。

​**总结**​**：该声明允许所有人（公共访问）获取 **`<span class="ne-text">mall</span>` 存储桶的位置和列出桶中的文件列表（列出桶中文件的元数据）。

#### 4. 第四个声明：

```json
{
  "Effect": "Allow",
  "Principal": {
    "AWS": ["*"]
  },
  "Action": ["s3:GetObject"],
  "Resource": ["arn:aws:s3:::mall/*"]
}
```

- ​**Effect**​**: **`<span class="ne-text">Allow</span>` — 允许执行指定的操作。
- ​**Principal**​**: **`<span class="ne-text">"*"</span>` — 这个策略适用于所有主体，即公开访问。
- ​**Action**​**: 允许的操作：**

  - `<span class="ne-text">s3:GetObject</span>` — 允许获取存储桶中的对象。

- ​**Resource**​**: **`<span class="ne-text">arn:aws:s3:::mall/*</span>` — 这个权限作用于 `<span class="ne-text">mall</span>` 存储桶中的所有对象。

​**总结**​**：该声明允许任何人公开访问 **`<span class="ne-text">mall</span>` 存储桶中的所有对象（如图片、文件等）。

## 3.3. **配置匿名访问**

**进入\*\***Anonymous,\*\* **点击右上角的\*\***Add Access Rule\*\* **为 mall 添加一个**​**只读匿名策略**​**，无需验证身份。这样就可以通过 **[http://loclahost:9000/mall/file.png](http://loclahost:9000/mall/file.png) 来访问资源了![](https://cdn.nlark.com/yuque/0/2024/png/411665/1730863434678-77d86df1-2b22-483d-b50c-a2facc2b9c04.png)

# 4. **使用 nestjs 接入 minio**

**在这个 File 模块中我们需要提供**

- **文件上传**
- **下载**
- **删除**
- **获取目录结构**

**等功能。**

## 4.1. **配置说明**

**需要在环境变量中配置以下 MinIO 相关参数：**

```plain
MINIO_HOST=your-minio-host
MINIO_PORT=your-minio-port
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
```

## 4.2. **实现细节**

### 4.2.1. **1. 安装依赖**

```bash
npm install @nestjs/common @nestjs/config minio
```

### 4.2.2. **2. 模块结构**

```plain
mall-service-file/
├── file.module.ts    # 模块定义
├── file.service.ts   # 服务实现
├── file.controller.ts # 控制器
```

### 4.2.3. **3. 核心代码实现**

#### 4.2.3.1. **FileModule (file.module.ts)**

```typescript
import { Module } from "@nestjs/common";
import { FileService } from "./file.service";
import { FileController } from "./file.controller";

@Module({
  providers: [FileService],
  controllers: [FileController],
  exports: [FileService],
})
export class FileModule {}
```

​**说明**​**：**

- **导出 FileService 使其可以被其他模块使用**
- **注册 FileController 处理文件相关的 HTTP 请求**

#### 4.2.3.2. **FileService (file.service.ts)**

```typescript
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";

@Injectable()
export class FileService {
  private readonly minioClient: Minio.Client;

  constructor(private readonly configService: ConfigService) {
    // 初始化 MinIO 客户端
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get("MINIO_HOST"),
      port: parseInt(this.configService.get("MINIO_PORT")),
      useSSL: false,
      accessKey: this.configService.get("MINIO_ACCESS_KEY"),
      secretKey: this.configService.get("MINIO_SECRET_KEY"),
    });
  }

  // 文件上传实现
  async uploadFile(
    bucketName: string, // 存储桶名称
    objectName: string, // 文件名
    data: Buffer, // 文件数据
    path: string = "/" // 存储路径
  ) {
    await this.minioClient.putObject(bucketName, `${path}/${objectName}`, data);
    const HOST = this.configService.get("MINIO_HOST");
    const PORT = parseInt(this.configService.get("MINIO_PORT"));
    return {
      bucketName,
      path,
      objectName,
      imgUrl: `http://${HOST}:${PORT}/${bucketName}/${path}/${objectName}`,
    };
  }

  // 文件下载实现
  async readFileStream(
    bucketName: string, // 存储桶名称
    objectName: string, // 文件名
    path: string = "/" // 文件路径
  ) {
    try {
      const fileStream = await this.minioClient.getObject(
        bucketName,
        `${path}/${objectName}`
      );
      return await this.streamToBuffer(fileStream);
    } catch (error) {
      throw new Error("文件读取失败");
    }
  }

  // 文件删除实现
  async deleteFile(
    bucketName: string, // 存储桶名称
    objectName: string, // 文件名
    path: string = "/" // 文件路径
  ) {
    await this.minioClient.removeObject(bucketName, `${path}/${objectName}`);
    return null;
  }

  // 获取目录结构实现
  async getDirectoryStructure(
    bucketName: string // 存储桶名称
  ) {
    const objects = await this.listObjects(bucketName);
    const directories = new Set<string>();

    objects.forEach((object) => {
      const pathSegments = object.name.split("/");
      if (pathSegments.length > 1) {
        directories.add(pathSegments[0]);
      }
    });

    return Array.from(directories);
  }
}
```

​**关键实现说明**​**：**

1. **MinIO 客户端初始化**

- **通过 ConfigService 读取环境配置**
- **创建 MinIO 客户端实例，支持 SSL 配置**

2. **uploadFile 方法**

- **入参：存储桶名称、文件名、文件数据、存储路径**
- **返回：包含文件访问 URL 的对象**
- **实现：使用 putObject 上传文件，生成访问 URL**

3. **readFileStream 方法**

- **入参：存储桶名称、文件名、文件路径**
- **返回：文件数据 Buffer**
- **实现：使用 getObject 获取文件流并转换为 Buffer**

4. **deleteFile 方法**

- **入参：存储桶名称、文件名、文件路径**
- **返回：null**
- **实现：使用 removeObject 删除文件**

5. **getDirectoryStructure 方法**

- **入参：存储桶名称**
- **返回：目录名称数组**
- **实现：获取所有对象并解析路径结构**

#### 4.2.3.3. **FileController (file.controller.ts)**

```typescript
import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { FileService } from "./file.service";

@Controller("file")
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post("/upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(@UploadedFile() file: any, @Query("path") path: string) {
    return await this.fileService.uploadFile(
      "mall",
      file.originalname,
      file.buffer,
      path
    );
  }

  @Get("/download")
  async readFileStream(@Query() query: any) {
    return await this.fileService.readFileStream(
      query.bucketName,
      query.objectName,
      query.path
    );
  }

  @Delete("/delete")
  async deleteFile(@Query() query: any) {
    return await this.fileService.deleteFile(
      query.bucketName,
      query.objectName,
      query.path
    );
  }

  @Get("/list")
  async getDirectoryStructure() {
    return await this.fileService.getDirectoryStructure("mall");
  }
}
```

​**关键实现说明**​**：**

1. **文件上传接口**

- **使用 FileInterceptor 处理文件上传**
- **支持通过 query 参数指定存储路径**
- **自动处理文件名和文件数据**

2. **文件下载接口**

- **通过 query 参数接收文件信息**
- **返回文件数据流**

3. **文件删除接口**

- **通过 query 参数接收文件信息**
- **返回删除操作结果**

4. **目录列表接口**

- **无需参数**
- **返回默认存储桶的目录结构**

## 4.3. **TODO**

1. **确保 MinIO 服务器已正确配置并运行**
2. **上传文件大小可能受到限制，后续需要在配置中适当调整**
3. **需要对文件类型进行限制和验证**
4. **暂未实现错误处理和重试机制**
5. **暂未配置 MinIO 的 SSL 访问**

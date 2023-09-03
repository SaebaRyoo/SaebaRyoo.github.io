---
title: Nestjs#1.基于grpc的微服务(一)
categories:
- Nest.js
tags:
- Nest.js
- Node
---

## Why
[微服务的优缺点](https://cloud.tencent.com/developer/article/1877057)

这篇文章只是讲了比较基础的demo

## Setup

首先需要安装nestjs的命令行工具
`npm i -g @nestjs/cli`

然后使用nest命令创建一个项目
`nest new micro-service-demo`

安装微服务相关库，`yarn add -S @grpc/grpc-js @grpc/proto-loader     @nestjs/microservices`

这个时候是一个标准的项目开发模式。但是，我们开发微服务则需要将一个功能比较多的服务拆分。所以，可以通过nestjs自带的 **[Monorepo mode](https://docs.nestjs.com/cli/monorepo#monorepo-mode)** 来开发

通过`nest g app api-gateway & nest g app auth-service & nest g app order-service & nest g app product-service`来生成对应的服务

然后在`package.json`中的`scripts`中添加上对应的启动方式
```json
{
    "start:order": "nest start order-service --watch",
    "start:product": "nest start product-service --watch",
}
```

其中:

- api-gateway: 为api网关，作用是作为代理，连接各个微服务，为client提供接口
- auth: 登录以及认证
- order: 订单服务
- product: 产品服务


我们这里暂时不做复杂功能，只实现order微服务和product微服务。并在api-gateway中使用grpc的方式访问order服务，order的service再访问product微服务。


## 实现

### proto文件
在根目录创建`protos`目录，该目录用于定义proto文件，它定义程序中需要处理的结构化数据
首先是创建`order.proto`文件
```
syntax = "proto3";

package order;

service OrderService {
    rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
}

message CreateOrderRequest {
    int32 productId = 1;
    int32 quantity = 2;
    int32 userId = 3;
}

message CreateOrderResponse {
    int32 status = 1;
    repeated string error = 2;
    int32 id = 3;
}
```

然后是`product.proto`

```
syntax = "proto3";

package product;

message DecreaseStockRequest {
int32 id = 1;
int32 orderId = 2;
}

message DecreaseStockResponse {
int32 status = 1;
repeated string error = 2;
}

service ProductService {
rpc DecreaseStock(DecreaseStockRequest) returns (DecreaseStockResponse);
}
```

### 创建微服务

首先我们先安装`yarn add ts-proto`,该库用于将我们的`proto`文件转化成强类型的 **TS** 文件

然后在 `package.json`中的`scripts`中添加如下命令
```json
{
    "proto:all": "protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=./protos/pbs ./protos/**.proto --ts_proto_opt=nestJs=true --ts_proto_opt=fileSuffix=.pb --ts_proto_opt=outputIndex=true"
}
```
具体的参数意思可以参考[这里](https://github.com/stephenh/ts-proto#supported-options)



运行命令后会在`protos`中生成出一个`pbs`目录，里面包含了相关的ts文件
(TODO: 这里的后续可以通过Nestjs中的lib将这些文件单独提出到公共库中)


然后再创建`order.client.options.ts`，用于生成微服务相关的配置

```ts
import { ClientOptions, Transport } from '@nestjs/microservices';
import { ORDER_PACKAGE_NAME } from './order.pb';
import * as path from 'path';
import * as process from 'process';

export const orderClient: ClientOptions = {
    transport: Transport.GRPC,
    options: {
        package: ORDER_PACKAGE_NAME,
        protoPath: path.join(process.cwd(), './protos/pbs/index.order.proto'),
        url: 'localhost:50001',
    },
};
```

然后修改位于`order-service`目录中的`main`文件
```ts
import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module';
import { MicroserviceOptions } from '@nestjs/microservices';
import { orderClient } from '../../../protos/order.client.options';

async function bootstrap() {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrderServiceModule,
    orderClient,
    );
    await app.listen();
}
bootstrap();
```

在`order-service/order-service.module`中导入product微服务
```ts
import { Module } from '@nestjs/common';
import { OrderServiceController } from './order-service.controller';
import { OrderServiceService } from './order-service.service';
import { ClientsModule } from '@nestjs/microservices';
import { PRODUCT_SERVICE_NAME } from '../../../protos/product.pb';
import { productClient } from '../../../protos/product.client.options';

@Module({
imports: [
ClientsModule.register([
{
name: PRODUCT_SERVICE_NAME,
...productClient,
},
]),
],
controllers: [OrderServiceController],
providers: [OrderServiceService],
})
export class OrderServiceModule {}
```

修改`order-service/order-service.controller`文件
```ts
import { Controller, Get } from '@nestjs/common';
import { OrderServiceService } from './order-service.service';
import {
CreateOrderResponse,
ORDER_SERVICE_NAME,
} from '../../../protos/order.pb';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
export class OrderServiceController {
constructor(private readonly orderServiceService: OrderServiceService) {}

@GrpcMethod(ORDER_SERVICE_NAME)
createOrder(): Promise<CreateOrderResponse> {
return this.orderServiceService.createOrder('1');
}
}
```

修改`order-service/order-service.service`文件

```ts
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CreateOrderResponse } from '../../../protos/order.pb';
import {
PRODUCT_SERVICE_NAME,
ProductServiceClient,
} from '../../../protos/product.pb';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrderServiceService implements OnModuleInit {
productServiceClient: ProductServiceClient;

@Inject(PRODUCT_SERVICE_NAME)
readonly clientGrpc: ClientGrpc;

public onModuleInit(): any {
this.productServiceClient =
this.clientGrpc.getService(PRODUCT_SERVICE_NAME);
}

async createOrder(productId: string): Promise<CreateOrderResponse> {
// TODO: 调用product 微服务 rpc, 完成库存变化

const data = { id: 1, orderId: 2 };
const response = await firstValueFrom(
this.productServiceClient.decreaseStock(data),
);

if (response.status === 200) {
return {
status: 200,
error: [],
id: 1,
};
}

// const stock =
return {
status: 500,
error: [],
id: 2,
};
}
}
```


然后再按照上面的步骤修改修改一下`product-service`中的main.ts

然后是修改`product-service.controller`文件

```ts
import { Controller, Get } from '@nestjs/common';
import { ProductServiceService } from './product-service.service';
import {
DecreaseStockResponse,
PRODUCT_SERVICE_NAME,
} from '../../../protos/product.pb';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
export class ProductServiceController {
constructor(private readonly productServiceService: ProductServiceService) {}

@GrpcMethod(PRODUCT_SERVICE_NAME)
decreaseStock(): Promise<DecreaseStockResponse> {
return this.productServiceService.decreaseStock();
}
}
```

然后是修改`product-service.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { DecreaseStockResponse } from '../../../protos/product.pb';

@Injectable()
export class ProductServiceService {
async decreaseStock(): Promise<DecreaseStockResponse> {
return {
status: 200,
error: [],
};
}
}
```


最后是在`api-gateway`中的`module`文件注册order微服务即可

`api-gateway.module.ts`
```ts
import { Module } from '@nestjs/common';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { ClientsModule } from '@nestjs/microservices';
import { ORDER_SERVICE_NAME } from '../../../protos/order.pb';
import { orderClient } from '../../../protos/order.client.options';

@Module({
imports: [
ClientsModule.register([
{
name: ORDER_SERVICE_NAME,
...orderClient,
},
]),
],
controllers: [ApiGatewayController],
providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
```

修改`api-gateway.controller`

```ts
import { Controller, Get, Post } from '@nestjs/common';
import { ApiGatewayService } from './api-gateway.service';
import { CreateOrderResponse } from '../../../protos/order.pb';

@Controller()
export class ApiGatewayController {
constructor(private readonly apiGatewayService: ApiGatewayService) {}

@Post('order')
createOrder(): Promise<CreateOrderResponse> {
const data = {
productId: 1,
quantity: 1,
userId: 1,
};
return this.apiGatewayService.createOrder(data);
}
}
```



到这里，一个简单的微服务就搭建完成了

## 测试
接着就是启动api-gateway服务、order服务、product服务

在命令行输入`curl -X POST http://localhost:3000/order`
然后输出`{"status":200,"id":1}%`即表示成功


## 相关链接
[protoc: command not found (Linux)](https://stackoverflow.com/questions/47704968/protoc-command-not-found-linux)

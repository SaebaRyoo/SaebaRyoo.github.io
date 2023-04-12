---
title: Node.js TypeScript#6. 发送http请求，理解multipart/form-data
date: 2023-04-11 22:00
categories:
- Node
tags:
- Node
---


> [原文链接](https://wanago.io/2019/03/18/node-js-typescript-6-sending-http-requests-understanding-multipart-form-data/)

HTTP是一种协议，它允许你请求例如**JSON数据**和**HTML文档**这项的资源。它连接**client**和**server**，来帮助你传递和交换信息。当数据从**client**发出就叫`request`。当数据从**server**发出就叫`response`。在这篇文章中，我们主要讲的是如何发出`request`。

> 本文介绍了使用原生Node.js中进行HTTP请求的方法。其他可行的解决方案是使用[axios](https://github.com/axios/axios)这样的库。

## 发送一个http请求

想要发送一个http请求，我们需要使用`http`模块。它包含了请求方法。

```ts
import { request } from "http";

const req = request(
  {
    host: "jsonplaceholder.typicode.com",
    path: "/todos/1",
    method: "GET",
  },
  (response) => {
    console.log(response.statusCode);
  }
);

req.end();
```

`request`方法的第一个参数是一个对象，他们的意思都比较好理解。

最后一个参数是一个回调函数，这个回调的第一个参数是服务端的`response`实例。它包含了我们想得到的一些响应信息，比如`statusCode(状态码)`。


还有一个重要的东西就是**readable stream**。由于我们在之前的文章中就已经介绍过了，这里就不再赘述，直接上代码。
```ts
import { request } from 'http';
import { createWriteStream } from "fs";
const fileStream = createWriteStream("./file.txt");

const req = request(
  {
    host: "jsonplaceholder.typicode.com",
    path: "/todos/1",
    method: "GET",
  },
  (response) => {
    response.pipe(fileStream);
  }
);
req.end();
```
在上面这个代码中，我们读取了`jsonplaceholder.typicode.com/todos/1`这个路径下的`json`资源，然后我们创建了一个可写流，并且将json资源的**可读流**写入到了`file.txt`中
```
{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}
```


另一个我们可能会用到的就是在一个变量中存储**请求body**。因为它是一个可读流，我们只需要解析它的`chunks`即可。
```ts
const req = request(
  {
    host: "jsonplaceholder.typicode.com",
    path: "/todos/1",
    method: "GET",
  },
  (response) => {
    const chunks: Uint8Array[] = [];
    response.on("data", (chunk) => {
      chunks.push(chunk);
    });
    response.on("end", () => {
      const result = Buffer.concat(chunks).toString();
      console.log(result);
    });
  }
);

req.end();
```

在这当中有很多操作，我们可以通过`Promise`来简化这一流程
```ts

interface Response {
  data: object;
  headers: IncomingHttpHeaders;
}

function performRequest(options: RequestOptions) {
  return new Promise((resolve, reject) => {
    request(options, function (response) {
      const { statusCode, headers } = response;
      if (statusCode >= 300) {
        reject(new Error(response.statusMessage));
      }
      const chunks: Uint8Array[] = [];
      response.on("data", (chunk) => {
        chunks.push(chunk);
      });
      response.on("end", () => {
        const data = Buffer.concat(chunks).toString();
        const result: Response = {
          data: JSON.parse(data),
          headers,
        };
        resolve(result);
      });
    }).end();
  });
}

performRequest({
  host: "jsonplaceholder.typicode.com",
  path: "/todos1",
  method: "GET",
})
  .then((response) => {
    console.log(response);
  })
  .catch((error) => {
    console.log(error);
  });
```

这里会返回一个`Not Found`的错误信息，因为我们故意将资源的路径写成了`todo1`。这是为了展示一下通过封装可以处理一些通用的信息。

## http.ClientRequest

`request`函数返回一个继承与`Stream`的`ClientRequest`的实例。我们可以用它来发送一些`POST`请求。

在测试这个功能前，我们先用`express`实现搭建一个server

首先先自己创建另一个项目`express-demo`
```
yarn init -y
yarn add typescript express ts-node
```

然后配置`tsconfig.json`:

```json
{
  "compilerOptions": {
    "sourceMap": true,
    "target": "ESNext",
    "outDir": "./dist",
    "baseUrl": "./src"
  },
  "include": [
    "src/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

在`package.json`添加脚本
```json
"scripts": {
  "dev": "ts-node ./src/server.ts"
}
```

然后，在`src/server.ts`中编写接口
```ts
import * as express from 'express';

const app = express();

app.post("/upload", (request, response) => {
  response.send("Hello world!");
});

app.listen(5000);
```

到这，一个基础的服务就完成了。

-----------------------

然后，回到之前的项目中，在`index.ts`写下请求相关代码

```ts
const req = request(
  {
    host: "localhost",
    port: "5001",
    path: "/upload",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  },
  (response) => {
    console.log(response.statusCode); // 200
  }
);

req.write(
  JSON.stringify({
    author: "Marcin",
    title: "Lorem ipsum",
    content: "Dolor sit amet",
  })
);

req.end();
```

你会发现每个例子都需要以`end`函数结尾，这是用来表示请求已经结束。

## 使用`multipart/form-data`上传文件
另一个需要将请求作为流的就是上传文件。我们需要使用`multipart/form-data`来上传文件。

`FormData`提供了一个方法去构造`key/value对`来作为form对象的`字段`和`值`。当我们在浏览器环境时，我们可以很简单的使用`FormData()`构造函数来创建爱你。但Node中并没有提供，我们使用一个第三方包`form-data`来完成。

`npm install @typings/form-data form-data`

`Multipart`来源于`MIME`，一个扩展电子邮件格式的标准，代表多用途互联网邮件扩展。该类型的请求将一组或多组数据合并到一个`body`，并以 **boundary(随机字符串)** 分隔。通常，在发送文件时，我们使用`multipart/form-data`,这是`Multipart`的一个子类型，在网络上被广泛支持

```ts
import * as FormData from "form-data";
import { createReadStream } from "fs";

const readStream = createReadStream("./photo.jpg");

const form = new FormData();
form.append("photo", readStream);
form.append("firstName", "Marcin");
form.append("lastName", "Wanago");

const req = request(
  {
    host: "localhost",
    port: "5000",
    path: "/upload",
    method: "POST",
    headers: form.getHeaders(),
  },
  (response) => {
    console.log(response.statusCode); // 200
  }
);

form.pipe(req);
```

`form-data`库创建了可读流，我们将其与请求一起发送。上面的代码中有一个有趣的部分是`form.getHeaders()`。

## Boundary
当发送`multipart/form-data`时，我们需要使用适当的headers。我们可以通过以下示例来看`form-data`库为我们生成了什么：

```ts
import * as FormData from 'form-data';
import { createReadStream } from 'fs';

const fileStream = createReadStream('./photo.jpg');

const form = new FormData();
form.append('photo', readStream);
form.append('firstName', 'Marcin');
form.append('lastName', 'Wanago');

console.log(form.getHeaders());
```

上面这段代码输出如下:
```
{
  'content-type': 'multipart/form-data; boundary=--------------------------898552055688392969814829'
}
```

如你所见，他将内容的类型设置为`multipart/form-data`，并在其中设置一个每次都不同的随机字符串的`boundary`。它被传递到`headers`中去定义一个字符串来划分表单数据的不同部分。

为了充分理解它，我们需要将我们的`form`通过`pipe`写入到一个文件中去读取
```ts
import * as FormData from 'form-data';
import { createReadStream, createWriteStream } from 'fs';

const readStream = createReadStream('./photo.jpg');
const writeStream = createWriteStream('./file.txt');

const form = new FormData();
form.append('photo', readStream);
form.append('firstName', 'Marcin');
form.append('lastName', 'Wanago');
console.log(form.getHeaders());

form.pipe(writeStream);
```

上面首先会输出
```
{
  'content-type': 'multipart/form-data; boundary=--------------------------966991448654339731356450'
}
```

最终，我们可以看到`file.txt`中的文件如下
```ts
----------------------------966991448654339731356450
Content-Disposition: form-data; name="photo"; filename="photo.jpg"
Content-Type: image/jpeg

���� JFIF    �� ;CREATOR: gd-jpeg v1.0 (using IJG JPEG v90), quality = 82
�� C    

!'"#%%%),($+!$%$�� C   $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$�� ,," ��   
(...)
----------------------------966991448654339731356450
Content-Disposition: form-data; name="firstName"

Marcin
----------------------------966991448654339731356450
Content-Disposition: form-data; name="lastName"

Wanago
----------------------------966991448654339731356450--
```

`form`的每一部分都使用生成的`boundary`来划分，最后一个`boundary`在最后有两个额外的破折号。


## 总结
在这篇文章中，我们介绍了如何在Node中进行http请求，要做到这点，需要我们前面所学的关于流的知识。我们实现的功能之一就是上传文件。为了实现这一点，我们解释了`multipart/form-data`格式。这些知识也适用于前端。

---
title: acme.sh + 阿里云 DNS + Docker OpenResty：免费通配符证书从申请到自动续期
date: 2026-11-06
categories:
  - 运维
tags:
  - acme.sh
  - SSL
  - Nginx
  - Docker
  - 阿里云
description: 一次完整的踩坑记录：用 Gitee 镜像安装 acme.sh、用 EAB 注册 ZeroSSL 账户、通过阿里云 DNS-01 签发通配符证书、把证书挂载进 Docker 里的 OpenResty，以及 install-cert 过程中遇到的权限、文件名和空文件三个坑。
---

记录一次完整的实践：安装 acme.sh、注册 ZeroSSL 账户、用阿里云 DNS 验证签发通配符证书，再把证书挂载进 Docker 里的 OpenResty、配好自动续期。中间踩到的坑都按顺序保留下来，照着走基本能一次通。

## 1. 最终方案长什么样

先看结果，再讲过程。整个链路是这样的：

```text
宿主机（ubuntu）
├── ~/.acme.sh/                              # acme.sh 本体 + 账户 + 证书源文件
│   └── ibuy.xin_ecc/                        # 签发产物：key / cer / fullchain.cer / ca.cer
├── /usr/local/docker-volumes/openresty/cert/
│   ├── ibuy.xin.key                         # install-cert 落地的私钥
│   └── ibuy.xin.pem                         # install-cert 落地的 fullchain
└── Docker 容器（openresty）
    └── /etc/nginx/cert/  ← 挂载自上面的 cert 目录
        └── 容器里的 nginx.conf 读 /etc/nginx/cert/ibuy.xin.pem
```

关键认知只有一句：**acme.sh 跑在宿主机上，证书落盘到宿主机目录，容器只负责读取挂载进去的文件。** 不要在容器里装 acme.sh，也不要把证书路径想成"宿主机直接给容器用"。

## 2. 安装 `acme.sh`：GitHub 卡住就换 Gitee 源

官方一键脚本 `curl https://get.acme.sh | sh` 会去 GitHub 拉代码，国内服务器经常卡在 0%：

```bash
wget -O - https://get.acme.sh | sh -s email=you@example.com
# 卡住不动，或者 0 0 0 --:--:-- 一直等
```

换成作者自己在 Gitee 维护的镜像（`neilpang` 就是 acme.sh 的作者）：

```bash
git clone https://gitee.com/neilpang/acme.sh.git
cd acme.sh
./acme.sh --install -m you@example.com
source ~/.bashrc
acme.sh --version
```

`--install` 会做三件事：把脚本装到 `~/.acme.sh/`、写入 shell 的 PATH、注册定时任务。装完可以顺手确认一下：

```bash
which acme.sh
crontab -l | grep acme
```

> 注意：网上有些"国内安装脚本"（比如 gitcode 上的第三方镜像）已经很久没更新，装出来的版本可能自带旧 Bug，不建议作为首选。

## 3. 注册 ZeroSSL 账户（EAB）并设为默认 CA

ZeroSSL 的 ACME 服务要求账户做一次**外部账户绑定（EAB，External Account Binding）**：用 ZeroSSL 后台生成的一对凭证，把 ACME 账户和 ZeroSSL 账号关联起来。acme.sh 用邮箱注册时会自动去换这对凭证；我这里是手动指定的，好处是账户明确挂在自己的 ZeroSSL 账号下。

登录 ZeroSSL 后台，左侧 **Developer** → **EAB Credentials for ACME Clients** → **Generate**，拿到 `EAB KID` 和 `EAB HMAC Key`，然后：

```bash
acme.sh --register-account --server zerossl \
  --eab-kid       <你的 EAB KID> \
  --eab-hmac-key  <你的 EAB HMAC Key>
```

注册完之后把 ZeroSSL 设为默认 CA，后面的 `--issue` 就不需要每次都带 `--server` 了：

```bash
acme.sh --set-default-ca --server zerossl
```

> 其实 acme.sh 也支持用邮箱自动注册（`acme.sh --register-account -m you@example.com --server zerossl`），会自己去换 EAB，省掉去后台拿凭证的步骤。两种方式选一种即可。想换 Let's Encrypt 的话，把上面的 `zerossl` 换成 `letsencrypt`，再执行一次 `--set-default-ca`。

这个默认 CA 设置是全局的，存在 `~/.acme.sh/account.conf` 里，之后所有签发和续期都会走 ZeroSSL，直到你改掉它。

## 4. 阿里云：先准备一个只懂 DNS 的 RAM 子账号

DNS-01 验证需要 acme.sh 调用域名服务商的 API 去增删 TXT 记录，所以需要 AccessKey。

不建议用主账号。登录阿里云 RAM 控制台，建一个子用户，勾选"编程访问"，然后：

- 简单做法：授予 `AliyunDNSFullAccess`；
- 更稳妥：自定义策略，只给 DNS 记录的增删查权限：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "alidns:DescribeDomains",
        "alidns:DescribeDomainRecords",
        "alidns:AddDomainRecord",
        "alidns:DeleteDomainRecord"
      ],
      "Resource": "*"
    }
  ]
}
```

创建完成后保存 AccessKey ID 和 AccessKey Secret。**这两个东西等于域名解析的控制权，不要提交到 Git。**

## 5. 签发通配符证书（DNS-01）

```bash
export Ali_Key="你的AccessKeyID"
export Ali_Secret="你的AccessKeySecret"

acme.sh --issue --dns dns_ali -d ibuy.xin -d '*.ibuy.xin'
```

几点说明：

- **插件是 `dns_ali`**，对应阿里云云解析。acme.sh 靠这个参数决定调用哪个 DNS 插件，而不是靠环境变量名去猜。
- `*.ibuy.xin` 建议加单引号。不然 shell 会先尝试做文件名展开，当前目录恰好有匹配文件时就出问题了。
- 通配符只能走 DNS-01，没法用 HTTP 文件验证，所以这一步必须配好 API Key。
- 日志里的 `Using CA: https://acme.zerossl.com/v2/DV90` 说明确实走的是 ZeroSSL（也就是第 3 步设的默认 CA）。
- 成功后产物在 `~/.acme.sh/ibuy.xin_ecc/`，包含 `ibuy.xin.key`、`ibuy.xin.cer`、`ca.cer`、`fullchain.cer`。**`fullchain.cer` 是服务器证书 + 中间证书，Nginx 必须用它，不能用 `ibuy.xin.cer`。**

密钥会被 acme.sh 自动保存到 `~/.acme.sh/account.conf`，后续续期不需要再 export。

## 6. 一个常见疑问：域名在阿里云，文章里的 `export Namesilo_Key` 还有用吗

**没用，可以直接忽略。**

我参考的文章里用的是 Namesilo 解析，所以要 `export Namesilo_Key=...` 配 `--dns dns_namesilo`。但我的域名虽然在别处注册，**DNS 解析托管在阿里云**，这时候：

```bash
export Namesilo_Key="xxx"                      # 对 dns_ali 完全无效
acme.sh --issue --dns dns_ali -d ibuy.xin ...  # 真正生效的是 Ali_Key / Ali_Secret
```

原因在于 acme.sh 的分工：

| 你在命令里写的 | 实际被调用的插件 | 读取的环境变量 |
| --- | --- | --- |
| `--dns dns_ali` | `dnsapi/dns_ali.sh` | `Ali_Key` / `Ali_Secret` |
| `--dns dns_namesilo` | `dnsapi/dns_namesilo.sh` | `Namesilo_Key` |
| `--dns dns_dp`（DNSPod） | `dnsapi/dns_dp.sh` | `DP_Id` / `DP_Key` |
| `--dns dns_tencent` | `dnsapi/dns_tencent.sh` | `Tencent_SecretId` / `Tencent_SecretKey` |
| `--dns dns_cf`（Cloudflare） | `dnsapi/dns_cf.sh` | `CF_Token` |

也就是说，**`export Namesilo_Key` 只是一段没有任何消费者的环境变量**，既不报错也不起作用。真正要跟"域名注册商"区分开的是"DNS 托管商"——注册商和解析商可以不是同一家。

我一开始就是照抄了文章里的 `--dns dns_namesilo`，结果：

```text
Adding TXT value: PDwWTXBUx6WOynsdvBDCAG3Fe6E4ttcAkcMauxcXwlQ for domain: _acme-challenge.ibuy.xin
Unable to find domain specified.
Error adding TXT record to domain: _acme-challenge.ibuy.xin
```

这个报错来自 `dns_namesilo.sh` 的 `_get_root`：它会先用 API 列出该账号下的所有域名，再找 `ibuy.xin`。域名不在 NameSilo 的解析列表里（因为 NS 早就指向阿里云了），自然"找不到域名"。所以这不是 acme.sh 的 Bug，而是插件和解析商不匹配。

> 补充一句：如果 NS 确实在 NameSilo 却报同样的错，多半是插件版本旧、解析不了 API 返回的 XML，`acme.sh --upgrade` 升级一下通常就好了。

判断方法很简单：`dig NS ibuy.xin +short`，看返回的 NS 属于谁，就用谁家的插件。

## 7. Docker 里 OpenResty 的证书到底放哪

容器有独立文件系统，`nginx.conf` 里写的 `/etc/nginx/cert/ibuy.xin.pem` 是**容器内路径**。宿主机上的 `/etc/nginx/cert` 和它没有任何关系，除非你显式挂载。

所以分两步：

1. 宿主机上找个目录放证书，比如 `/usr/local/docker-volumes/openresty/cert/`；
2. 启动容器时把这个目录挂到容器内的 `/etc/nginx/cert`。

`docker-compose.yml` 里大概是这样：

```yaml
services:
  openresty:
    image: openresty/openresty:alpine
    container_name: openresty
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf:ro
      - /usr/local/docker-volumes/openresty/cert:/etc/nginx/cert:ro
    restart: unless-stopped
```

挂载关系一定要验证，别凭记忆：

```bash
docker inspect openresty --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

输出里必须能看到 `/usr/local/docker-volumes/openresty/cert -> /etc/nginx/cert`。看不到就说明挂载没生效，后面 reload 多少次都没用。

`:ro` 只读挂载是个好习惯：容器只需要读证书，不需要写。

## 8. install-cert：三个坑排着队来

证书签发成功只是第一步。`~/.acme.sh/` 下的文件不建议直接给 Nginx 用（目录结构会变、续期后路径也可能变），标准做法是用 `--install-cert` 复制到目标位置，并把 reload 命令一起注册进去。最后跑通的命令是：

```bash
acme.sh --install-cert -d ibuy.xin \
  --key-file       /usr/local/docker-volumes/openresty/cert/ibuy.xin.key \
  --fullchain-file /usr/local/docker-volumes/openresty/cert/ibuy.xin.pem \
  --reloadcmd      "docker exec b9185c71edb5 openresty -s reload"
```

目标路径必须和 `nginx.conf` 里的 `ssl_certificate` 完全一致。这条命令我前后改了三次才跑通，三个坑按顺序记录如下。

### 8.1 Permission denied

```text
Installing key to: /usr/local/docker-volumes/openresty/cert/ibuy.xin.key
/home/ubuntu/.acme.sh/acme.sh: line 7119: ...: Permission denied
```

`/usr/local/...` 属于 root，ubuntu 用户没写权限。解决办法是把目录交给当前用户：

```bash
sudo chown -R $USER:$USER /usr/local/docker-volumes/openresty/cert/
```

**不要用 `sudo acme.sh`**。sudo 之后 `HOME` 变成 `/root`，acme.sh 会去 `/root/.acme.sh` 找证书，结果就是"明明签发过却找不到"。而且定时续期是以 ubuntu 身份跑的，文件属主是 root 的话，续期时复制证书照样失败。

### 8.2 文件名和 Nginx 配置对不上

我一开始写的是：

```bash
--fullchain-file /usr/local/docker-volumes/openresty/cert/ibuy.xin.key.pem
```

但 `nginx.conf` 里是：

```nginx
ssl_certificate /etc/nginx/cert/ibuy.xin.pem;
```

`.key.pem` 和 `.pem` 是两个文件。`install-cert` 不会校验 Nginx 配置，它只负责复制，所以命令"成功"了，Nginx 启动时却找不到文件。文件名统一成 `ibuy.xin.pem` 就好。

### 8.3 最坑的：装出来是个空文件

```bash
cat /usr/local/docker-volumes/openresty/cert/ibuy.xin.pem   # 什么都没有
```

回头看日志，其实早有提示：

```text
Installing full chain to: /usr/local/docker-volumes/openresty/cert/ibuy.xin.key.pem
cat: /home/ubuntu/.acme.sh/ibuy.xin_ecc/fullchain.cer: No such file or directory
```

`install-cert` 只做复制，**源文件不存在时它不会失败，只会生成一个空文件**（复制失败但退出码仍然为 0）。而 `fullchain.cer` 不存在，说明之前那次 `--issue` 根本没成功——第一次用 `dns_namesilo` 时 TXT 记录就没加上，证书自然没签下来，目录里只有一开始生成的私钥。

正确的排查顺序是：

```bash
# 1. 先看源目录到底有没有证书
ls -l ~/.acme.sh/ibuy.xin_ecc/

# 2. 缺 fullchain.cer 就重新签发
acme.sh --issue --dns dns_ali -d ibuy.xin -d '*.ibuy.xin' --force

# 3. 源文件齐了再安装
acme.sh --install-cert -d ibuy.xin --ecc \
  --key-file       /usr/local/docker-volumes/openresty/cert/ibuy.xin.key \
  --fullchain-file /usr/local/docker-volumes/openresty/cert/ibuy.xin.pem \
  --reloadcmd      "docker exec openresty openresty -s reload"

# 4. 确认不是空文件
wc -c /usr/local/docker-volumes/openresty/cert/ibuy.xin.pem
openssl x509 -in /usr/local/docker-volumes/openresty/cert/ibuy.xin.pem -noout -subject -dates
```

两个细节：

- **`--ecc`**：ECC 证书放在 `ibuy.xin_ecc` 目录，acme.sh 在只有一套证书时会自动探测（日志里那句 `The domain 'ibuy.xin' seems to already have an ECC cert, let's use it` 就是它干的），**但同时存在 RSA 和 ECC 两套时必须显式带 `--ecc`**，否则可能装错目录。
- **`--reloadcmd` 建议用容器名而不是容器 ID**。上面那条命令里写的是 `docker exec b9185c71edb5 ...`，容器一重建 ID 就变了，续期时 reload 必然失败。把容器名固定成 `openresty` 再引用会稳很多。

## 9. 让容器里的 OpenResty 真正用上新证书

`nginx.conf` 里对应的 server 块：

```nginx
server {
    listen 443 ssl;
    http2 on;                 # nginx 1.25.1+ 的写法（OpenResty 1.25.3.1 起支持）
    server_name ibuy.xin;

    ssl_certificate     /etc/nginx/cert/ibuy.xin.pem;   # fullchain
    ssl_certificate_key /etc/nginx/cert/ibuy.xin.key;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_timeout 5m;
    ssl_session_cache   shared:SSL:10m;

    location / {
        root  /usr/local/openresty/nginx/html;
        index index.html;
    }
}
```

老版本 Nginx 没有 `http2 on;` 指令，得写成 `listen 443 ssl http2;`，两者别混用，否则会报 unknown directive。

改完配置的验证顺序：

```bash
# 1. 容器内语法检查
docker exec openresty openresty -t

# 2. 重载
docker exec openresty openresty -s reload

# 3. 看容器里能不能读到非空证书
docker exec openresty ls -l /etc/nginx/cert/

# 4. 看服务端实际返回的证书
openssl s_client -connect ibuy.xin:443 -servername ibuy.xin </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates

# 5. 看证书链是否完整（应该能看到至少两段证书）
openssl s_client -connect ibuy.xin:443 -servername ibuy.xin -showcerts </dev/null 2>/dev/null | grep -c "BEGIN CERTIFICATE"
```

第 4 步输出里的 `notAfter` 应该是三个月后，`issuer` 是 ZeroSSL（或 Let's Encrypt），`subject` 是 `CN=ibuy.xin`。对得上就说明证书真的生效了。

## 10. 如果浏览器还是提示"不安全"

按这个顺序排查，基本能覆盖 90% 的情况：

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 证书是空的 / `wc -c` 为 0 | `install-cert` 复制了不存在的源文件 | 重新 `--issue`，再 install |
| Nginx 起不来，报找不到文件 | 文件名和 `ssl_certificate` 不一致 | 对齐 `.pem` / `.key` 文件名 |
| 服务端返回的还是旧证书 | 没 reload，或 reload 的是宿主机 Nginx | `docker exec <容器> openresty -s reload` |
| 部分浏览器报证书链不完整 | 用了 `ibuy.xin.cer` 而不是 `fullchain.cer` | `ssl_certificate` 指向 fullchain |
| 地址栏仍有警告，但证书正常 | 页面里有 `http://` 资源（混合内容） | 把资源改成 `https://` 或协议相对地址 |
| 只有自己电脑有问题 | 本地缓存了旧的证书状态 | 无痕窗口 / 清缓存再试 |

我当时就是"空文件 + 文件名不一致"两个问题叠在一起，所以命令全都返回成功，浏览器却一直不安全。

## 11. 自动续期与手动续期

`acme.sh --install` 时已经注册了 cron 任务，续期不需要自己写脚本：

```bash
crontab -l | grep acme
# 新版本（3.1.4+）是每 6 小时跑一次，由 CA 通过 ARI 告诉客户端什么时候该续
```

`--reloadcmd` 会被写进 `~/.acme.sh/ibuy.xin_ecc/ibuy.xin.conf`，续期成功后自动执行，所以容器里的 OpenResty 会跟着重载，不用人工干预。

需要手动续期时：

```bash
acme.sh --renew -d ibuy.xin --ecc
```

**不要带 `--dns` 参数。** 续期会用 `ibuy.xin.conf` 里保存的签发配置（`Le_Webroot=dns_ali`），命令行上的 `--dns` 在这版 acme.sh 里会被忽略。参考文章里写的是 `acme.sh --renew --dns dns_namesilo -d ibuy.xin -d *.ibuy.xin`，那个 `dns_namesilo` 是从文章自身的环境抄下来的，对阿里云解析没有任何意义——真跑起来不会报错，但也什么都没做，属于典型的复制粘贴残留。我最后没跑这条命令，而是以 `crontab -l` 里那条自动续期为准。

常用命令：

```bash
acme.sh --list                                  # 看已签发的证书和到期时间
acme.sh --renew -d ibuy.xin --ecc --force       # 强制立刻续期（测试用）
acme.sh --upgrade                               # 升级 acme.sh
```

两个提醒：

- `--force` 会真的向 CA 申请新证书，别反复跑。ZeroSSL / Let's Encrypt 对同一域名都有频率限制（每周若干张），测试的时候更容易触发 429。
- 续期依赖 `docker` 命令的权限。ubuntu 已经在 `docker` 组里（`docker:x:988:ubuntu,deploy`），cron 里直接执行没问题；如果换用户，记得确认 `id -nG | grep docker`。

## 12. 小结

把这次踩的坑浓缩成几句话：

1. 免费证书走 ACME 就够用：90 天有效期、支持通配符，续期全自动；ZeroSSL 只要用 EAB 注册一次账户即可。
2. 国内装 acme.sh 用 Gitee 镜像，别跟 GitHub 死磕。
3. 插件要跟 **DNS 托管商**对齐（阿里云是 `dns_ali` + `Ali_Key`/`Ali_Secret`），注册商是谁不重要，`Namesilo_Key` 对阿里云解析毫无作用。
4. Docker 场景下，证书放宿主机、通过 volume 挂进容器，容器内路径以 `nginx.conf` 为准。
5. `install-cert` 不校验任何东西：权限、文件名、源文件是否存在，全靠自己确认。
6. 最后一定要用 `openssl s_client` 看服务端实际吐出来的证书，而不是看命令的退出码。

## 参考资料

- [DNSPod 官方文档：acme.sh 自动解析并申请证书](https://docs.dnspod.cn/dns/acme-sh/)（插件机制和 install-cert 的流程写得很清楚，把 `dns_tencent` 换成 `dns_ali` 即可）
- [acme.sh 申请泛域名证书](https://dd.djgo.cc/linux/ssl.html)（ZeroSSL + Namesilo 的流程，可对照参考）
- [acme.sh 官方仓库](https://github.com/acmesh-official/acme.sh) / [Gitee 镜像](https://gitee.com/neilpang/acme.sh)

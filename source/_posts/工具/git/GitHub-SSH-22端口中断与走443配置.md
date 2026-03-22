---
title: GitHub SSH 22 端口连接中断与走 443 配置
date: 2026-03-22
categories:
  - 工具
tags:
  - git
  - GitHub
  - SSH
---

## 分类说明

| 维度 | 标签 |
|------|------|
| **场景** | `git push` / `pull` / `clone`，远程为 `git@github.com:...` |
| **工具** | Git、OpenSSH |
| **问题类型** | 网络 / 代理、SSH 连通性（易被误判为「权限不足」） |

---

## 一、问题现象

远程仓库使用 **SSH 地址**（`git@github.com:用户/仓库.git`）时，`git push`、`git pull`、`git clone` 等可能在 **与 GitHub 建连阶段** 失败。

典型输出包含：

- `Connection closed by ... port 22`
- `fatal: Could not read from remote repository`
- `Please make sure you have the correct access rights and the repository exists.`

即使本地 **`git commit` 已成功**，只要在 **`git push` 时需要与 GitHub 建立 SSH 连接**，仍可能在上述报错处失败；根因是 **push 阶段的 SSH 连通性**，而不是本地仓库是否已有提交。

---

## 二、原因说明（根因）

1. **失败点在 SSH 传输层**  
   本地提交、对象打包可以正常完成；问题出在 **本机通过 SSH 访问 GitHub 默认入口（`github.com:22`）** 时，连接被对端或中间网络提前关闭。

2. **常见网络环境**  
   若 `ssh -vT git@github.com` 中出现类似 `198.18.x.x` 的地址，或日志停在 `Connecting to github.com port 22` 后很快出现 `kex_exchange_identification: Connection closed by remote host`，多与 **代理 / VPN / TUN（如部分代理透明接管）** 对 **22 端口** 的处理有关：TCP 能建立，但在密钥交换或认证前被断开。

3. **配置误区**  
   仅把 `~/.ssh/config` 里 `Host github.com` 的 **`User` 设为 `git`**（GitHub 要求如此）**不能替代**「改端口 / 改 HostName」；只要实际仍连 **`github.com:22`**，现象可能依旧。

---

## 三、解决方案（推荐：SSH 走 443）

GitHub 支持 **在 443 端口上使用 SSH**，适合 22 被拦或只允许 HTTPS 出网的网络。

在 `~/.ssh/config` 中为 **`Host github.com`** 配置例如：

```sshconfig
Host github.com
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/你的私钥
  IdentitiesOnly yes
  AddKeysToAgent yes
  IgnoreUnknown UseKeychain
```

要点：

- **`HostName ssh.github.com` + `Port 443`**：走 GitHub 的 SSH-over-HTTPS 入口，避开被干扰的 22。
- **`User git`**：与 `git@github.com:仓库` 一致；身份由 **URL 路径 + 私钥对应 GitHub 公钥** 决定，不是把 `User` 写成 GitHub 用户名。
- **`IdentitiesOnly yes`**：配合显式 `IdentityFile`，减少多钥尝试带来的混乱或限流。

若用 **自定义 Host 别名** 指向 GitHub（如 `Host work.com` 且原 `HostName` 为 `github.com`），在同样环境下也应改为 **`HostName ssh.github.com` 与 `Port 443`**，否则仍会走 22。

验证：

```bash
ssh -vT git@github.com
```

日志中应出现 **`Connecting to ssh.github.com port 443`**，并完成认证。通过后再执行 `git push` 等。

官方说明：[Using SSH over the HTTPS port](https://docs.github.com/en/authentication/troubleshooting-ssh/using-ssh-over-the-https-port)

---

## 四、其他可选方案

| 方案 | 说明 |
|------|------|
| **调整代理** | 对 `github.com` / `ssh.github.com` 直连或合理分流，避免错误劫持 SSH。 |
| **远程改为 HTTPS** | `git remote set-url origin https://github.com/...`，用 PAT 或凭据管理器；不经过上述 SSH `Host github.com` 配置。 |

---

## 五、与 HTTPS 远程的关系

**不会影响** 已使用 `https://github.com/...` 的仓库。

`~/.ssh/config` 只作用于 **SSH 远程**；HTTPS 走 TLS 与 Git 凭据，与 OpenSSH 里 `Host github.com` 无关。

---

## 六、小结

| 项目 | 内容 |
|------|------|
| **表象** | `git` 报远程不可读、权限/仓库提示，常为 **SSH 连通失败** 而非真的没权限。 |
| **根因** | **GitHub SSH 默认 22** 在当前网络/代理下不可用或被中断。 |
| **关键修复** | `Host github.com` 使用 **`HostName ssh.github.com`**、**`Port 443`**，并确认 **`User git`** 与 **`IdentityFile`**。 |
| **范围** | 仅影响 **SSH 地址** 访问 GitHub；**HTTPS 远程不受影响**。 |

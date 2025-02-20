---
title: 使用pg_dump备份、恢复数据库
date: 2025-02-20
categories:
  - 数据库
tags:
  - Postgres
---

# PostgreSQL 数据库备份与恢复操作

在使用 PostgreSQL 数据库时，`pg_dump` 是一个常用的工具，用于备份数据库的内容。备份和恢复数据库是数据库管理中的重要环节，可以确保数据的安全性和可恢复性。以下是关于如何使用 `pg_dump` 备份和恢复数据库的具体步骤。

## 一、pg_dump 备份数据库

### 1. 打开命令行工具

按照 mac 为例，如果你没将 postgre 相关的命令行加到环境变量中，那么你需要找到 postgre 的安装位置。比如我没有通过 homebrew 安装，我的安装位置在`/Library/PostgreSQL/15`。然后`cd /bin`。

### 2. 执行 `pg_dump` 命令

在命令行中，使用 `pg_dump` 命令来备份数据库。命令的基本格式如下：

```bash
./pg_dump -U postgres -h localhost -p 5432 mall > ~/Desktop/sql/mall_backup.sql
```

- `-U`：指定连接数据库的用户名。

- `-h`：指定数据库服务器的主机名（默认为 `localhost`）。

- `-p`：指定数据库服务器的端口号（默认为 `5432`）。

- `mall`：要备份的数据库的名称。

- `~/Desktop/sql/mall_backup.sql`：备份文件的名称和路径（默认为当前目录下的文件名，这里是自定义的目录）。

### 3.备份特定表

如果只需要备份特定的表或模式，可以使用 `-t`（表）或 `-n`（模式）选项。

```bash
./pg_dump -U postgres -h localhost -p 5432 -t users mall > ~/Desktop/sql/users.sql
```

## 二、恢复数据库

### 1. 创建目标数据库（如果尚未存在）

在恢复数据之前，需要确保目标数据库已经存在。如果还没有目标数据库，可以使用 `createdb` 命令或 `CREATE DATABASE` SQL 语句来创建它。

#### 示例：使用 `createdb` 创建目标数据库

```bash
./createdb -U postgres -h localhost -p 5432 mall_test
```

### 2. 使用 `psql` 恢复数据库

使用 `psql` 命令将备份的 SQL 文件导入到目标数据库中。命令的基本格式如下：

```bash
psql -U 用户名 -h 主机名 -p 端口号 -d 目标数据库名 < 备份文件名.sql
```

- `-U`：指定连接数据库的用户名。
- `-h`：指定数据库服务器的主机名（默认为 `localhost`）。
- `-p`：指定数据库服务器的端口号（默认为 `5432`）。
- `-d`：指定要恢复数据的目标数据库名。
- `< 备份文件名.sql`：指定备份文件的名称和路径。

#### 示例：

```bash
./psql -U postgres -h localhost -p 5432 mall_test < ~/Desktop/sql/mall_backup.sql
```

### 3. 使用 psql 恢复特定表

如果备份文件是以自定义格式（`-Fc`）或目录格式（`-Fd`）创建的，则需要使用 `pg_restore` 命令来恢复数据。

#### 示例：

```bash
./psql -U postgres -h localhost -p 5432 -d mall_test < ~/Desktop/sql/users.sql
```

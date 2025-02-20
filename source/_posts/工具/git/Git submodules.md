---
title: Git submodules
date: 2023-03-28
categories:
  - 工具
tags:
  - git
---

> Git 子模块允许您将一个 Git 仓库包含为另一个 Git 仓库的子目录。Git 子模块实际上是对另一个仓库在特定时间点的引用。它们使得一个 Git 仓库能够将外部代码的版本历史纳入并进行跟踪。

## 什么是 Git 子模块？

通常，一个代码仓库会依赖于外部的代码。这些外部代码可以以几种不同的方式整合进来。一种方法是直接将外部代码复制并粘贴到主要仓库中。然而，这种方法的缺点是无法集成外部仓库的上游更改。另一种整合外部代码的方法是使用编程语言的包管理系统，如 Ruby Gems 或 NPM。尽管如此，这种方法需要在部署原始代码的所有地方进行安装和版本管理。

Git 子模块是主机 Git 仓库中的一个记录，指向另一个外部仓库中特定提交的引用。它们非常静态，只能跟踪特定的提交。子模块不会跟踪 Git 的引用或分支，并且当主机仓库更新时不会自动更新。当将子模块添加到仓库时，将创建一个新的`.gitmodules`文件。`.gitmodules`文件包含有关子模块项目的 URL 和本地目录之间映射的元数据。如果主机仓库有多个子模块，`.gitmodules`文件将为每个子模块创建一个条目。

## 何时应该使用 Git 子模块？

通常情况下，如果需要严格管理外部依赖项的版本，使用 Git 子模块是有意义的。以下是一些适用于 Git 子模块的最佳用例：

1.  当外部组件或子项目更改速度过快，或即将来临的更改可能会破坏 API 时，您可以将代码锁定到特定的提交以确保自己的安全性。
1.  当您有一个不经常更新的组件，并希望将其作为供应商依赖项进行跟踪时。
1.  当您将项目的一部分委托给第三方，并希望在特定时间或版本中集成他们的工作时。同样，这适用于更新不太频繁的情况。

## Git 子模块的常见命令

### 添加 Git 子模块

使用`git submodule add`命令可以将新的子模块添加到已有的仓库中。以下是一个示例，创建一个空的仓库并探讨 Git 子模块：

```
shellCopy code
$ mkdir git-submodule-demo
$ cd git-submodule-demo/
$ git init
Initialized empty Git repository in /Users/atlassian/git-submodule-demo/.git/
```

这一系列命令将创建一个名为`git-submodule-demo`的新目录，进入该目录，并将其初始化为一个新的仓库。接下来，我们将在这个全新的仓库中添加一个子模块。

```
shellCopy code
$ git submodule add https://bitbucket.org/jaredw/awesomelibrary
Cloning into '/Users/atlassian/git-submodule-demo/awesomelibrary'...
remote: Counting objects: 8, done.
remote: Compressing objects: 100% (6/6), done.
remote: Total 8 (delta 1), reused 0 (delta 0)
Unpacking objects: 100% (8/8), done.
```

`git submodule add`命令接受一个指向 Git 仓库的 URL 参数。在这里，我们将`awesomelibrary`添加为一个子模块。Git 将立即克隆子模块。现在，我们可以使用`git status`来查看仓库的当前状态...

```
shellCopy code
$ git status
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)

 new file:   .gitmodules
 new file:   awesomelibrary
```

现在，仓库中有两个新文件，`.gitmodules`和`awesomelibrary`目录。查看`.gitmodules`文件的内容，可以看到新的子模块映射：

```
shellCopy code
[submodule "awesomelibrary"]
 path = awesomelibrary
 url = https://bitbucket.org/jaredw/awesomelibrary
```

接下来，我们通过执行`git add .gitmodules awesomelibrary/`和`git commit -m "added submodule"`将这些新文件添加并提交。

### 克隆 Git 子模块

```
shellCopy code
git clone /url/to/repo/with/submodules
git submodule init
git submodule update
```

### Git 子模块初始化

`git submodule init`的默认行为是将映射从`.gitmodules`文件复制到本地的`./.git/config`文件中。这可能看起来有些多余，并引发对`git submodule init`有何用处的疑问。`git submodule init`有扩展行为，它可以接受一个显式模块名称的列表。这允许一个工作流程，只激活对仓库工作需要的特定子模块。如果仓库中有许多子模块，但不需要获取它们所有以进行工作，这可能会有所帮助。

### 子模块工作流程

一旦子模块在父仓库中得到适当初始化和更新，它们可以像独立的仓库一样使用。这意味着子模块有自己的分支和历史记录。当对子模块进行更改时，重要的是要发布子模块的更改，然后更新父仓库对子模块的引用。让我们继续使用`awesomelibrary`的示例并进行一些更改：

```
shellCopy code
$ cd awesomelibrary/
$ git checkout -b new_awesome
Switched to a new branch 'new_awesome'
$ echo "new awesome file" > new_awesome.txt
$ git status
On branch new_awesome
Untracked files:
  (use "git add <file>..." to include in what will be committed)

 new_awesome.txt

nothing added to commit but untracked files present (use "git add" to track)
$ git add new_awesome.txt
$ git commit -m "added new awesome textfile"
[new_awesome 0567ce8] added new awesome textfile
 1 file changed, 1 insertion(+)
 create mode 100644 new_awesome.txt
$ git branch
  main
* new_awesome
```

在这里，我们切换到了`awesomelibrary`子模块的目录。我们创建了一个新的文本文件`new_awesome.txt`并添加并提交了这个新文件到子模块。现在让我们返回到父仓库并查看父仓库的当前状态。

```
shellCopy code
$ cd ..
$ git status
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

 modified:   awesomelibrary (new commits)

no changes added to commit (use "git add" and/or "git commit -a")
```

执行`git status`命令显示父仓库已经知道了`awesomelibrary`子模块的新提交。它不会详细说明具体的更新，因为那是子模块仓库的责任。父仓库只关心将子模块固定到一个提交上。现在，我们可以再次通过对子模块执行`git add`和`git commit`来更新父仓库，这将把所有内容置于良好的状态。如果您在团队环境中工作，那么非常关键的是随后要推送子模块的更新以及父仓库的更新。

在使用子模块时，常见的混淆和错误模式是忘记为远程用户推送更新。如果我们重新审视刚刚完成的`awesomelibrary`工作，我们只推送了父仓库的更新。另一位开发人员将尝试拉取最新的父仓库，但由于我们忘记了推送子模块，它将指向无法拉取的`awesomelibrary`提交，这会破坏远程开发人员的本地仓库。为避免这种失败情况，请确保始终提交和推送子模块以及父仓库。

## 结论

Git 子模块是充分利用 Git 作为外部依赖管理工具的强大方式。在使用它们之前，请权衡 Git 子模块的优缺点，因为它们是一项高级功能，可能需要团队成员花费一些时间来适应。

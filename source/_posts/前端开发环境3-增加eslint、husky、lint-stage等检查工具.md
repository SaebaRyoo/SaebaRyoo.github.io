---
title: 如何搭建一个前端开发环境(三):添加eslint+husky+lint-stage等预检工具
categories:
- 前端
tags: 
- 工程化
---

**前端开发配置系列文章的github仓库为： https://github.com/SaebaRyoo/webpack-config ,如果您在看的过程中发现了什么不足和错误，感谢您能指出！**

>上一篇讲了如何创建一个简单的开发环境搭建，但是在一个项目中，只有这些是不够的。每个人的代码质量不同，格式不同。所以需要用到代码规范校验


## eslint

它主要功能包含代码格式校验，代码质量校验

1. 首先，安装eslint `yarn add eslint -D`(目前我用的是eslint v8.25.0, 高版本的eslint需要比较新的vscode，不然eslint插件可能无法工作) 

2. 配置eslint规则和.eslintignore,并且前面我们用到了react和typescript，所以也需要安装一下对应的插件和解析器
`yarn add eslint-plugin-react @typescript-eslint/parser @typescript-eslint/eslint-plugin -D`


.eslintrc.js
```js
module.exports = {
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": [
    "react",
    "@typescript-eslint",
  ],
  "rules": {
    "arrow-body-style": "off",
    "prefer-arrow-callback": "off",
    "no-var": 2,
    "no-console": 1,
    "consistent-return": 1,
    "default-case": 1,
    "no-alert": 2,
    "no-irregular-whitespace": 0,
    "no-extra-boolean-cast": 0,
    "no-unused-vars": "off",
    "@typescript-eslint/indent": ["error", 2], // tab 缩进2空格
  }
}
```


.eslintignore
```
dist
.eslintrc.js
webpack.*
postcss.*
**/*.test.js

```

## 添加editorconfig和prettier来约束代码的书写规范

对于它们两的区别就是，editorconfig它主要做一节比较基础的格式化，如：Tab缩进几格、文件编码是否是utf-8等，和编程语言无关，你可能会在任何项目中看到它。而prettier是js特有的格式化工具，里面有很多配置项是js这门语言特有的规范。


它们的功能会有重叠，但大多数并不相同。所以前端项目往往两者都有。


总的来说就是在前端中，大部分editorconfig能干的，prettier也能干，它不能干的，prettier也能干。非要选一个的话，肯定选prettier



**然后将prettier规范扩展到eslint中，首先是需要安装prettier**

[eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier)

`yarn add prettier eslint-plugin-prettier eslint-config-prettier -D`

然后配置.prettierrc.js
```js

module.exports = {
  tabWidth: 2,
  semi: true,
  singleQuote: true
}

```

.prettierignore
```
**/*.svg
package.json
/dist
.dockerignore
.DS_Store
.eslintignore
*.png
*.toml
docker
.editorconfig
Dockerfile*
.gitignore
.prettierignore
LICENSE
.eslintcache
*.lock
yarn-error.log
.history
CNAME
/build
/public

```

在eslint中添加对应扩展
```js
module.exports = {
  ...
  "extends": [
    ...
    "plugin:prettier/recommended"
  ],
  "plugins": [
    ...
    "prettier"
  ],
  "rules": {
    ...
    "prettier/prettier": "error",
  }
}

```


.editorconfig 需要在vscode中配合editorconfig插件使用
```
# http://editorconfig.org
root = true

[*]
charset = utf-8
end_of_line = lf
indent_size = 2
indent_style = space
insert_final_newline = true
max_line_length = 80
trim_trailing_whitespace = true

[*.md]
max_line_length = 0
```


## 使用husky和lint-stage构建代码检查工作流

完成以上的配置后，我们需要在package.json中添加两个script脚本,方便我们在代码书写完成后运行命令来检查代码

```json
{
    "scripts": {
        "lint": "eslint --ext .tsx,.ts,.js src/",
        "prettier": "prettier -c --write \"src/**/*\"",
    }
}
```

但是这一步还是需要开发者手动完成。你不能保证每个人都有和你相同的习惯。所以我们需要有一个Lint环节(Code Linting)，他是保障代码规范一致性的重要环节。同时，他会减少代码出错的概率。这也是变相的节约公司的时间和自己的时间。

而husky封装了githook，在代码提交前运行脚本对代码进行预检。

1. 安装husky `yarn add husky -D`
2. 在package.json中添加一个script，并运行一次
```json
{
    "prepare": "husky install"
}
```
`yarn run prepare`

3. 添加一个hook
```
npx husky add .husky/pre-commit "npm run lint"
git add .husky/pre-commit
```

然后提交代码,他会在每次commit前运行npm run lint
`git commit -m "Keep calm and commit"`

但是在遗留代码库工作会遇到新的问题，开启Lint初期，你改动一个文件，可能其他文件中也有大量lint error需要修复。但是修改整个项目显然成本很高，且容易出错。所以为了稳定，肯定是最好能lint修改的部分。其他的部分渐进修改。

基于这个想法lint-staged出现了，stage就是git中的概念，指待提交区，在配合lint-stage后。你的每次commit都只会lint你的待提交区的修改过的代码。

用法如下：

首先安装
`yarn add lint-staged -D`

然后修改package.json配置，或者其他形式的配置文件

```json
{

  "lint-staged": {
    "**/*.{js,jsx,ts,tsx}": "npm run lint",
    "**/*.{js,jsx,tsx,ts,less,md,json}": [
      "prettier --write"
    ]
  },
}
```

然后在 .husky/pre-commit脚本中添加`npx --no-install lint-staged`命令，这样。每次commit前都会根据lint规则预检代码且通过prettier命令修改代码格式，并且这些操作都控制在了待提交区的代码中

.husky/pre-commit
```
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm test
npx --no-install lint-staged

```


## 使用commitlint + husky约束commit信息格式

一个项目中，提交的信息也是非常的重要，如果没有规范约束，提交的备注经常是五花八门的，非常不利于后期追踪和排查问题。

1. 安装相关库，前面已经安装过了husky
`yarn add @commitlint/config-conventional @commitlint/cli -D`

commitlint是一个用来检查commit message格式是否符合要求的第三方工具，而husky是commit提交前的git hook，用来运行commit lint 规范

2. 配置commitlint.config.js规范
```js
// commitlint.config.js

module.exports = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "type-enum": [
            2,
            "always",
            [
                "feat", // 增加新功能
                "fix", // 修复bug
                "docs", // 只改动了文档相关的内容
                "style", // 不影响代码含义的改动，例如去掉空格、改变缩进、增删分号
                "refactor", // 代码重构时使用
                "test", // 添加测试或者修改现有测试
                "build", // 构造工具的或者外部依赖的改动，例如webpack，npm
                "chore", // 不修改src或者test的其他修改，例如构建过程或辅助工具的变更
                "revert", // 执行git revert打印的message
                "pref", // 提升性能的改动
                "merge" // 代码合并
            ]
        ],
        "type-case": [0],
        "type-empty": [0],
        "scope-empty": [0],
        "scope-case": [0],
        "subject-full-stop": [0, "never"],
        "subject-case": [0, "never"],
        "header-max-length": [0, "always", 72]
    }
};
```

3. 添加shell脚本
`npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"'`

执行完后，.husky目录如下

```
-
- commit-msg
- pre-commit
```

然后就可以修改代码，
然后`git add . && git commit -m 'foo: change' `来测试了，正常会报错如下信息

**type must be one of [feat, fix, docs, style, refactor, test, build, chore, revert, pref, merge] [type-enum]**
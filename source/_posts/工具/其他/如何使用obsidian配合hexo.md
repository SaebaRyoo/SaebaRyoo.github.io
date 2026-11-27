---
title: 如何使用 Obsidian 配合 Hexo
date: 2026-11-27 11:48:00
categories:
  - 工具
tags:
  - Hexo
  - Obsidian
  - GitHub Actions
description: 用 Obsidian 写 Hexo 博客的完整方案：vault 目录约定、图片路径、front-matter 模板，以及从粘贴图片到 GitHub Actions 自动发布的整条链路。
---

用 Obsidian 写 Hexo 博客，体验其实很顺：Obsidian 负责「写」，Hexo 负责「发」。真正麻烦的不是写作，而是图片——放哪、链接怎么写、发布时怎么保证不丢。

这篇把我现在跑通的这套方案完整记一遍。

## 一、分工：各管各的

Obsidian 管三件事：

- 写 Markdown
- 管理附件（图片）
- 通过 Obsidian Git 插件 commit / push

Hexo 管三件事：

- 读 front-matter（标题、日期、分类、标签）
- 把 Markdown 渲染成 HTML
- 把 `source/` 里的静态文件复制进 `public/` 并发布

所以两边只需要对齐两个接口：**front-matter** 和 **图片路径**。把这两个定死，剩下的都很省心。

## 二、目录约定

| 项目 | 约定 |
| --- | --- |
| Obsidian vault | `source/` |
| 文章 | `source/_posts/<分类>/<标题>.md` |
| 图片 | `source/images/` |
| 图片链接 | `![](/images/xxx.png)` |
| 源码分支 | `hexo` |
| 发布分支 | `main` |

几个关键选择：

**vault 用 `source/`，不是仓库根目录。** 这样 `images` 在库内，Obsidian 能直接预览；也不会把 `node_modules`、`public` 这些目录索引进来。附件和文章在同一个 git 仓库里，push 时一起走。

**图片链接用 `/images/xxx.png`，不用相对路径。** Hexo 的文章 URL 是 `/2026/11/27/...` 这种形式，相对路径会解析到文章目录下面；而 `/images/...` 永远指向站点根目录，跟文章 URL 无关。

**图片不放主题目录。** 以前我把图放在 `themes/hexo-theme-bamboo/source/imgs`，虽然也能用，但换主题、升级主题时很容易丢。统一放 `source/images` 才是自己的资产。

## 三、Obsidian 的一次性设置

用 Obsidian 打开 `source` 作为 vault，然后进 **设置 → 文件与链接**：

1. 关闭「使用 [[Wikilinks]]」
2. 新链接格式选「库内绝对路径」
3. 附件默认存放路径选「指定文件夹」，填 `images`

对应的 `source/.obsidian/app.json` 大概是这样：

```json
{
  "newFileLocation": "current",
  "attachmentFolderPath": "images",
  "useMarkdownLinks": true,
  "newLinkFormat": "absolute"
}
```

设置完之后，粘贴截图会得到：

```markdown
![](/images/Pasted%20image%2020261127114804.png)
```

这个链接在 Obsidian 里能预览（因为 `images` 在 vault 内），在 Hexo 里也能用（`source/images` 会被复制到 `public/images`）。两边都不用额外配置。

**为什么一定要关掉 Wikilinks？** 因为 Hexo 的 markdown-it 不认 Obsidian 的 wikilink 嵌入（`!` 加 `[[文件名]]`），生成出来会原样变成文本，图片直接挂掉。标准 Markdown 的 `![]()` 才是两边都认的格式。

另外可以装一个 **Paste image rename** 插件，把 `Pasted image 2026...png` 改成 `20261127-1148-01.png` 这种干净的名字。带空格不是不能用，只是 URL 会变成 `%20`，迁移和写脚本时比较烦。

## 四、Front-matter 模板

每篇文章头部需要这些信息：

```yaml
---
title: 文章标题
date: 2026-11-27 13:00:00
categories:
  - 工具
tags:
  - Hexo
  - Obsidian
---
```

几个注意点：

- **`date` 一定要写。** Hexo 在缺失时会用文件的创建时间，git clone 或换电脑之后日期会全乱。
- **文件名就是标题。** 配置里是 `new_post_name: :title.md`，所以文件名尽量和 `title` 一致。
- **中文标题会转拼音。** 站点用了 `hexo-permalink-pinyin`，URL 里是拼音，不影响阅读。
- 想省事可以用 Obsidian 的 Templates 插件，把上面这段存成模板，新建文章时一键插入。

## 五、图片是怎么「自动上传」的

先纠正一个容易误解的点：**Obsidian 本身不上传任何东西**，它只负责把图片存到本地。真正的「上传」是 git push 加自动构建。

完整链路是这样：

```text
粘贴截图
  → 存到 source/images/xxx.png
  → 文章里插入 ![](/images/xxx.png)
  → obsidian-git commit + push 到 hexo 分支
  → GitHub Actions：npm ci + hexo generate
  → 把 public 推到 main 分支
  → GitHub Pages 更新
```

拆开看：

1. **Obsidian** 把图片存进 `source/images`，并插入 `/images/...` 链接。
2. **obsidian-git** 把文章和图片一起 commit、push。开自动备份后，这一步不用手动做。
3. **GitHub Actions** 在云端跑 `hexo generate`。`source/images` 会被复制到 `public/images`，和文章一起进入构建产物。
4. **部署** 把 `public` 推到 `main`，Pages 直接生效。

如果不用 Actions，本地跑 `npm run gen` 也一样：`hexo clean && hexo generate && hexo deploy`，图片同样会带上。

但两种方式有个关键区别：

- **本地手动 deploy**：直接用本地工作区构建，图片没 commit 也能上站，但换电脑就没了。
- **Actions 自动部署**：只认 git 里的文件，图片必须先 commit，否则构建出来的站点没有这张图。

## 六、日常写作流程

1. 在 `source/_posts/<分类>/` 下新建笔记，文件名用文章标题。
2. 插入 front-matter 模板，填好 `date`、`categories`、`tags`。
3. 正常写，截图直接粘贴。
4. 本地预览：`npm run local`（等价于 `hexo clean && hexo g && hexo s`）。
5. 提交并 push 到 `hexo` 分支（开了 obsidian-git 自动备份的话会自动做）。
6. GitHub Actions 自动构建并发布。

写完之后，浏览器打开对应文章，确认图片能正常显示，就结束了。

## 七、几个踩过的坑

- **用了 Obsidian 的 wikilink 嵌入**：`!` 加 `[[xxx.png]]`，Hexo 不认，必须用 `![]()`。
- **图片放在主题目录**：换主题就丢，应该放 `source/images`。
- **只跑 `hexo d` 不跑 `hexo g`**：新图片不会进 `public`，部署上去是旧的。用 `npm run gen` 或 `npm run local`。
- **依赖 Actions 但图片没 commit**：云端看不到你本地文件，图片会 404。
- **用掘金、语雀的图片外链**：会防盗链、会过期，长期博客不要依赖。
- **开了多个 vault、附件目录不一致**：同一张图会落到不同地方。最好只保留 `source/.obsidian` 一个库配置。
- **`post_asset_folder` 和绝对路径混用**：相对路径、中文目录、空格、URL 编码容易互相打架。这套方案干脆不用 `post_asset_folder`，统一走 `/images`。

## 八、什么时候该上图床

如果以后图片很多、仓库太大，或者经常在手机、多台电脑上写，可以考虑图床：Obsidian 装 **Image auto upload** 插件，配合 PicGo 上传到 GitHub 图床或对象存储，粘贴后文章里直接是 https URL，Hexo 完全不用管路径。

代价是多一个外部依赖，图床挂了文章就挂。个人博客、图片量不大的话，现在这种「图片跟仓库走」的方案更稳。

## 九、检查清单

改完图片或配置后，跑一遍：

```bash
# 1. 不能有 Hexo 不认的 wikilink
grep -rn '!\[\[' source/_posts --include='*.md'

# 2. 本地构建
npx hexo clean && npx hexo generate

# 3. 确认图片进了 public
ls public/images | head
```

再打开 `public` 里对应的文章 HTML，确认 `img` 的 `src` 是 `/images/...`，就说明整条链路通了。

跑通之后，写作就只剩四个动作：新建、写、粘图、push。

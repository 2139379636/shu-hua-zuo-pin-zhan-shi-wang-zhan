# Cloudflare 静态资源部署目录修复设计

## 问题

Cloudflare 控制台通过 Wrangler 将仓库根目录作为静态资源目录上传。由于仓库根目录包含 `.git`，部署扫描到了 51.8 MiB 的 Git pack 文件，超过 Workers 单个资源 25 MiB 的限制。

## 目标

让 Cloudflare Git 自动部署排除 Git 历史和明确的开发期目录，同时保留当前网站运行所需的 HTML、CSS、JavaScript、数据、图片和滚动画面帧。

## 设计

在仓库根目录新增 `.assetsignore`，只排除以下确定不参与网站运行的目录：

```text
.git/
.superpowers/
docs/
design-system/
research/
tests/
screenshots/
scripts/
```

不排除 `workers/`、Python 文件、Markdown、文本文件或视频文件，避免影响后台代理部署和未来可能的资源引用。网页源文件、`lib/`、`data/`、`素材/` 以及 `素材/视频切割/` 保持原样上传。

## 影响范围

- 不修改 HTML、CSS、JavaScript、图片或数据文件。
- 不删除本地文件，不改写 Git 历史。
- `.git/` 不属于网站资源，排除后不会影响浏览器端效果。
- `workers/github-cors-proxy.js` 继续保留，后台代理仍可单独部署。

## 验证

1. 使用 Wrangler dry-run 检查资源清单不再包含 `.git/`。
2. 确认首页引用的页面、脚本、样式、图片、数据和滚动画面帧仍在资源范围内。
3. 运行现有项目测试，确认本次只影响部署过滤规则。
4. 在 Cloudflare 控制台重新部署，确认不再出现超过 25 MiB 的 `.git/objects/pack` 报错。

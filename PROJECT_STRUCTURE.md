# 个人主页项目结构说明

## 项目概述

本项目是基于 **Hugo** 静态网站生成器和 **Blowfish** 主题构建的个人主页/博客网站。

- **站点名称**: HOMEPAGE
- **作者**: LazySapphire
- **主题**: Blowfish
- **Hugo 版本**: 0.125.4
- **默认外观**: 深色模式 (Dark Mode)
- **托管平台**: GitHub Pages
- **自动部署**: GitHub Actions

---

## 目录结构

```
LazySapphire.github.io/
├── 📄 index.html                    # 网站首页
├── 📄 404.html                      # 404 错误页面
├── 📄 index.json                    # JSON Feed
├── 📄 index.xml                     # RSS Feed
├── 📄 sitemap.xml                   # 站点地图
├── 📄 robots.txt                    # 搜索引擎爬虫配置
├── 📄 site.webmanifest              # PWA 配置文件
│
├── 📁 about/                        # 关于页面
│   └── index.html
│
├── 📁 resume/                       # 个人简历页面
│   ├── index.html
│   ├── featured.jpeg                # 简历封面图
│   └── featured_*.jpeg              # 不同尺寸的封面图
│
├── 📁 posts/                        # 博客文章目录
│   ├── index.html                   # 文章列表页
│   ├── index.xml                    # 文章 RSS Feed
│   ├── page/                        # 分页目录
│   │
│   ├── 📁 first/                    # 第一篇文章: Build & Deploy
│   │   └── index.html
│   │
│   └── 📁 2024/                     # 2024 年文章
│       ├── 📁 offlinerl配置_d4rl-corl/    # Offline RL 配置文章
│       └── 📁 调试与部署流程/              # 调试与部署流程文章
│
├── 📁 tags/                         # 标签归档
│   ├── index.html
│   ├── index.xml
│   ├── 📁 offlinerl/                # OfflineRL 标签
│   └── 📁 resume/                   # Resume 标签
│
├── 📁 categories/                   # 分类归档
│   ├── index.html
│   └── index.xml
│
├── 📁 series/                       # 系列文章归档
│   ├── index.html
│   └── index.xml
│
├── 📁 authors/                      # 作者信息
│   ├── index.html
│   └── index.xml
│
├── 📁 page/                         # 分页目录
│
├── 📁 none/                         # 无分类内容
│
├── 📁 css/                          # 样式文件
│   └── main.bundle.min.css          # 主样式 (带完整性校验)
│
├── 📁 js/                           # JavaScript 文件
│   ├── main.bundle.min.js           # 主脚本
│   ├── appearance.min.js            # 主题切换脚本
│   └── zoom.min.js                  # 图片缩放脚本
│
├── 📁 lib/                          # 第三方库
│
├── 📁 img/                          # 图片资源
│
├── 📁 .github/
│   └── 📁 workflows/
│       └── static.yml               # GitHub Actions 部署配置
│
└── 🖼️ Favicon 文件
    ├── favicon.ico
    ├── favicon-16x16.png
    ├── favicon-32x32.png
    ├── apple-touch-icon.png
    ├── android-chrome-192x192.png
    └── android-chrome-512x512.png
```

---

## 各目录功能说明

### 内容页面 (Content Pages)

| 目录 | 说明 |
|------|------|
| `about/` | 关于页面，介绍作者信息 |
| `resume/` | 个人简历页面，包含个人简介和经历 |
| `posts/` | 博客文章存放目录，按年份和文章名组织 |

### 文章组织 (Taxonomies)

| 目录 | 说明 |
|------|------|
| `tags/` | 标签系统，用于按主题标记文章 |
| `categories/` | 分类系统，用于按类别组织文章 |
| `series/` | 系列文章，用于关联相关文章 |
| `authors/` | 作者信息，支持多作者 |

### 静态资源 (Static Assets)

| 目录 | 说明 |
|------|------|
| `css/` | 编译后的 CSS 样式文件 |
| `js/` | JavaScript 脚本文件 |
| `lib/` | 第三方库文件 |
| `img/` | 图片资源 |

---

## 技术栈说明

### 核心工具
- **Hugo**: 静态网站生成器 (Go 语言编写，速度极快)
- **Blowfish**: Hugo 主题，支持深色/浅色模式切换

### 前端技术
- **HTML5**: 语义化标记
- **CSS3**: 使用 Tailwind CSS 构建
- **JavaScript**: 原生 JS，无大型框架依赖
- **PWA**: 支持渐进式 Web 应用

### SEO & 元数据
- Open Graph 标签 (社交媒体分享)
- Twitter Card 标签
- JSON-LD 结构化数据 (Schema.org)
- RSS/JSON Feed
- Sitemap.xml

---

## 部署流程

### GitHub Actions 自动部署 (`.github/workflows/static.yml`)

```yaml
触发条件:
  - push 到 main 分支
  - 手动触发 (workflow_dispatch)

部署步骤:
  1. Checkout 代码
  2. 配置 GitHub Pages
  3. 上传构建产物
  4. 部署到 GitHub Pages
```

### 部署特性
- **零配置部署**: 推送到 main 分支即可自动部署
- **原子部署**: 使用 GitHub Pages 的原子更新
- **并发控制**: 防止同时触发多个部署

---

## 文件命名规范

### 文章文件
- 使用小写字母
- 多单词使用连字符 `-` 或下划线 `_`
- 支持中文路径（如 `调试与部署流程`）

### 资源文件
- 图片使用描述性名称
- 封面图推荐使用 `featured.jpeg`
- 响应式图片使用 `featured_<width>x<height>_resize_<quality>_<mode>.jpeg` 格式

---

## 维护建议

1. **新增文章**: 在 `posts/` 下创建新目录，添加 `index.html`
2. **修改简历**: 编辑 `resume/index.html`
3. **添加标签**: 在文章 Front Matter 中添加标签，Hugo 自动生成标签页
4. **样式调整**: 修改 Hugo 主题配置或覆盖 CSS 变量
5. **本地预览**: 使用 `hugo server -D` 命令

---

*最后更新: 2024-05-01*

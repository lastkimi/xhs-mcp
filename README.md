# XHS-CLI/XHS-MCP

面向个人创作者的小红书 MCP 服务器和 CLI 工具 - 帮助创作者管理、分析和发布小红书内容

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-orange.svg)](https://modelcontextprotocol.io/)

## Why XHS-CLI

个人创作越来越依赖各种数字工具，却缺少把它们串联起来的粘合剂。XHS-CLI 通过统一的 CLI 与 MCP Server，把浏览器自动化、内容模板、数据接口与 AI 协作能力打包在一起，让创作者可以在本地脚本、自动化服务或智能助手中无缝调用同一套小红书工作流，真正做到"内容策略—素材生成—账号运营"全链路联动。

## 🚀 最近更新

- ✅ **Trae 编辑器支持** - 新增对 Trae 编辑器的 MCP 集成支持
- ✅ **内容模板优化** - 提供5大话题范文模板，涵盖美妆、生活、求助等场景
- ✅ **MCP 配置增强** - 支持描述、类型和禁用状态等高级配置选项
- ✅ **示例管理** - 内置范文示例系统，支持查看、创建和管理内容模板



## 核心功能

- 🔗 一套 CLI/MCP 接口即可连接浏览器自动化、脚本和 AI，构建属于自己的内容工作流
- 📥 扫描并缓存历史笔记，作为上下文喂给智能助手或自动化流程
- 🎯 按模板生成新内容、封面与素材，确保账号调性一致
- 📊 拉取运营/画像数据并序列化输出，便于可视化或进一步分析
- 🚀 将发布、排期、素材管理全流程开放出来，方便接入任何数字工具链
- 📝 **内容范文系统** - 内置丰富的话题模板，快速生成高质量内容
- 🤖 **多编辑器支持** - 支持 Claude Desktop、Cursor、Trae 等主流 AI 编辑器

## 安装

```bash
# 全局安装（推荐）
npm install -g xhs-cli

```

**注意**：
- 本包在安装时**不会下载 Chromium**（减少安装体积），会自动使用系统已安装的 Chrome/Chromium 浏览器
- 如果您的系统没有安装 Chrome/Chromium，请先安装 Chrome 浏览器，然后再运行`xhs login`命令。


## 前置要求

- Node.js >= 18.0.0
- Chrome/Chromium 浏览器（Puppeteer 需要）

## 快速开始

### 1. 登录

```bash
xhs login
```

这会打开浏览器，让你登录小红书账号。

xhs-cli不会保存您的登录信息，所有的信息都存储在您的浏览器里。


### 2. 检查登录状态

```bash
xhs check-login
```

### 3. 退出登录

```bash
xhs logout
```

这会清除保存在 `~/.xhs-mcp/browser-data` 下的浏览器缓存文件，下次需要重新登录。


### 4. 获取账号信息

```bash
xhs get-my-profile
```

## 可用命令

### 账号管理

```bash
# 登录小红书账号
xhs login

# 退出登录并清除缓存
xhs logout

# 检查登录状态
xhs check-login

# 获取用户资料
xhs get-my-profile
```

### 数据获取

```bash
# 获取运营数据
xhs get-operation-data

# 获取近期笔记列表
xhs get-recent-notes

# 根据笔记ID获取笔记详情
xhs get-note-detail-by-id <noteId>
```

### 内容发布

```bash
# 添加 post 到队列
xhs add-post "内容" --title "标题" --images "img1.jpg,img2.jpg" --scheduled-time "2024-01-01T10:00:00Z"

# 发布队列中的 post
xhs post [filename]

# 列出待发布的 post
xhs list-available-post
```

### 查看帮助

```bash
xhs
```

运行不带参数会显示所有可用命令的详细说明。



## MCP 服务器

这个包同时也是一个 MCP（Model Context Protocol）服务器，可以与支持 MCP 的客户端（如 Cursor、Claude Desktop、Trae 等）集成。

### 🎯 支持的编辑器

- **Claude Desktop** - Anthropic 官方 AI 助手
- **Cursor** - AI 驱动的代码编辑器
- **Trae** - 新一代 AI 编程工具

### 配置 MCP 客户端

详细的 MCP 配置说明请参阅本仓库根目录的 [MCPCOOKBOOK](MCPCOOKBOOK.md)。

#### 快速配置

```bash
# 配置所有支持的编辑器
npm run setup-mcp -- --all

# 单独配置 Trae
npm run setup-mcp -- --trae

# 单独配置 Claude Desktop
npm run setup-mcp -- --claude

# 单独配置 Cursor
npm run setup-mcp -- --cursor
```

配置完成后，重启相应的编辑器即可使用 MCP 功能。


## 功能特性

- ✅ 完整的 TypeScript 支持
- ✅ 缓存机制保护账号访问频率
- ✅ 命令行工具，易于使用
- ✅ MCP 协议支持，可集成 AI 工具
- ✅ 面向个人创作者设计
- ✅ **范文示例系统** - 提供5大话题模板：颜究好物、氛围技巧、紧急求助、萌图萌句、拔草防雷
- ✅ **智能内容建议** - 基于历史数据提供内容创作建议
- ✅ **多平台 MCP 支持** - 同时支持 Claude Desktop、Cursor 和 Trae 编辑器
- ✅ **封面生成功能** - 自动为帖子生成精美封面图片
- ✅ **批量示例管理** - 支持批量创建和管理内容示例

## 许可证

MIT

## 相关链接

- GitHub: https://github.com/lastkimi/xhs-mcp
- 问题反馈: https://github.com/lastkimi/xhs-mcp/issues
- 文档指南: [MCPCOOKBOOK.md](MCPCOOKBOOK.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📝 更新日志

### v1.1.0 (2024-11-18)
- 新增 Trae 编辑器 MCP 支持
- 优化内容模板系统，新增5大话题范文
- 改进 MCP 配置流程，支持更多自定义选项
- 增强示例管理和内容创作功能


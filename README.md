# XHS-CLI/XHS-MCP

面向个人创作者的小红书 MCP 服务器和 CLI 工具 - 帮助创作者管理、分析和发布小红书内容


## Why XHS-CLI

个人创作越来越依赖各种数字工具，却缺少把它们串联起来的粘合剂。XHS-CLI 通过统一的 CLI 与 MCP Server，把浏览器自动化、内容模板、数据接口与 AI 协作能力打包在一起，让创作者可以在本地脚本、自动化服务或智能助手中无缝调用同一套小红书工作流，真正做到“内容策略—素材生成—账号运营”全链路联动。



## 核心功能

- 🔗 一套 CLI/MCP 接口即可连接浏览器自动化、脚本和 AI，构建属于自己的内容工作流
- 📥 扫描并缓存历史笔记，作为上下文喂给智能助手或自动化流程
- 🎯 按模板生成新内容、封面与素材，确保账号调性一致
- 📊 拉取运营/画像数据并序列化输出，便于可视化或进一步分析
- 🚀 将发布、排期、素材管理全流程开放出来，方便接入任何数字工具链

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

这个包同时也是一个 MCP（Model Context Protocol）服务器，可以与支持 MCP 的客户端（如 Cursor、Claude Desktop 等）集成。



### 配置 MCP 客户端

详细的 MCP 配置说明请参阅本仓库根目录的 [MCPCOOKBOOK](MCPCOOKBOOK.md)。


## 功能特性

- ✅ 完整的 TypeScript 支持
- ✅ 缓存机制保护账号访问频率
- ✅ 命令行工具，易于使用
- ✅ MCP 协议支持，可集成 AI 工具
- ✅ 面向个人创作者设计

## 许可证

MIT

## 相关链接

- GitHub: https://github.com/joohw/xhs-cli
- 问题反馈: https://github.com/joohw/xhs-cli/issues


<div align="right">
  <b>简体中文</b> | <a href="README.md">English</a>
</div>

# Agent Infra Browser

@agent-infra/browser 致力于构建一个专为 AI Agent 设计的综合性浏览器基础设施 SDK。

<br />

## 这个工具的用途

这个工具包专门为以下场景设计：

- 需要与 Web 浏览器交互的 **GUI AI Agent**
- 非 VNC 场景或 headless 场景下的**浏览器投屏**
- Browser 自动化控制的 **MCP 服务**

## 架构

![architecture](./docs/images/architecture.png)

## 包概览

### [@agent-infra/browser](./packages/browser)

**核心浏览器控制库**。抽象并封装了操纵浏览器所需要的基础能力。

### [@agent-infra/browser-ui](./packages/browser-ui)

**浏览器投屏 UI 组件**。可通过 CDP 与远程浏览器连接，然后显示它的投屏内容。

<div align="center" style="width: 600px">
<video src="https://github.com/user-attachments/assets/7394eccc-0d07-4764-8265-aa5b4b56d5f7" controls="true" width="600"></video>
</div>

### [@agent-infra/browser-finder](./packages/browser-finder)

**跨平台浏览器检测**。自动定位在 Windows、macOS 和 Linux 系统上安装的浏览器（Chrome、Edge、Firefox）。

### [@agent-infra/browser-context](./packages/browser-context)

**智能网页内容提取**。使用高级算法和浏览器自动化支持从网页中提取干净、可读的内容并转换为 Markdown 格式。

### [@agent-infra/media-utils](./packages/media-utils)

**媒体处理工具**。用于处理浏览器相关任务的媒体工具，如高性能 base64 图像解析和媒体资源处理。

<br />

## 开发

这是一个使用 **pnpm** 管理的 monorepo。开始使用：

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm run build

# 运行测试
pnpm run test

# 代码检查
pnpm run lint
```

<br />

## 系统要求

- **Node.js** >= 20.x
- **pnpm** 用于包管理
- **Chrome/Chromium** 浏览器实例

<br />

## 许可证

本项目采用 Apache License 2.0 许可证。

<br />

## 致谢

特别感谢启发了这个工具包的开源项目：

- [puppeteer](https://github.com/puppeteer/puppeteer) - 底层浏览器自动化库
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - Chrome 开发者工具协议
- [ChatWise](https://chatwise.app/) - 浏览器检测功能参考
- [readability](https://github.com/mozilla/readability/) - readability 库的独立版本
- [edge-paths](https://github.com/shirshak55/edge-paths) - Edge 浏览器路径查找器

<div align="right">
  <b>简体中文</b> | <a href="README.md">English</a>
</div>

# @agent-infra/browser-ui

**@agent-infra/browser-ui** 是一个基于 CDP 的浏览器远程投屏解决方案。它基于 **@agent-infra/browser** 实现了基础能力封装，可以被网页直接作为 Web 组件引用。

用户只需要提供有权限的 CDP WebSocket URL，**@agent-infra/browser-ui** 就可以展示远程浏览器的页面，同时你也可以手动介入浏览器操作，在没有 VNC 和无头浏览器的场景下非常有用。

## 安装

```bash
npm install @agent-infra/browser-ui
```

## 快速开始

```typescript
import { BrowserUI } from '@agent-infra/browser-ui';

const container = document.getElementById('browserContainer');
if (!container) {
  throw new Error('Browser container element not found');
}

BrowserUI.create({
  root: container,
  browserOptions: {
    browserWSEndpoint: 'ws://localhost:9222', // 您的 CDP WebSocket 端点
  },
});
```

## 核心功能

关于所有功能的详细文档和 API 参考，请访问我们的[完整文档](https://github.com/agent-infra/browser/blob/main/docs/browser-ui.zh-CN.md)。

- **标签页管理** - 显示所有标签页并实现 `switchTab`/`createTab`/`closeTab` 功能
- **导航控制** - 基础功能如 `goBack`/`goForward`/`reload`/`goto`
- **对话框处理** - 实时显示并响应阻塞弹窗如 `Alert`/`Confirm`
- **鼠标操作** - 支持 `move`/`hover`/`click`/`drag` 操作
- **键盘输入** - 完整键盘支持，包括常用热键
- **剪贴板模拟** - 模拟剪贴板功能用于复制粘贴操作


## 系统要求

- Node.js >= 20.x
- 支持远程调试的 Chrome/Chromium 浏览器
- 可访问 CDP WebSocket 端点的网络环境

## 许可证

Apache License 2.0.

## 致谢

特别感谢启发此工具包的开源项目：

- [puppeteer](https://github.com/puppeteer/puppeteer) - 底层浏览器自动化库
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - Chrome 开发者协议
<div align="right">
  <b>简体中文</b> | <a href="README.md">English</a>
</div>

# @agent-infra/browser

**@agent-infra/browser** 是一个基于 **puppeteer** 的 SDK，专门设计用于为浏览器代理提供基础功能。它提供了标签页管理、对话框处理、热键支持等方面的高级抽象，同时保持了简单直观的 API。

## 安装

```bash
npm install @agent-infra/browser
```

## 快速开始

这是一个简单的使用示例。Browser 会找到您计算机上安装的 Chrome 或 Edge 浏览器，启动一个受控的浏览器实例，然后通过 CDP 控制执行一些操作。

```typescript
import { Browser } from '@agent-infra/browser';

// 创建浏览器实例
const browser = await Browser.create();

// 设置 User-Agent（可选）
browser.setUserAgent({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

// 获取当前活动标签页
const activeTab = browser.getActiveTab();

// 导航到指定网页
await activeTab.goto('https://example.com');

// 截图
const screenshot = await activeTab.screenshot();

// 关闭浏览器
await browser.close();
```

## 完整文档

有关详细的 API 文档和高级使用示例，请参考我们的[完整文档](../../docs/browser.zh-CN.md)。

## 许可证

Apache License 2.0。

## 致谢

特别感谢启发此工具包的开源项目：

- [puppeteer](https://github.com/puppeteer/puppeteer) - 底层浏览器自动化库
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - Chrome 开发者工具协议
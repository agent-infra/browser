# 前言

@agent-infra/browser 是一套基于 puppeteer 的专为 browser agent 提供基础功能的 sdk。

puppeteer 是一款非常优秀的浏览器自动化控制软件，它封装了许多 CDP 操作，并提供了一套非常简洁的 API 供用户去使用。但是基于 puppeteer 构建 GUI Agent 的过程中，会发现它缺乏一些更为上层和通用的封装，例如 tabs 的管理，dialog 状态管理，hotkey 支持等。

@agent-infra/browser 就是为了解决上述的痛点而生，它提供的 API 在保持简洁的同时，还非常贴近操作浏览器的直觉，基于这点可以非常快速的封装出一个 Browser GUI Agent，一个 Browser Use Demo，或者是一个 Browser-Use-MCP。

<br />

# 快速开始

## 安装

```bash
npm install @agent-infra/browser
```

<br />

## 基本用法

下面是一个最简单的使用 demo，Browser 将会寻找电脑上已经安装的 chrome or edge 浏览器，然后会启动一个受控的浏览器实例，然后通过 CDP 控制它执行一些操作。

```typescript
import { Browser } from '@agent-infra/browser';

// 创建浏览器实例
const browser = await Browser.create();

// 获取当前活跃标签页
const activeTab = browser.getActiveTab();

// 导航到指定网页
await activeTab.goto('https://example.com');

// 截图
const screenshot = await activeTab.screenshot();

// 关闭浏览器
await browser.close();
```

<br />

## 标签页管理

不同于 puppeteer，@agent-infra/browser 抽象了一套 tabs 的概念，然后提供了相关的 API 去管理它。

```typescript
// 创建新标签页
const newTabId = await browser.createTab();

// 获取所有标签页快照
const tabsSnapshot = browser.getTabsSnapshot();

// 切换到指定标签页
await browser.activeTab(tabId);

// 关闭标签页
await browser.closeTab(tabId);
```

<br />

## Tab 内导航

对于 activeTab，用户可以通过相关 API 做导航操作。

```typescript
const tab = browser.getActiveTab();

// 导航
await tab.goto('https://example.com')

// 前进
await tab.goForward();

// 后退
await tab.goBack();

// 刷新
await tab.reload();
```

<br />

## 鼠标和键盘操作

在鼠标操作上，目前 @agent-infra/browser 封装了一套 vision 方案（也就是通过坐标去执行相关 action），后续我们会支持基于 DOM 的解决方案。

在键盘操作上，在 puppeteer 原有基础上我们内置了的常见的快捷键（例如 复制/黏贴）支持，用户可以直接使用。

```typescript
const tab = browser.getActiveTab();

// 鼠标点击
await tab.mouse.vision.click(100, 200);

// 鼠标移动
await tab.mouse.vision.move(150, 250);

// 鼠标滚动
await tab.mouse.vision.scroll('down', 300);

// 键盘输入
await tab.keyboard.type('Hello World');

// 键盘快捷键
await tab.keyboard.press('ctrl+c'); // 复制
await tab.keyboard.press('ctrl+v'); // 粘贴
```

<br />

## Cookie 管理

cookie 操作我们保留了和 puppeteer 一样的 API，更详细的用法可参考 [Cookies|Puppeteer](https://pptr.dev/guides/cookies)。

```typescript
// 获取所有 cookies
const cookies = await browser.cookies();

// 设置 cookie
await browser.setCookie({
  name: 'session',
  value: 'abc123',
  domain: 'example.com'
});

// 删除 cookie
await browser.deleteCookie({ name: 'session', domain: 'example.com' });

// 批量删除匹配的 cookies
await browser.deleteMatchingCookies({ domain: 'example.com' });
```

<br />

# API

## Browser 类

浏览器主类，主要提供 tabs 管理和 cookie 注入等功能。

<br />

### 生命周期

#### `Browser.create(options?: LaunchOptions): Promise<Browser>`

创建并初始化浏览器实例。LaunchOptions 就是 puppeteer 的[启动参数类型](https://pptr.dev/browsers-api/browsers.launchoptions)，但是又有一些不一样的地方：

> puppeteer可以通过 [`puppeteer.launch`](https://pptr.dev/api/puppeteer.launchoptions) 中的 `args` 参数控制 Chrome 的启动行为。关于具体的逻辑和参数，请参考源代码 [puppeteer - ChromeLauncher.ts](https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/node/ChromeLauncher.ts)。

1. 除了 puppeteer-core 的内置参数外，调用 `Browser.create` 还默认添加了以下参数，以优化浏览器的使用体验：

| 参数                                                             | 描述                                       |
| --------------------------------------------------------------- | ------------------------------------------ |
| `--mute-audio`                                                  | 静音任何音频                                 |
| `--no-default-browser-check`                                    | 禁用默认浏览器检查，不提示设置为默认浏览器        |
| `--ash-no-nudges`                                               | 避免蓝色气泡“用户教育”提示                     |
| `--window-size=defaultViewport.width,defaultViewport.height+90` | 设置初始窗口大小。                            |

<br />

2. 以下 puppeteer-core 参数默认被忽略：

| 参数                   | 描述                                                      |
| --------------------- | --------------------------------------------------------- |
| `--enable-automation` | 避免在浏览器启动时出现“Chrome 正在被自动化软件控制”的提示         |

<br />

3. 默认的 ViewPort 设置为 `{ width: 1280, height: 1024 }`，目的是为了和 AIO Sandbox 的默认浏览器尺寸保持一致。


#### `disconnect(): Promise<void>`

断开浏览器连接（不关闭浏览器进程）。

#### `close(): Promise<void>`

销毁 Browser 实例，并关闭启动的浏览器进程。

<br />

### Meta 信息

#### `getBrowserMetaInfo(): Promise<object>`

获取浏览器元信息，返回类型如下：

```typescript
import type { Viewport } from 'puppeteer-core';

interface BrowserMetaInfo {
  envInfo: EnvInfo;
  userAgent: string;
  viewport: Viewport;
  wsEndpoint: string;
}

interface EnvInfo {
  osName: 'Windows' | 'macOS' | 'Linux' | 'Unknown';
  browserName: 'Chrome' | 'Edge' | 'Firefox' | 'Unknown';
  browserVersion: string;
}
```

<br />

### Tabs 管理

#### `close(): Promise<void>`

关闭浏览器并清理所有资源。

#### `getActiveTab(): Tab | null`

获取当前活跃的标签页。

#### `createTab(): Promise<string>`

创建新标签页并返回标签页 ID。

#### `activeTab(tabId: string): Promise<boolean>`

切换到指定标签页。

#### `closeTab(tabId: string): Promise<boolean>`

关闭指定标签页。

#### `getTabsSnapshot(): TabsState`

获取所有标签页的当前状态快照。

```typescript
interface TabsState {
  tabs: Map<string, TabMeta>;
  activeTabId: string | null;
}

interface TabMeta {
  id: string;
  title: string;
  url: string;
  favicon: string | null;
  isLoading: boolean;
  isActive: boolean;
  dialog?: DialogMeta;
}

interface DialogMeta {
  type: "alert" | "confirm" | "prompt" | "beforeunload";
  message: string;
  defaultValue: string;
}
```

#### `subscribeTabChange(callback: () => void): () => void`

订阅标签页变化事件，返回取消订阅函数。可以通过 `subscribeTabChange` 和 `getTabsSnapshot` 达到实时监听 tabs 变动的目的。

<br />

### Cookies 管理

#### `cookies(): Promise<Cookie[]>`

获取所有 cookies。可直接参考 [Browser.cookies | Puppeteer](https://pptr.dev/api/puppeteer.browser.cookies)。

#### `setCookie(...cookies: CookieData[]): Promise<void>`

设置一个或多个 cookies。可直接参考 [Browser.setcookie | Puppeteer](https://pptr.dev/api/puppeteer.browser.setcookie)。

#### `deleteCookie(...cookies: Cookie[]): Promise<void>`

删除一个或多个 cookies。可直接参考 [Browser.deletecookie | Puppeteer](https://pptr.dev/api/puppeteer.browser.deletecookie)。

#### `deleteMatchingCookies(...filters: DeleteCookiesRequest[]): Promise<void>`

批量删除匹配指定条件的 cookies。可直接参考 [Browser.deleteMatchingCookies | Puppeteer](https://pptr.dev/api/puppeteer.browser.deleteMatchingCookies)。

<br />

## Tab 类

标签页类，提供页面级别的操作功能。

### 导航

#### `goto(url: string, options?: NavigationOptions): Promise<void>`

导航到指定 URL。可直接参考 [Page.goto | Puppeteer](https://pptr.dev/api/puppeteer.page.goto)。

#### `goBack(options?: NavigationOptions): Promise<boolean>`

导航到上一页。可直接参考 [Page.goBack | Puppeteer](https://pptr.dev/api/puppeteer.page.goBack)。

#### `goForward(options?: NavigationOptions): Promise<boolean>`

导航到下一页。可直接参考 [Page.goForward | Puppeteer](https://pptr.dev/api/puppeteer.page.goForward)。

#### `reload(options?: NavigationOptions): Promise<void>`

重新加载当前页面。可直接参考 [Page.reload | Puppeteer](https://pptr.dev/api/puppeteer.page.reload)。

<br />

### 键盘操控

#### `press(key: KeyOrHotKeyInput, options?: KeyboardOptions): Promise<void>`

按下并释放按键或组合键。

组合键类似于 `Ctrl+C`，`Ctrl+V`，类型为 `string`，单个按键之间用 `+` 连接。不用刻意区分操作系统（例如对于复制这个快捷键来说，Win/Linux 上使用 `Ctrl`，macOS 上使用 `Command`），内部已经做了兜底适配。

非组合键可直接参考 [Keyboard.reload | Puppeteer](https://pptr.dev/api/puppeteer.keyboard.press)。

#### `down(key: KeyOrHotKeyInput, options?: KeyboardOptions): Promise<void>`

按下按键（不释放）。可参考 [Keyboard.down | Puppeteer](https://pptr.dev/api/puppeteer.keyboard.down)。

#### `up(key: KeyOrHotKeyInput): Promise<void>`

释放按键。可参考 [Keyboard.up | Puppeteer](https://pptr.dev/api/puppeteer.keyboard.up)。

#### `type(text: string, options?: KeyboardOptions): Promise<void>`

输入文本。可参考 [Keyboard.type | Puppeteer](https://pptr.dev/api/puppeteer.keyboard.type)。

<br />

### 鼠标操控 (Vision)

#### `click(x: number, y: number, options?: MouseClickOptions): Promise<void>`

在指定坐标点击鼠标。可直接参考 [Mouse.click | Puppeteer](https://pptr.dev/api/puppeteer.mouse.click)。

#### `move(x: number, y: number, options?: MouseMoveOptions): Promise<void>`

移动鼠标到指定坐标。可直接参考 [Mouse.move | Puppeteer](https://pptr.dev/api/puppeteer.mouse.move)。

#### `drag(start: Point, end: Point, options?: object): Promise<void>`

拖拽操作。可直接参考 [Mouse.dragAndDrop | Puppeteer](https://pptr.dev/api/puppeteer.mouse.dragAndDrop)。

#### `scroll(direction: ScrollDirection, delta: number): Promise<void>`

滚动页面。

```typescript
// 滚动方向
type ScrollDirection = 'up' | 'down' | 'left' | 'right'
```


<br />

### 截图

#### `screenshot<T extends TabScreenshotOptions>(options?: T): Promise<TabScreenshotResult<T>>`

截取页面截图。

```typescript
interface TabScreenshotOptions {
  type?: 'png' | 'jpeg';
  quality?: number;
  fullPage?: boolean;
  path?: string;
}

interface BaseScreenshotResult {
  type: string;
  width: number;
  height: number;
}

interface ScreenshotResultWithPath extends BaseScreenshotResult {
  data: Uint8Array; // 二进制数据
}

interface ScreenshotResultWithoutPath extends BaseScreenshotResult {
  data: string; // Base64 数据
}
```

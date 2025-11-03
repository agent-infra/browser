# 简介

**@agent-infra/browser-ui** 是一个基于 CDP 的浏览器远程投屏解决方案。它基于 **@agent-infra/browser** 实现了基础的能力封装，可以作为一个 Web 组件直接被网页引用使用。

用户只需要提供一个有权限的 CDP WebSocket Url，**@agent-infra/browser-ui** 就可以显示远程浏览器的页面，然后你还可以手动介入浏览器的操作，这在没有 VNC 和 headless browser 的场景非常有用。

# 快速开始

## 安装

```bash
npm install @agent-infra/browser-ui
```

## 使用

```typescript
import { BrowserUI } from '@agent-infra/browser-ui';

const container = document.getElementById('browserContainer');
if (!container) {
  throw new Error('Browser container element not found');
}

BrowserUI.create({
  root: container,
  browserOptions: {
    browserWSEndpoint: 'https://example.com/ws/url',
  },
});
```

# 功能

由于 CDP 是一套调试协议，所以基于 CDP 的 **@agent-infra/browser-ui** 并不能完全实现浏览器的所有操作。

我们基于现有的 API，实现了如下常见的功能，可以满足用户 90% 的远程接管诉求：

## Tabs 切换

我们借助相关 API，显示了远程浏览器的所有 tabs，并实现了 `switchTab`/`createTab`/`closeTab` 这些基础功能：

<p>
<video src="https://github.com/user-attachments/assets/21e1ef6b-8977-48ac-895a-0e76ee07c26d" controls="true" width="600"></video>
</p>

## Navigation

在单个 tab 内，你可以实现 `goBack`/`goForward`/`reload`/`goto` 等基础功能：

<p>
<video src="https://github.com/user-attachments/assets/f6e805c2-8545-4ca7-85fb-8641054880a4" controls="true" width="600"></video>
</p>

## Dialog

如果页面内有 `Alert`/`Conform` 等阻塞性弹窗，**@agent-infra/browser-ui** 也可以实时展示并同步响应状态：

<p>
<video src="https://github.com/user-attachments/assets/524c899d-0f61-4de3-9242-3b25c7c48d73" controls="true" width="600"></video>
</p>

## 鼠标输入

鼠标基础的 `move`/`hover`/`click`/`drag` 等操作都有良好的支持：

<p>
<video src="https://github.com/user-attachments/assets/fe29fbe1-4791-4942-9a98-6c38ae55d727" controls="true" width="600"></video>
</p>

## 键盘输入

键盘输入也支持，并支持了部分常见的快捷键（例如 `全选`/`复制`/`剪切`/`黏贴` 等）：

<p>
<video src="https://github.com/user-attachments/assets/1dbcd845-45e3-4f5d-b001-a6b4338bb034" controls="true" width="600"></video>
</p>

## 剪切板模拟

由于 CDP 并不支持对远程电脑剪切板的支持，但是在实际业务中确实有复制黏贴的需求，于是我们通过一些 API 模拟了剪切板。

剪切板的调用逻辑是，如果你在 **@agent-infra/browser-ui** 侧边的 clipboard 组件里输入了要向远程浏览器复制的文字，那么 **browser-ui** 将会在执行 `复制` 快捷键（一般为 `Ctrl+V`）的时候把 clipboard 内的文字发送到远程浏览器。

```typescript
// 伪代码如下：
if (clipboardContent && isPasteHotkey) {
  await keyboard.sendCharacter(clipboardContent);
  return;
}
```

<p>
<video src="https://github.com/user-attachments/assets/001811a4-5a15-441e-a007-b93ad841f592" controls="true" width="600"></video>
</p>

import React, { useEffect, useRef, useState } from "react";
import {
  BrowserCanvas,
  BrowserCanvasRef,
  Browser,
  Page,
} from "../src/react/BrowserCanvas";

const App = () => {
  const [loading, setLoading] = useState(false);
  const ref = useRef<BrowserCanvasRef>(null);
  const [currentUrl, setCurrentUrl] = useState(""); // 新增：当前URL状态

  // 新增：处理URL跳转
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ref.current?.page) {
      try {
        await ref.current.page.goto(currentUrl);
      } catch (error) {
        console.error("导航错误:", error);
      }
    }
  };

  // 新增：监听页面URL变化
  const handlePageReady = async (ctx: { browser: Browser; page: Page }) => {
    const { page } = ctx;
    // 获取初始URL
    setCurrentUrl(await page.url());

    // 监听页面变化
    page.on("framenavigated", async (frame) => {
      if (frame === page.mainFrame()) {
        setCurrentUrl(frame.url());
      }
    });
  };

  return (
    <div>
      {/* 新增：地址栏 */}
      {!loading && (
        <form
          onSubmit={handleUrlSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <input
            type="url"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            placeholder="请输入网址"
            className="input"
            style={{ flex: 1 }}
          />
          <button type="submit" className="button">
            访问
          </button>
        </form>
      )}

      {!loading && (
        <div
          style={{
            width: "100%",
            height: "1000px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <BrowserCanvas
            ref={ref}
            cdpEndpoint="http://localhost:9222/json/version"
            wsEndpoint="ws://localhost:9222/devtools/browser/1234567890"
            onReady={handlePageReady}
          />
        </div>
      )}
    </div>
  );
};

export default App;

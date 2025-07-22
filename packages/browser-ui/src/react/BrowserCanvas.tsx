import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { Viewport, Page, Browser } from "puppeteer-core";
import { connect } from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";

export type { Browser, Page };

export interface BrowserCanvasProps {
  /** CDP 地址，优先级高于 wsEndpoint */
  cdpEndpoint?: string;
  /** CDP WebSocket 地址，必填 */
  wsEndpoint?: string;
  /** 连接或运行出错回调 */
  onError?: (error: Error) => void;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 连接成功后回调，返回 browser/page 实例 */
  onReady?: (ctx: { browser: Browser; page: Page }) => void;
  /** 会话结束回调 */
  onSessionEnd?: () => void;
  /** 画布初始 viewport，如果不提供则使用容器尺寸 */
  defaultViewport?: Viewport;
}

export interface BrowserCanvasRef {
  browser: Browser | null;
  page: Page | null;
  client: any;
  endSession: () => void;
}

export const BrowserCanvas = forwardRef<BrowserCanvasRef, BrowserCanvasProps>(
  (
    {
      cdpEndpoint,
      wsEndpoint,
      defaultViewport = {
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: true,
        isMobile: false,
      },
      onError,
      style,
      onReady,
      onSessionEnd,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pageRef = useRef<Page | null>(null);
    const clientRef = useRef<any>(null);
    const browserRef = useRef<Browser | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useImperativeHandle(ref, () => ({
      browser: browserRef.current,
      page: pageRef.current,
      client: clientRef.current,
      endSession: () => {
        cleanupConnection();
        onSessionEnd?.();
      },
    }));

    const getModifiersForEvent = (event: any) => {
      return (
        (event.altKey ? 1 : 0) |
        (event.ctrlKey ? 2 : 0) |
        (event.metaKey ? 4 : 0) |
        (event.shiftKey ? 8 : 0)
      );
    };

    const handleInteraction = (event: MouseEvent | WheelEvent) => {
      if (!clientRef.current || !canvasRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      if (event instanceof WheelEvent) {
        clientRef.current
          .send("Input.dispatchMouseEvent", {
            type: "mouseWheel",
            x,
            y,
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            modifiers: getModifiersForEvent(event),
          })
          .catch((error: Error) => onError?.(error));
      } else if (event instanceof MouseEvent) {
        const buttons = { 0: "none", 1: "left", 2: "middle", 3: "right" };
        const eventType = event.type;
        const mouseEventMap = {
          mousedown: "mousePressed",
          mouseup: "mouseReleased",
          mousemove: "mouseMoved",
        };
        const type = mouseEventMap[eventType as keyof typeof mouseEventMap];
        if (!type) return;

        clientRef.current
          .send("Input.dispatchMouseEvent", {
            type,
            x,
            y,
            button: (buttons as any)[event.which],
            modifiers: getModifiersForEvent(event),
            clickCount: 1,
          })
          .catch((error: Error) => onError?.(error));
      }
    };

    const handleKeyEvent = (event: KeyboardEvent) => {
      if (!clientRef.current) return;

      const eventTypeMap = {
        keydown: "keyDown",
        keyup: "keyUp",
        keypress: "char",
      };
      const type = eventTypeMap[event.type as keyof typeof eventTypeMap];
      const text =
        type === "char" ? String.fromCharCode(event.charCode) : undefined;

      clientRef.current
        .send("Input.dispatchKeyEvent", {
          type,
          text,
          unmodifiedText: text ? text.toLowerCase() : undefined,
          keyIdentifier: (event as any).keyIdentifier,
          code: event.code,
          key: event.key,
          windowsVirtualKeyCode: event.keyCode,
          nativeVirtualKeyCode: event.keyCode,
          autoRepeat: false,
          isKeypad: false,
          isSystemKey: false,
        })
        .catch((error: Error) => onError?.(error));
    };

    const updateCanvasSize = (
      viewportWidth: number,
      viewportHeight: number
    ) => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const container = canvas.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      canvas.width = viewportWidth;
      canvas.height = viewportHeight;

      const scale = Math.min(
        containerWidth / viewportWidth,
        containerHeight / viewportHeight
      );
      const styleWidth = viewportWidth * scale;
      const styleHeight = viewportHeight * scale;

      canvas.style.width = `${styleWidth}px`;
      canvas.style.height = `${styleHeight}px`;
      canvas.style.position = "absolute";

      const left = (containerWidth - styleWidth) / 2;
      const top = (containerHeight - styleHeight) / 2;
      canvas.style.left = `${left}px`;
      canvas.style.top = `${top}px`;
    };

    const setupPageScreencast = async (page: Page) => {
      if (!page || !canvasRef.current) return;

      pageRef.current = page;

      await page.setViewport({
        width: canvasRef.current.parentElement?.clientWidth || 1280,
        height: canvasRef.current.parentElement?.clientHeight || 1100,
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: true,
        isMobile: false,
      });

      const viewport = await page.viewport();
      if (!viewport) {
        const error = new Error("Failed to get viewport from page");
        onError?.(error);
        return;
      }

      requestAnimationFrame(async () => {
        if (!canvasRef.current) return;

        const container = canvasRef.current.parentElement;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        console.log("[BrowserCanvas] Container Rect:", containerRect);

        if (containerRect.width <= 0 || containerRect.height <= 0) {
          console.error(
            "[BrowserCanvas] Invalid container dimensions detected. Retrying..."
          );
          // 重试机制
          setTimeout(() => setupPageScreencast(page), 100);
          return;
        }

        // 清理之前的连接
        clientRef.current?.off("Page.screencastFrame");
        await clientRef.current?.send("Page.stopScreencast").catch(() => {});

        let client;
        try {
          client = await page.createCDPSession();
        } catch (cdpError) {
          console.error(
            "[BrowserCanvas] Failed to create CDP session:",
            cdpError
          );
          onError?.(
            cdpError instanceof Error
              ? cdpError
              : new Error("Failed to create CDP session")
          );
          return;
        }

        clientRef.current = client;
        updateCanvasSize(viewport.width, viewport.height);

        try {
          await client.send("Page.startScreencast", {
            format: "jpeg",
            quality: 80,
          });
        } catch (screencastError) {
          console.error(
            "[BrowserCanvas] Failed to start screencast:",
            screencastError
          );
          onError?.(
            screencastError instanceof Error
              ? screencastError
              : new Error("Failed to start screencast")
          );
          return;
        }

        client.on(
          "Page.screencastFrame",
          ({ data, sessionId }: { data: string; sessionId: number }) => {
            if (canvasRef.current) {
              const img = new Image();
              img.onload = () => {
                const ctx = canvasRef.current?.getContext("2d");
                if (ctx && canvasRef.current) {
                  ctx.clearRect(
                    0,
                    0,
                    canvasRef.current.width,
                    canvasRef.current.height
                  );
                  ctx.drawImage(
                    img,
                    0,
                    0,
                    canvasRef.current.width,
                    canvasRef.current.height
                  );
                }
              };
              img.onerror = () => {
                console.error(
                  "[BrowserCanvas] Image load error for screencast frame."
                );
                const error = new Error("Failed to load screencast frame");
                onError?.(error);
              };
              img.src = `data:image/jpeg;base64,${data}`;
              client
                .send("Page.screencastFrameAck", { sessionId })
                .catch((error: Error) => onError?.(error));
            } else {
              console.warn(
                "[BrowserCanvas] Canvas ref not available when screencast frame received."
              );
              client
                .send("Page.screencastFrameAck", { sessionId })
                .catch((error: Error) => onError?.(error));
            }
          }
        );

        client.on("error", (err: any) => {
          console.error("[BrowserCanvas] CDP Client Error:", err);
          onError?.(new Error(`CDP Client Error: ${err.message || err}`));
        });

        client.on("disconnect", () => {
          console.log("[BrowserCanvas] CDP Client Disconnected");
          cleanupConnection();
          onSessionEnd?.();
        });

        // 触发连接成功回调
        onReady?.({ browser: browserRef.current!, page });
        setIsConnected(true);
      });
    };

    const initConnection = async (endpoint: string) => {
      try {
        // @ts-ignore
        const browser: Browser = await connect({
          browserWSEndpoint: endpoint,
          defaultViewport: defaultViewport,
        });

        browserRef.current = browser;

        browser.on("targetchanged", async (target: any) => {
          if (target.type() === "page") {
            try {
              const newPage = await target.page();
              if (newPage && newPage !== pageRef.current) {
                await setupPageScreencast(newPage);
              }
            } catch (error) {
              onError?.(
                error instanceof Error
                  ? error
                  : new Error("Failed to handle target change")
              );
            }
          }
        });

        browser.on("disconnected", () => {
          cleanupConnection();
          onSessionEnd?.();
        });

        const pages = await browser.pages();
        const page =
          pages.length > 0 ? pages[pages.length - 1] : await browser.newPage();
        await setupPageScreencast(page);
      } catch (error) {
        onError?.(
          error instanceof Error
            ? error
            : new Error("Failed to connect to browser")
        );
      }
    };

    const cleanupConnection = () => {
      setIsConnected(false);
      clientRef.current?.off("Page.screencastFrame");
      clientRef.current?.send("Page.stopScreencast").catch(() => {});
      pageRef.current?.close().catch(() => {});
      browserRef.current?.disconnect();

      clientRef.current = null;
      pageRef.current = null;
      browserRef.current = null;
    };

    // 事件监听器设置
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleMouseEventWrapper = (e: MouseEvent) => handleInteraction(e);
      const handleWheelEventWrapper = (e: WheelEvent) => handleInteraction(e);

      canvas.addEventListener("mousedown", handleMouseEventWrapper);
      canvas.addEventListener("mouseup", handleMouseEventWrapper);
      canvas.addEventListener("mousemove", handleMouseEventWrapper);
      canvas.addEventListener("wheel", handleWheelEventWrapper);
      document.body.addEventListener("keydown", handleKeyEvent);
      document.body.addEventListener("keyup", handleKeyEvent);
      document.body.addEventListener("keypress", handleKeyEvent);

      return () => {
        canvas.removeEventListener("mousedown", handleMouseEventWrapper);
        canvas.removeEventListener("mouseup", handleMouseEventWrapper);
        canvas.removeEventListener("mousemove", handleMouseEventWrapper);
        canvas.removeEventListener("wheel", handleWheelEventWrapper);
        document.body.removeEventListener("keydown", handleKeyEvent);
        document.body.removeEventListener("keyup", handleKeyEvent);
        document.body.removeEventListener("keypress", handleKeyEvent);
      };
    }, []);

    // 处理窗口大小变化
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleResize = () => {
        if (pageRef.current) {
          const viewport = pageRef.current.viewport();
          if (viewport) {
            updateCanvasSize(viewport.width, viewport.height);
          }
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    // 初始化连接
    useEffect(() => {
      const init = async () => {
        let wsUrl = wsEndpoint;

        if (cdpEndpoint) {
          const response = await fetch(cdpEndpoint);
          if (!response.ok) {
            throw new Error("get json/version error");
          }
          const info = await response.json();
          wsUrl =
            window.location.protocol === "https:"
              ? info.webSocketDebuggerUrl.replace("ws://", "wss://")
              : info.webSocketDebuggerUrl;

          const wsUrlObj = new URL(wsUrl!);
          const cdpSearchParams = new URL(cdpEndpoint).searchParams;
          // 合并 searchParams
          cdpSearchParams.forEach((value, key) => {
            wsUrlObj.searchParams.append(key, value);
          });
          wsUrl = wsUrlObj.toString();
        }

        if (!wsUrl) {
          throw new Error("wsEndpoint is required");
        }
        initConnection(wsUrl);
      };

      init();

      return () => {
        cleanupConnection();
      };
    }, [cdpEndpoint, wsEndpoint]);

    return (
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          ...style,
        }}
        onClick={(e) => {
          e.preventDefault();
          handleInteraction(e.nativeEvent as MouseEvent);
        }}
        onMouseMove={(e) => handleInteraction(e.nativeEvent as MouseEvent)}
        onMouseDown={(e) => {
          e.preventDefault();
          handleInteraction(e.nativeEvent as MouseEvent);
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          handleInteraction(e.nativeEvent as MouseEvent);
        }}
        onWheel={(e) => {
          e.preventDefault();
          handleInteraction(e.nativeEvent as WheelEvent);
        }}
      />
    );
  }
);

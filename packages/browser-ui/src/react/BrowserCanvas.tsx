/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { connect } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';

import type { Viewport, Page, Browser } from 'puppeteer-core';

export type { Browser, Page };

export interface BrowserCanvasProps {
  /** CDP HTTP endpoint (higher priority than wsEndpoint) */
  cdpEndpoint?: string;
  /** CDP WebSocket URL for browser connection */
  wsEndpoint?: string;
  /** Error callback for connection/runtime errors */
  onError?: (error: unknown) => void;
  /**  Custom CSS styles for the canvas */
  style?: React.CSSProperties;
  /** Callback when browser connection is established */
  onReady?: (ctx: { browser: Browser; page: Page }) => void;
  /** Callback when browser session ends */
  onSessionEnd?: () => void;
  /** Initial viewport configuration */
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
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pageRef = useRef<Page | null>(null);
    const clientRef = useRef<any>(null);
    const browserRef = useRef<Browser | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        browser: browserRef.current,
        page: pageRef.current,
        client: clientRef.current,
        endSession: () => {
          cleanupConnection();
          onSessionEnd?.();
        },
      }),
      [isConnected],
    );

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
          .send('Input.dispatchMouseEvent', {
            type: 'mouseWheel',
            x,
            y,
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            modifiers: getModifiersForEvent(event),
          })
          .catch((error: Error) => onError?.(error));
      } else if (event instanceof MouseEvent) {
        const buttons = { 0: 'none', 1: 'left', 2: 'middle', 3: 'right' };
        const eventType = event.type;
        const mouseEventMap = {
          mousedown: 'mousePressed',
          mouseup: 'mouseReleased',
          mousemove: 'mouseMoved',
        };
        const type = mouseEventMap[eventType as keyof typeof mouseEventMap];
        if (!type) return;

        clientRef.current
          .send('Input.dispatchMouseEvent', {
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

    const handleKeyEvent = useCallback(
      (event: KeyboardEvent) => {
        if (!clientRef.current || !isFocused) {
          return;
        }
        if (event.keyCode === 8) {
          event.preventDefault();
        }
        const eventTypeMap = {
          keydown: 'keyDown',
          keyup: 'keyUp',
          keypress: 'char',
        };
        const type = eventTypeMap[event.type as keyof typeof eventTypeMap];
        const text =
          type === 'char' ? String.fromCharCode(event.charCode) : undefined;
        clientRef.current
          .send('Input.dispatchKeyEvent', {
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
          .catch(console.error);
      },
      [isFocused],
    );

    const updateCanvasSize = (
      viewportWidth: number,
      viewportHeight: number,
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
        containerHeight / viewportHeight,
      );
      const styleWidth = viewportWidth * scale;
      const styleHeight = viewportHeight * scale;

      canvas.style.width = `${styleWidth}px`;
      canvas.style.height = `${styleHeight}px`;
      canvas.style.position = 'absolute';

      const left = (containerWidth - styleWidth) / 2;
      const top = (containerHeight - styleHeight) / 2;
      canvas.style.left = `${left}px`;
      canvas.style.top = `${top}px`;
    };

    const initPuppeteer = async (endpoint: string) => {
      let browser: any;
      let client: any;
      try {
        browser = await connect({
          browserWSEndpoint: endpoint,
          defaultViewport,
        });
        browserRef.current = browser;

        const setupPageScreencast = async (page: Page, from: string) => {
          if (!page || !canvasRef.current) {
            return;
          }
          pageRef.current = page;

          const url = page.url();

          await page.setViewport({
            width: 1280,
            height: 800,
            deviceScaleFactor: 0,
            hasTouch: false,
            isLandscape: true,
            isMobile: false,
          });
          const viewport = page.viewport();
          if (!viewport) {
            return;
          }

          updateCanvasSize(viewport.width, viewport.height);

          clientRef.current?.off('Page.screencastFrame');
          await clientRef.current?.send('Page.stopScreencast').catch(() => {});
          try {
            client = await page.createCDPSession();
          } catch (cdpError) {
            return;
          }
          clientRef.current = client;

          try {
            await client.send('Page.startScreencast', {
              format: 'jpeg',
              quality: 80,
              everyNthFrame: 1,
            });
          } catch (screencastError) {
            console.error('screencastError', screencastError);
            return;
          }
          client.on(
            'Page.screencastFrame',
            ({ data, sessionId }: { data: string; sessionId: number }) => {
              if (canvasRef.current) {
                const img = new Image();
                img.onload = () => {
                  const ctx = canvasRef.current?.getContext('2d');
                  if (ctx && canvasRef.current) {
                    ctx.clearRect(
                      0,
                      0,
                      canvasRef.current.width,
                      canvasRef.current.height,
                    );
                    ctx.drawImage(
                      img,
                      0,
                      0,
                      canvasRef.current.width,
                      canvasRef.current.height,
                    );
                  }
                };
                img.onerror = () => {};
                img.src = `data:image/jpeg;base64,${data}`;
                client
                  .send('Page.screencastFrameAck', { sessionId })
                  .catch(console.error);
              } else {
                client
                  .send('Page.screencastFrameAck', { sessionId })
                  .catch(console.error);
              }
            },
          );
          client.on('error', (err: any) => {
            console.error('client.on', err);
          });
          client.on('disconnect', () => {});
        };

        const handleTarget = async (target: any) => {
          if (target.type() !== 'page') {
            return;
          }

          try {
            const newPage = (await target.page()) as Page;

            if (newPage && newPage !== pageRef.current) {
              if (clientRef.current) {
                await clientRef.current
                  .send('Page.stopScreencast')
                  .catch(console.error);
                clientRef.current.off('Page.screencastFrame');
              }
              await setupPageScreencast(newPage, 'handleTarget');
            }
          } catch (error) {
            console.error('Failed to setup page screencast:', error);
          }
        };

        browser.on('targetchanged', handleTarget);
        browser.on('targetcreated', handleTarget);

        const pages = await browser.pages();
        const page =
          pages.length > 0 ? pages[pages.length - 1] : await browser.newPage();

        setIsConnected(true);
        if (onReady) {
          onReady({ browser: browser, page: page });
        }

        await setupPageScreencast(page, 'init');
      } catch (error) {
        console.error('initPuppeteer Error:', error);
        if (onError) {
          onError(error);
        }
      }
    };

    const initCDPConnection = async (endpoint: string) => {
      try {
        await initPuppeteer(endpoint);
      } catch (error) {
        console.error('initCDPConnection Error:', error);
        if (onError) {
          onError(error);
        }
      }
    };

    const cleanupConnection = () => {
      setIsConnected(false);
      clientRef.current?.off('Page.screencastFrame');
      clientRef.current?.send('Page.stopScreencast').catch(() => {});
      pageRef.current?.close().catch(() => {});
      browserRef.current?.disconnect();

      clientRef.current = null;
      pageRef.current = null;
      browserRef.current = null;
    };

    // event listener
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleMouseEventWrapper = (e: MouseEvent) => handleInteraction(e);
      const handleWheelEventWrapper = (e: WheelEvent) => handleInteraction(e);

      canvas.addEventListener('mousedown', handleMouseEventWrapper);
      canvas.addEventListener('mouseup', handleMouseEventWrapper);
      canvas.addEventListener('mousemove', handleMouseEventWrapper);

      canvas.addEventListener('wheel', handleWheelEventWrapper);

      canvas.addEventListener('keydown', handleKeyEvent);
      canvas.addEventListener('keyup', handleKeyEvent);
      canvas.addEventListener('keypress', handleKeyEvent);

      return () => {
        canvas.removeEventListener('mousedown', handleMouseEventWrapper);
        canvas.removeEventListener('mouseup', handleMouseEventWrapper);
        canvas.removeEventListener('mousemove', handleMouseEventWrapper);

        canvas.removeEventListener('wheel', handleWheelEventWrapper);

        canvas.removeEventListener('keydown', handleKeyEvent);
        canvas.removeEventListener('keyup', handleKeyEvent);
        canvas.removeEventListener('keypress', handleKeyEvent);
      };
    }, [handleKeyEvent]);

    // updateCanvasSize Listener
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

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
      const init = async () => {
        let wsUrl = wsEndpoint;

        if (cdpEndpoint) {
          const response = await fetch(cdpEndpoint);
          if (!response.ok) {
            throw new Error('get json/version error');
          }
          const info = await response.json();
          wsUrl =
            window.location.protocol === 'https:'
              ? info.webSocketDebuggerUrl.replace('ws://', 'wss://')
              : info.webSocketDebuggerUrl;

          const wsUrlObj = new URL(wsUrl!);
          const cdpSearchParams = new URL(cdpEndpoint).searchParams;

          cdpSearchParams.forEach((value, key) => {
            wsUrlObj.searchParams.append(key, value);
          });
          wsUrl = wsUrlObj.toString();
        }

        if (!wsUrl) {
          throw new Error('wsEndpoint is required');
        }
        initCDPConnection(wsUrl);
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
          display: 'block',
          outline: 'none',
          ...style,
        }}
        onClick={(e) => {
          e.preventDefault();
          if (canvasRef.current) {
            canvasRef.current.focus();
          }
          handleInteraction(e.nativeEvent as MouseEvent);
        }}
        tabIndex={99}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    );
  },
);

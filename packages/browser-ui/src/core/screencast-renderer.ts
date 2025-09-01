import {
  Observable,
  fromEvent,
  tap,
  filter,
  mergeMap,
  takeUntil,
  catchError,
  EMPTY,
  share,
  from,
} from 'rxjs';
import { EventEmitter } from 'eventemitter3';

import {
  Page,
  CDPSession,
  CDPEvents,
  EventType,
  Protocol,
} from 'puppeteer-core';

import { drawBase64ToCanvas } from '../utils/image';

export interface ScreencastOptions {
  format?: 'jpeg' | 'png';
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  everyNthFrame?: number;
}

export interface ScreencastFrameEvent {
  tabId: string;
  canvas: HTMLCanvasElement;
  metadata: any;
  timestamp: number;
}

export interface ScreencastStartedEvent {
  tabId: string;
  canvas: HTMLCanvasElement;
}

export interface ScreencastStoppedEvent {
  tabId: string;
}

export class ScreencastRenderer extends EventEmitter {
  #page: Page;
  #tabId: string;
  #active = false;
  #abortController: AbortController | null = null;
  #observable: Observable<void> | null = null;
  #cdpSession?: CDPSession;

  constructor(page: any, tabId: string) {
    super();
    this.#page = page;
    this.#tabId = tabId;
  }

  async #initCDPSession(): Promise<void> {
    if (!this.#cdpSession) {
      this.#cdpSession = await this.#page.createCDPSession();
    }
  }

  #createScreencastObservable(canvas: HTMLCanvasElement): Observable<void> {
    if (!canvas.getContext('2d')) {
      throw new Error('Cannot get 2D context from canvas');
    }

    const screencastFrameObservable =
      new Observable<Protocol.Page.ScreencastFrameEvent>((subscriber) => {
        const listener = (event: Protocol.Page.ScreencastFrameEvent) => {
          subscriber.next(event);
        };

        this.#cdpSession!.on('Page.screencastFrame', listener);

        return () => {
          this.#cdpSession!.off('Page.screencastFrame', listener);
        };
      });

    return screencastFrameObservable.pipe(
      tap((event) => {
        this.#cdpSession!.send('Page.screencastFrameAck', {
          sessionId: event.sessionId,
        });
      }),
      filter((event) => {
        return event.metadata.timestamp !== undefined;
      }),
      // 使用 from() 包装 Promise 转换为 Observable
      mergeMap((event) => {
        return from(this.#renderFrameToCanvas(canvas, event));
      }),
      catchError((error) => {
        console.error('Failed to process screencast frame:', error);
        // 发出错误但不中断流
        this.emit('error', { error, tabId: this.#tabId });
        return EMPTY;
      }),
      takeUntil(
        new Observable<void>((subscriber) => {
          if (this.#abortController?.signal.aborted) {
            subscriber.next();
            subscriber.complete();
            return;
          }

          const abortHandler = () => {
            subscriber.next();
            subscriber.complete();
          };

          this.#abortController?.signal.addEventListener('abort', abortHandler);

          return () => {
            this.#abortController?.signal.removeEventListener(
              'abort',
              abortHandler,
            );
          };
        }),
      ),
      share(),
    );
  }

  /**
   * 渲染单帧到 canvas - 添加更好的错误处理和日志
   */
  async #renderFrameToCanvas(
    canvas: HTMLCanvasElement,
    event: Protocol.Page.ScreencastFrameEvent,
  ): Promise<void> {
    const { deviceWidth, deviceHeight } = event.metadata;

    return drawBase64ToCanvas(
      canvas,
      event.data,
      0,
      0,
      deviceWidth,
      deviceHeight,
    );
  }

  /**
   * 开始屏幕投射到指定的 canvas 元素
   */
  async start(
    canvas: HTMLCanvasElement,
    options: ScreencastOptions = {},
  ): Promise<void> {
    if (this.#active) {
      throw new Error('Screencast is already active');
    }

    const {
      format = 'jpeg',
      quality = 80,
      maxWidth = 1200,
      maxHeight = 800,
      everyNthFrame = 1,
    } = options;

    console.log('Starting screencast with options:', {
      format,
      quality,
      maxWidth,
      maxHeight,
      everyNthFrame,
    });

    this.#active = true;
    this.#abortController = new AbortController();

    try {
      // 初始化 CDP 会话
      await this.#initCDPSession();

      // 启动 screencast - 添加宽高限制
      await this.#cdpSession!.send('Page.startScreencast', {
        format,
        quality,
        maxWidth,
        maxHeight,
        everyNthFrame,
      });

      console.log('Screencast started successfully');

      // 创建并订阅流
      this.#observable = this.#createScreencastObservable(canvas);

      const subscription = this.#observable.subscribe({
        next: () => {
          // 帧处理成功
        },
        error: (error) => {
          console.error('Screencast stream error:', error);
          this.stop();
        },
        complete: () => {
          console.log('Screencast stream completed');
          this.#active = false;
          this.emit('stopped', {
            tabId: this.#tabId,
          } as ScreencastStoppedEvent);
        },
      });

      // 监听中断信号进行清理
      this.#abortController.signal.addEventListener('abort', async () => {
        console.log('Aborting screencast...');
        subscription.unsubscribe();

        try {
          await this.#cdpSession!.send('Page.stopScreencast');
        } catch (error) {
          console.warn('Failed to stop screencast:', error);
        }

        this.#active = false;
        this.#observable = null;

        this.emit('stopped', { tabId: this.#tabId } as ScreencastStoppedEvent);
      });

      this.emit('started', {
        tabId: this.#tabId,
        canvas,
      } as ScreencastStartedEvent);
    } catch (error) {
      console.error('Failed to start screencast:', error);
      this.#active = false;
      this.#abortController = null;
      this.#observable = null;
      throw error;
    }
  }

  /**
   * 停止屏幕投射
   */
  async stop(): Promise<void> {
    if (!this.#active || !this.#abortController) {
      return;
    }

    this.#abortController.abort();
    this.#abortController = null;
  }

  /**
   * 清理资源 - 断开 CDP 会话
   */
  async dispose(): Promise<void> {
    if (this.#active) {
      await this.stop();
    }

    if (this.#cdpSession) {
      try {
        await this.#cdpSession.detach();
      } catch (error) {
        console.warn('Failed to detach CDP session:', error);
      }
      this.#cdpSession = undefined;
    }
  }

  /**
   * 检查是否正在进行屏幕投射
   */
  isActive(): boolean {
    return this.#active;
  }

  /**
   * 获取当前标签页ID
   */
  get tabId(): string {
    return this.#tabId;
  }
}

import {
  Observable,
  fromEvent,
  tap,
  filter,
  mergeMap,
  takeUntil,
  catchError,
  EMPTY,
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
  #cdpSession?: CDPSession;

  #observable: Observable<void> | null = null;
  #controller = new AbortController();

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
      mergeMap((event) => {
        return from(this.#renderFrameToCanvas(canvas, event));
      }),
      catchError((error) => {
        console.error('Failed to process screencast frame:', error);
        return EMPTY;
      }),
      takeUntil(fromEvent(this.#controller.signal, 'abort')),
    );
  }

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

  async start(
    canvas: HTMLCanvasElement,
    options: ScreencastOptions = {},
  ): Promise<void> {
    const {
      format = 'jpeg',
      quality = 80,
      maxWidth = 1200,
      maxHeight = 800,
      everyNthFrame = 3,
    } = options;

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

      this.#observable = this.#createScreencastObservable(canvas);

      this.#observable.subscribe({
        next: () => {
          // 帧处理成功
        },
        error: (error) => {
          console.error('Screencast stream error:', error);
          this.stop();
        },
        complete: () => {
          console.log('Screencast stream completed');
        },
      });
    } catch (error) {
      console.error('Failed to start screencast:', error);
      this.#observable = null;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.#cdpSession) {
      return;
    }

    if (this.#controller.signal.aborted) {
      return;
    }

    await this.#cdpSession.send('Page.stopScreencast');
    this.#controller.abort();

    await this.#cdpSession.detach();
    this.#cdpSession = undefined;
  }

  get tabId(): string {
    return this.#tabId;
  }
}

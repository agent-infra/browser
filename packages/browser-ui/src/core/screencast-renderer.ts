/*
 * This file contains code derived from the puppeteer.
 * The original code is available at: https://github.com/puppeteer/puppeteer/blob/fcbfb730b8abb9412ce797ccfd0e1579d4e1d490/packages/puppeteer-core/src/node/ScreenRecorder.ts#L198
 *
 * Original file license:
 *
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 * https://github.com/puppeteer/puppeteer/blob/main/LICENSE
 */
import {
  Observable,
  fromEvent,
  tap,
  filter,
  concatMap,
  takeUntil,
  catchError,
  EMPTY,
} from 'rxjs';
import { EventEmitter } from 'eventemitter3';
import { drawBase64ToCanvas } from '../utils/image';

import type { Page, CDPSession, Protocol } from 'puppeteer-core';
import { ScreenCastOptions } from '../types';

export class ScreencastRenderer extends EventEmitter {
  #page: Page;
  #tabId: string;
  #canvas: HTMLCanvasElement;
  #options: Required<ScreenCastOptions>;
  #cdpSession?: CDPSession;

  #isRunning: boolean = false;

  #observable?: Observable<void>;
  #controller?: AbortController;

  constructor(
    page: Page,
    canvas: HTMLCanvasElement,
    options: ScreenCastOptions,
  ) {
    super();
    this.#page = page;
    this.#tabId = options.tabId;
    this.#canvas = canvas;

    this.#options = {
      tabId: options.tabId,
      viewport: {
        width: options.viewport.width,
        height: options.viewport.height,
        deviceScaleFactor: options.viewport.deviceScaleFactor || 0,
      },
      cast: {
        format: 'jpeg',
        quality: 80,
        everyNthFrame: 1,
        ...options.cast,
      },
    };
  }

  async #initCDPSession(): Promise<void> {
    if (!this.#cdpSession) {
      this.#cdpSession = await this.#page.createCDPSession();
    }
  }

  #createScreencastObservable(): Observable<void> {
    if (!this.#canvas.getContext('2d')) {
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
      concatMap((event) => {
        return drawBase64ToCanvas(
          this.#canvas,
          event.data,
          Math.min(this.#options.viewport.width, event.metadata.deviceWidth),
          Math.min(this.#options.viewport.height, event.metadata.deviceHeight),
        );
      }),
      catchError((error) => {
        console.error('Failed to process screencast frame:', error);
        return EMPTY;
      }),
      takeUntil(fromEvent(this.#controller!.signal, 'abort')),
    );
  }

  async start(): Promise<void> {
    if (this.#isRunning) {
      return;
    }

    try {
      this.#controller = new AbortController();

      await this.#initCDPSession();

      // If setViewport is not called before each 'Page.startScreencast',
      // the screenshot size given by screencastFrameAck may have slight deviations (for example, expected 900x900, actual 900x918)
      // The exact reason is currently unknown.
      await this.#page.setViewport({
        width: this.#options.viewport.width,
        height: this.#options.viewport.height,
        deviceScaleFactor: this.#options.viewport.deviceScaleFactor,
      });
      await this.#cdpSession!.send('Page.startScreencast', {
        maxWidth: this.#options.viewport.width,
        maxHeight: this.#options.viewport.height,
        format: this.#options.cast.format,
        quality: this.#options.cast.quality,
        everyNthFrame: this.#options.cast.everyNthFrame,
      });

      this.#observable = this.#createScreencastObservable();

      this.#observable.subscribe({
        next: () => {},
        error: (error) => {
          console.error('Screencast stream error:', error);
          this.stop();
        },
        complete: () => {
          console.log('Screencast stream completed');
        },
      });

      this.#isRunning = true;
    } catch (error) {
      console.error('Failed to start screencast:', error);
      this.#observable = undefined;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.#isRunning) {
      return;
    }

    if (!this.#cdpSession) {
      return;
    }

    if (!this.#page.isClosed()) {
      await this.#cdpSession.send('Page.stopScreencast');
    }

    this.#controller?.abort();
    this.#observable = undefined;

    if (!this.#page.isClosed()) {
      await this.#cdpSession.detach();
    }
    this.#cdpSession = undefined;

    this.#isRunning = false;
  }

  get tabId(): string {
    return this.#tabId;
  }
}

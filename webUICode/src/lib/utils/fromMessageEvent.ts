/**
 * 将 EventTarget 的 message 事件转换为异步可迭代对象
 * @param target 事件目标（如 WebSocket、Worker、Window 等）
 * @param options 可选配置（signal 用于中止，closeEvent 指定结束事件名）
 * @returns AsyncIterable<MessageEvent>
 */
export function fromMessageEvent(
  target: EventTarget,
  options?: {
    signal?: AbortSignal;
    closeEvent?: string;      // 当收到此事件时迭代结束，例如 'close'
    errorEvent?: string;      // 当收到此事件时抛出错误，例如 'error'
  }
): AsyncIterable<MessageEvent> {
  type ResolveFn = (value: IteratorResult<MessageEvent>) => void;
  type RejectFn = (reason?: any) => void;
  type PendingItem = { resolve: ResolveFn; reject: RejectFn };

  let buffer: MessageEvent[] = [];           // 缓存未消费的消息
  let pendingItems: PendingItem[] = [];      // 等待中的 next() 回调（含 resolve/reject）
  let isDone = false;                        // 是否已经结束（close/error）
  let doneError: any = null;                 // 如果是 error 结束，记录错误

  // 公共的清理函数，移除所有监听器
  const cleanup = () => {
    target.removeEventListener('message', onMessage);
    if (options?.closeEvent) {
      target.removeEventListener(options.closeEvent, onCloseOrEnd);
    }
    if (options?.errorEvent) {
      target.removeEventListener(options.errorEvent, onError);
    }
    // 清空缓冲和等待队列，并让所有等待中的 Promise 以 done 结束
    buffer = [];
    pendingItems.forEach(({ resolve }) => resolve({ value: undefined, done: true }));
    pendingItems = [];
  };

  // 消息到达时的处理
  const onMessage = (event: Event) => {
    if (isDone) return;
    const msgEvent = event as MessageEvent;
    if (pendingItems.length > 0) {
      // 有正在等待的 next()，立即交付
      const { resolve } = pendingItems.shift()!;
      resolve({ value: msgEvent, done: false });
    } else {
      // 无人等待，存入缓冲区
      buffer.push(msgEvent);
    }
  };

  // 正常结束事件（如 close）
  const onCloseOrEnd = () => {
    if (isDone) return;
    isDone = true;
    // 完成所有等待中的 next()（resolve done）
    pendingItems.forEach(({ resolve }) => resolve({ value: undefined, done: true }));
    pendingItems = [];
    cleanup();
  };

  // 错误事件
  const onError = (errorEvent: Event) => {
    if (isDone) return;
    isDone = true;
    doneError = errorEvent;
    // 让所有等待中的 next() 抛出错误（reject）
    pendingItems.forEach(({ reject }) => reject(errorEvent));
    pendingItems = [];
    cleanup();
  };

  // 注册事件
  target.addEventListener('message', onMessage);
  if (options?.closeEvent) {
    target.addEventListener(options.closeEvent, onCloseOrEnd);
  }
  if (options?.errorEvent) {
    target.addEventListener(options.errorEvent, onError);
  }

  // 支持 AbortSignal 主动中止迭代
  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      if (!isDone) {
        isDone = true;
        pendingItems.forEach(({ resolve }) => resolve({ value: undefined, done: true }));
        pendingItems = [];
        cleanup();
      }
    });
  }

  // 返回异步可迭代对象
  return {
    [Symbol.asyncIterator](): AsyncIterator<MessageEvent> {
      return {
        next(): Promise<IteratorResult<MessageEvent>> {
          if (doneError) {
            return Promise.reject(doneError);
          }
          if (isDone) {
            return Promise.resolve({ value: undefined, done: true });
          }
          if (buffer.length > 0) {
            // 有缓存，直接返回
            const value = buffer.shift()!;
            return Promise.resolve({ value, done: false });
          } else {
            // 无缓存，返回一个等待消息的 Promise，同时存储 resolve 和 reject
            return new Promise<IteratorResult<MessageEvent>>((resolve, reject) => {
              pendingItems.push({ resolve, reject });
            });
          }
        },
        return(): Promise<IteratorResult<MessageEvent>> {
          // 当迭代器被手动 return 或循环 break 时调用
          if (!isDone) {
            isDone = true;
            cleanup();
          }
          return Promise.resolve({ value: undefined, done: true });
        },
        throw(e?: any): Promise<IteratorResult<MessageEvent>> {
          // 如果外部调用 throw，则清理并拒绝
          cleanup();
          return Promise.reject(e);
        }
      };
    }
  };
}
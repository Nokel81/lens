// Allow to cancel request for window.fetch()

export interface CancellablePromise<T> extends Promise<T> {
  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): CancellablePromise<TResult1 | TResult2>;
  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): CancellablePromise<T | TResult>;
  finally(onfinally?: (() => void) | undefined | null): CancellablePromise<T>;
  cancel(): void;
}

interface WrappingFunction {
  <T>(result: Promise<T>): CancellablePromise<T>;
  <T>(result: T): T;
}

export function cancelableFetch(reqInfo: RequestInfo, reqInit: RequestInit = {}): CancellablePromise<Response> {
  const abortController = new AbortController()
  const signal = abortController.signal
  const cancel = abortController.abort.bind(abortController)

  const wrapResult: WrappingFunction = function (result: any) {
    if (result instanceof Promise) {
      const promise: CancellablePromise<any> = result as any
      promise.then = function (onfulfilled, onrejected) {
        const data = Object.getPrototypeOf(this).then.call(this, onfulfilled, onrejected)
        return wrapResult(data)
      }
      promise.cancel = cancel
    }
    return result
  }

  const req = fetch(reqInfo, { ...reqInit, signal })
  return wrapResult(req)
}

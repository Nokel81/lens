// Debouncing promise evaluation

type PromiseFunc = (...args: any[]) => Promise<any> | any

export const debouncePromise = function (promisedFunc: PromiseFunc, timeout = 0): PromiseFunc {
  let timer: number
  return (...params: any[]) => new Promise((resolve, _reject) => {
    clearTimeout(timer)
    timer = window.setTimeout(() => resolve(promisedFunc.apply(this, params)), timeout)
  })
}

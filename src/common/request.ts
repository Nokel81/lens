import request from "request"
import requestPromise from "request-promise-native"
import { userStore } from "./user-store"

// todo: get rid of "request" (deprecated)
// https://github.com/lensapp/lens/issues/459

function getDefaultRequestOpts(): Partial<request.Options> {
  const { httpsProxy, allowUntrustedCAs } = userStore.preferences
  return {
    proxy: httpsProxy || undefined,
    rejectUnauthorized: !allowUntrustedCAs,
  }
}

/**
 * @deprecated
 */
export function customRequest(opts: request.Options): request.Request {
  return request.defaults(getDefaultRequestOpts())(opts)
}

/**
 * @deprecated
 */
export function customRequestPromise(opts: requestPromise.Options): request.Request {
  return requestPromise.defaults(getDefaultRequestOpts())(opts)
}

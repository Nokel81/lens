// Clone json-serializable object

export function cloneJsonObject<T = any>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

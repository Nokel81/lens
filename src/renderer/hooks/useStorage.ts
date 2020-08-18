import { useState } from "react"
import { StorageHelper, StorageHelperOptions } from "../utils"

export type ValueUpdater<T> = (value: T) => void;

export function useStorage<T>(key: string, initialValue?: T, options?: StorageHelperOptions): [T, ValueUpdater<T>] {
  const storage = new StorageHelper<T>(key, initialValue, options)
  const [storageValue, setStorageValue] = useState(storage.get())
  const setValue = (value: T) => {
    setStorageValue(value)
    storage.set(value)
  }
  return [storageValue, setValue]
}
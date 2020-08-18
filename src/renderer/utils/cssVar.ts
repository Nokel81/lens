// Helper for getting/setting css-variables

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function cssVar(elem: HTMLElement) {
  return {
    get(name: string) {
      const value = window.getComputedStyle(elem).getPropertyValue(name).trim()
      return {
        toString: () => value,
        valueOf: () => parseFloat(value),
      }
    },
    set(name: string, value: number | string) {
      if (typeof value === "number") value = value + "px"
      elem.style.setProperty(name, value)
    },
  }
}

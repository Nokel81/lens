// Convert object's keys to camelCase format
import _ from "lodash";

export function toCamelCase(arg: string): string;
export function toCamelCase(arg: string[]): string[];
export function toCamelCase(arg: Record<string, any>): Record<string, any>;
export function toCamelCase(arg: Record<string, any>[]): Record<string, any>;
export function toCamelCase(arg: any): any {
  if (typeof arg === "string") {
    return _.camelCase(arg)
  }

  if (Array.isArray(arg)) {
    return arg.map(toCamelCase);
  }

  if (_.isPlainObject(arg)) {
    return Object.fromEntries(
      Object.entries(arg)
        .map(([key, val]) => [_.camelCase(key), toCamelCase(val)])
    )
  }

  return arg;
}

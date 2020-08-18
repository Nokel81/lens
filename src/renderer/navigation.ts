// Navigation helpers

import { ipcRenderer } from "electron"
import { compile } from "path-to-regexp"
import { createBrowserHistory, createMemoryHistory, Location, LocationDescriptor } from "history"
import { createObservableHistory } from "mobx-observable-history"

export const history = typeof window !== "undefined" ? createBrowserHistory() : createMemoryHistory()
export const navigation = createObservableHistory(history)

if (ipcRenderer) {
  // subscribe for navigation via menu.ts
  ipcRenderer.on("menu:navigate", (event, path: string) => {
    navigate(path)
  })
}

export function navigate(location: LocationDescriptor): void {
  navigation.location = location as Location
}

export interface URLParams<P, Q> {
  params?: P;
  query?: QueryParams & Q;
}

export function buildURL<P extends Record<string, any>, Q = Record<string, any>>(path: string | string[]): (p?: URLParams<P, Q>) => string {
  const pathBuilder = compile(path.toString())
  return function ({ params, query }: URLParams<P, Q> = {}) {
    return pathBuilder(params) + (query ? getQueryString(query, false) : "")
  }
}

// common params for all pages
export interface QueryParams {
  namespaces?: string[];  // selected context namespaces
  details?: string;      // serialized resource details
  selected?: string;     // mark resource as selected
  search?: string;       // search-input value
  sortBy?: string;       // sorting params for table-list
  orderBy?: string;
}

export function getQueryString(params?: Partial<QueryParams>, merge = true): string {
  const searchParams = navigation.searchParams.copyWith(params)
  if (!merge) {
    Array.from(searchParams.keys()).forEach(key => {
      if (!(key in params)) searchParams.delete(key)
    })
  }
  return searchParams.toString({ withPrefix: true })
}

export function setQueryParams<T>(params?: T & QueryParams, { merge = true, replace = false } = {}): void {
  const newSearch = getQueryString(params, merge)
  navigation.merge({ search: newSearch }, replace)
}

export function getDetails(): string {
  return navigation.searchParams.get("details")
}

export function getSelectedDetails(): string {
  return navigation.searchParams.get("selected") || getDetails()
}

export function getDetailsUrl(details: string): string {
  return getQueryString({
    details,
    selected: getSelectedDetails(),
  })
}

export function showDetails(path: string, resetSelected = true): void {
  navigation.searchParams.merge({
    details: path,
    selected: resetSelected ? null : getSelectedDetails(),
  })
}

export function hideDetails(): void {
  showDetails(null)
}

export function setSearch(text: string): void {
  navigation.replace({
    search: getQueryString({ search: text }),
  })
}

export function getSearch(): string {
  return navigation.searchParams.get("search") || ""
}

// Kubernetes watch-api consumer

import { computed, observable, reaction } from "mobx"
import { stringify } from "querystring"
import { autobind, EventEmitter } from "../utils"
import { KubeJsonApiData } from "./kube-json-api"
import type { KubeObjectStore } from "../kube-object.store"
import { KubeApi } from "./kube-api"
import { apiManager } from "./api-manager"
import { apiPrefix, isDevelopment } from "../../common/vars"
import { getHostedCluster } from "../../common/cluster-store"

export interface KubeWatchEvent<T = any> {
  type: "ADDED" | "MODIFIED" | "DELETED";
  object?: T;
}

export interface KubeWatchRouteEvent {
  type: "STREAM_END";
  url: string;
  status: number;
}

export interface KubeWatchRouteQuery {
  api: string | string[];
}

@autobind()
export class KubeWatchApi {
  protected evtSource: EventSource;
  protected onData = new EventEmitter<[KubeWatchEvent]>();
  protected subscribers = observable.map<KubeApi, number>();
  protected reconnectTimeoutMs = 5000;
  protected maxReconnectsOnError = 10;
  protected reconnectAttempts = this.maxReconnectsOnError;

  constructor() {
    reaction(() => this.activeApis, () => this.connect(), {
      fireImmediately: true,
      delay: 500,
    })
  }

  @computed get activeApis(): KubeApi<any>[] {
    return Array.from(this.subscribers.keys())
  }

  getSubscribersCount(api: KubeApi): number {
    return this.subscribers.get(api) || 0
  }

  subscribe(...apis: KubeApi[]): () => void {
    apis.forEach(api => {
      this.subscribers.set(api, this.getSubscribersCount(api) + 1)
    })
    return () => apis.forEach(api => {
      const count = this.getSubscribersCount(api) - 1
      if (count <= 0) this.subscribers.delete(api)
      else this.subscribers.set(api, count)
    })
  }

  protected getQuery(): Partial<KubeWatchRouteQuery> {
    const { isAdmin, allowedNamespaces } = getHostedCluster()
    return {
      api: this.activeApis.map(api => {
        if (isAdmin) return api.getWatchUrl()
        return allowedNamespaces.map(namespace => api.getWatchUrl(namespace))
      }).flat(),
    }
  }

  // todo: maybe switch to websocket to avoid often reconnects
  @autobind()
  protected connect(): void {
    if (this.evtSource) this.disconnect() // close previous connection
    if (!this.activeApis.length) {
      return
    }
    const query = this.getQuery()
    const apiUrl = `${apiPrefix}/watch?` + stringify(query)
    this.evtSource = new EventSource(apiUrl)
    this.evtSource.onmessage = this.onMessage
    this.evtSource.onerror = this.onError
    this.writeLog("CONNECTING", query.api)
  }

  reconnect(): void {
    if (!this.evtSource || this.evtSource.readyState !== EventSource.OPEN) {
      this.reconnectAttempts = this.maxReconnectsOnError
      this.connect()
    }
  }

  protected disconnect(): void {
    if (!this.evtSource) return
    this.evtSource.close()
    this.evtSource.onmessage = null
    this.evtSource = null
  }

  protected onMessage(evt: MessageEvent): void {
    if (!evt.data) return
    const data = JSON.parse(evt.data)
    if ((data as KubeWatchEvent).object) {
      this.onData.emit(data)
    } else {
      this.onRouteEvent(data)
    }
  }

  protected async onRouteEvent({ type, url }: KubeWatchRouteEvent): Promise<void> {
    if (type === "STREAM_END") {
      this.disconnect()
      const { apiBase, namespace } = KubeApi.parseApi(url)
      const api = apiManager.getApi(apiBase)
      if (api) {
        try {
          await api.refreshResourceVersion({ namespace })
          this.reconnect()
        } catch (error) {
          console.debug("failed to refresh resource version", error)
        }
      }
    }
  }

  protected onError(evt: MessageEvent): void {
    const { reconnectAttempts: attemptsRemain, reconnectTimeoutMs } = this
    if (evt.eventPhase === EventSource.CLOSED) {
      if (attemptsRemain > 0) {
        this.reconnectAttempts--
        setTimeout(() => this.connect(), reconnectTimeoutMs)
      }
    }
  }

  protected writeLog(...data: any[]): void {
    if (isDevelopment) {
      console.log('%cKUBE-WATCH-API:', `font-weight: bold`, ...data)
    }
  }

  addListener(store: KubeObjectStore, callback: (evt: KubeWatchEvent) => void): () => void {
    const listener = (evt: KubeWatchEvent<KubeJsonApiData>) => {
      const { selfLink, namespace, resourceVersion } = evt.object.metadata
      const api = apiManager.getApi(selfLink)
      api.setResourceVersion(namespace, resourceVersion)
      api.setResourceVersion("", resourceVersion)
      if (store == apiManager.getStore(api)) {
        callback(evt)
      }
    }
    this.onData.addListener(listener)
    return () => this.onData.removeListener(listener)
  }

  reset(): void {
    this.subscribers.clear()
  }
}

export const kubeWatchApi = new KubeWatchApi()

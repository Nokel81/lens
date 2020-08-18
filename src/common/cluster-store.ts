import type { WorkspaceId } from "./workspace-store"
import path from "path"
import { app, ipcRenderer, remote } from "electron"
import fse from "fs-extra"
import { action, computed, observable, toJS } from "mobx"
import { noClustersHost } from "./vars"
import { BaseStore } from "./base-store"
import { Cluster, ClusterState } from "../main/cluster"
import migrations from "../migrations/cluster-store"
import logger from "../main/logger"
import { tracker } from "./tracker"

export interface ClusterIconUpload {
  clusterId: string;
  name: string;
  path: string;
}

export interface ClusterStoreModel {
  activeCluster?: ClusterId; // last opened cluster
  clusters?: ClusterModel[]
}

export type ClusterId = string;

export interface ClusterModel {
  id: ClusterId;
  workspace?: WorkspaceId;
  contextName?: string;
  preferences?: ClusterPreferences;
  kubeConfigPath: string;

  /** @deprecated */
  kubeConfig?: string; // yaml
}

export interface ClusterPreferences {
  terminalCWD?: string;
  clusterName?: string;
  prometheus?: {
    namespace: string;
    service: string;
    port: number;
    prefix: string;
  };
  prometheusProvider?: {
    type: string;
  };
  icon?: string;
  httpsProxy?: string;
}

export class ClusterStore extends BaseStore<ClusterStoreModel> {
  static get iconsDir(): string {
    // TODO: remove remote cheat
    return path.join((app || remote.app).getPath("userData"), "icons")
  }

  private constructor() {
    super({
      configName: "lens-cluster-store",
      accessPropertiesByDotNotation: false, // To make dots safe in cluster context names
      migrations,
    })
    if (ipcRenderer) {
      ipcRenderer.on("cluster:state", (event, clusterState: ClusterState) => {
        this.applyWithoutSync(() => {
          logger.debug(`[CLUSTER-STORE]: received state update for cluster=${clusterState.id}`, clusterState)
          const cluster = this.getById(clusterState.id)
          if (cluster) cluster.updateModel(clusterState)
        })
      })
    }
  }

  @observable activeClusterId: ClusterId;
  @observable removedClusters = observable.map<ClusterId, Cluster>();
  @observable clusters = observable.map<ClusterId, Cluster>();

  @computed get activeCluster(): Cluster | null {
    return this.getById(this.activeClusterId)
  }

  @computed get clustersList(): Cluster[] {
    return Array.from(this.clusters.values())
  }

  setActive(id: ClusterId): void {
    this.activeClusterId = id
  }

  hasClusters(): boolean {
    return this.clusters.size > 0
  }

  hasContext(name: string): boolean {
    return this.clustersList.some(cluster => cluster.contextName === name)
  }

  getById(id: ClusterId): Cluster {
    return this.clusters.get(id)
  }

  getByWorkspaceId(workspaceId: string): Cluster[] {
    return this.clustersList.filter(cluster => cluster.workspace === workspaceId)
  }

  @action
  async addCluster(model: ClusterModel, activate = true): Promise<Cluster> {
    tracker.event("cluster", "add")
    const cluster = new Cluster(model)
    this.clusters.set(model.id, cluster)
    if (activate) this.activeClusterId = model.id
    return cluster
  }

  @action
  async removeById(clusterId: ClusterId): Promise<void> {
    tracker.event("cluster", "remove")
    const cluster = this.getById(clusterId)
    if (cluster) {
      this.clusters.delete(clusterId)
      if (this.activeClusterId === clusterId) {
        this.activeClusterId = null
      }
      await fse.unlink(cluster.kubeConfigPath).catch(() => null)
    }
  }

  @action
  removeByWorkspaceId(workspaceId: string): void {
    this.getByWorkspaceId(workspaceId).forEach(cluster => {
      this.removeById(cluster.id)
    })
  }

  @action
  protected fromStore({ activeCluster, clusters = [] }: ClusterStoreModel = {}): void {
    const currentClusters = this.clusters.toJS()
    const newClusters = new Map<ClusterId, Cluster>()
    const removedClusters = new Map<ClusterId, Cluster>()

    // update new clusters
    clusters.forEach(clusterModel => {
      let cluster = currentClusters.get(clusterModel.id)
      if (cluster) {
        cluster.updateModel(clusterModel)
      } else {
        cluster = new Cluster(clusterModel)
      }
      newClusters.set(clusterModel.id, cluster)
    })

    // update removed clusters
    currentClusters.forEach(cluster => {
      if (!newClusters.has(cluster.id)) {
        removedClusters.set(cluster.id, cluster)
      }
    })

    this.activeClusterId = newClusters.has(activeCluster) ? activeCluster : null
    this.clusters.replace(newClusters)
    this.removedClusters.replace(removedClusters)

    // "auto-select" first cluster if available
    if (!this.activeClusterId && newClusters.size) {
      this.activeClusterId = Array.from(newClusters.values())[0].id
    }
  }

  toJSON(): ClusterStoreModel {
    return toJS({
      activeCluster: this.activeClusterId,
      clusters: this.clustersList.map(cluster => cluster.toJSON()),
    }, {
      recurseEverything: true,
    })
  }
}

export const clusterStore = ClusterStore.getInstance<ClusterStore>()

export function isNoClustersView(): boolean {
  return location.hostname === noClustersHost
}

export function getHostedClusterId(): string {
  return location.hostname.split(".")[0]
}

export function getHostedCluster(): Cluster {
  return clusterStore.getById(getHostedClusterId())
}

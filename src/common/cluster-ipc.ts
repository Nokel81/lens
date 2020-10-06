import { createIpcChannel } from "./ipc";
import { ClusterId, ClusterStore } from "./cluster-store";
import { Tracker } from "./tracker";

export const clusterIpc = {
  activate: createIpcChannel({
    channel: "cluster:activate",
    handle: (clusterId: ClusterId, frameId?: number) => {
      const cluster = ClusterStore.getInstance().getById(clusterId);
      if (cluster) {
        if (frameId) cluster.frameId = frameId; // save cluster's webFrame.routingId to be able to send push-updates
        return cluster.activate();
      }
    },
  }),

  setFrameId: createIpcChannel({
    channel: "cluster:set-frame-id",
    handle: (clusterId: ClusterId, frameId?: number) => {
      const cluster = ClusterStore.getInstance().getById(clusterId);
      if (cluster) {
        if (frameId) cluster.frameId = frameId; // save cluster's webFrame.routingId to be able to send push-updates
        return cluster.pushState();
      }
    },
  }),

  refresh: createIpcChannel({
    channel: "cluster:refresh",
    handle: (clusterId: ClusterId) => {
      const cluster = ClusterStore.getInstance().getById(clusterId);
      if (cluster) return cluster.refresh();
    },
  }),

  disconnect: createIpcChannel({
    channel: "cluster:disconnect",
    handle: (clusterId: ClusterId) => {
      Tracker.getInstance().event("cluster", "stop");
      return ClusterStore.getInstance().getById(clusterId)?.disconnect();
    },
  }),

  installFeature: createIpcChannel({
    channel: "cluster:install-feature",
    handle: async (clusterId: ClusterId, feature: string, config?: any) => {
      Tracker.getInstance().event("cluster", "install", feature);
      const cluster = ClusterStore.getInstance().getById(clusterId);
      if (cluster) {
        await cluster.installFeature(feature, config)
      } else {
        throw `${clusterId} is not a valid cluster id`;
      }
    }
  }),

  uninstallFeature: createIpcChannel({
    channel: "cluster:uninstall-feature",
    handle: (clusterId: ClusterId, feature: string) => {
      Tracker.getInstance().event("cluster", "uninstall", feature);
      return ClusterStore.getInstance().getById(clusterId)?.uninstallFeature(feature)
    }
  }),

  upgradeFeature: createIpcChannel({
    channel: "cluster:upgrade-feature",
    handle: (clusterId: ClusterId, feature: string, config?: any) => {
      Tracker.getInstance().event("cluster", "upgrade", feature);
      return ClusterStore.getInstance().getById(clusterId)?.upgradeFeature(feature, config)
    }
  }),
}

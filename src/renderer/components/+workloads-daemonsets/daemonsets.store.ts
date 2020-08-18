import { observable } from "mobx"
import { KubeObjectStore } from "../../kube-object.store"
import { autobind } from "../../utils"
import { DaemonSet, daemonSetApi, PodMetrics, Pod, podsApi, PodStatus } from "../../api/endpoints"
import { podsStore } from "../+workloads-pods/pods.store"
import { apiManager } from "../../api/api-manager"

export interface DeamonSetStatus {
  failed: number;
  running: number;
  pending: number;
}

@autobind()
export class DaemonSetStore extends KubeObjectStore<DaemonSet> {
  api = daemonSetApi

  @observable metrics: PodMetrics = null;

  async loadMetrics(daemonSet: DaemonSet): Promise<void> {
    const pods = this.getChildPods(daemonSet)
    this.metrics = await podsApi.getMetrics(pods, daemonSet.getNs(), "")
  }

  getChildPods(daemonSet: DaemonSet): Pod[] {
    return podsStore.getPodsByOwner(daemonSet)
  }

  getStatuses(daemonSets?: DaemonSet[]): DeamonSetStatus {
    const status = { failed: 0, pending: 0, running: 0 }
    daemonSets.forEach(daemonSet => {
      const pods = this.getChildPods(daemonSet)
      if (pods.some(pod => pod.getStatus() === PodStatus.FAILED)) {
        status.failed++
      }
      else if (pods.some(pod => pod.getStatus() === PodStatus.PENDING)) {
        status.pending++
      }
      else {
        status.running++
      }
    })
    return status
  }

  reset(): void {
    this.metrics = null
  }
}

export const daemonSetStore = new DaemonSetStore()
apiManager.registerStore(daemonSetApi, daemonSetStore)

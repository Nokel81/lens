import { observable } from "mobx"
import { autobind } from "../../utils"
import { KubeObjectStore } from "../../kube-object.store"
import { PodMetrics, podsApi, PodStatus, StatefulSet, statefulSetApi } from "../../api/endpoints"
import { podsStore } from "../+workloads-pods/pods.store"
import { apiManager } from "../../api/api-manager"

export interface Statuses {
  failed: number;
  pending: number;
  running: number;
}

@autobind()
export class StatefulSetStore extends KubeObjectStore<StatefulSet> {
  api = statefulSetApi
  @observable metrics: PodMetrics = null;

  async loadMetrics(statefulSet: StatefulSet): Promise<void> {
    const pods = podsStore.getPodsByOwner(statefulSet)
    this.metrics = await podsApi.getMetrics(pods, statefulSet.getNs(), "")
  }

  getStatuses(statefulSets: StatefulSet[]): Statuses {
    const status = { failed: 0, pending: 0, running: 0 }
    statefulSets.forEach(statefulSet => {
      const pods = podsStore.getPodsByOwner(statefulSet)
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

export const statefulSetStore = new StatefulSetStore()
apiManager.registerStore(statefulSetApi, statefulSetStore)

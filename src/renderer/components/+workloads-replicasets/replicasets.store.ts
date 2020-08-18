import { observable } from "mobx"
import { autobind } from "../../utils"
import { KubeObjectStore } from "../../kube-object.store"
import { Deployment, PodMetrics, podsApi, ReplicaSet, replicaSetApi } from "../../api/endpoints"
import { podsStore } from "../+workloads-pods/pods.store"
import { apiManager } from "../../api/api-manager"

@autobind()
export class ReplicaSetStore extends KubeObjectStore<ReplicaSet> {
  api = replicaSetApi
  @observable metrics: PodMetrics = null;

  async loadMetrics(replicaSet: ReplicaSet): Promise<void> {
    const pods = podsStore.getPodsByOwner(replicaSet)
    this.metrics = await podsApi.getMetrics(pods, replicaSet.getNs(), "")
  }


  getReplicaSetsByOwner(deployment: Deployment): ReplicaSet[] {
    return this.items.filter(replicaSet =>
      !!replicaSet.getOwnerRefs().find(owner => owner.uid === deployment.getId()),
    )
  }

  reset(): void {
    this.metrics = null
  }
}

export const replicaSetStore = new ReplicaSetStore()
apiManager.registerStore(replicaSetApi, replicaSetStore)

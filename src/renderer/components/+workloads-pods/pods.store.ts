import countBy from "lodash/countBy"
import { action, observable } from "mobx"
import { KubeObjectStore } from "../../kube-object.store"
import { autobind, cpuUnitsToNumber, unitsToBytes } from "../../utils"
import { PodMetrics, Pod, PodMetrics, podMetricsApi, podsApi } from "../../api/endpoints"
import { WorkloadKubeObject } from "../../api/workload-kube-object"
import { apiManager } from "../../api/api-manager"
import { Metrics } from "../../api/endpoints/metrics.api"

export interface MetricsData {
  cpu: number;
  memory: number;
}

@autobind()
export class PodsStore extends KubeObjectStore<Pod> {
  api = podsApi;

  @observable metrics: PodMetrics = null;
  @observable kubeMetrics = observable.array<PodMetrics>([]);

  @action
  async loadMetrics(pod: Pod): Promise<void> {
    this.metrics = await podsApi.getMetrics([pod], pod.getNs())
  }

  loadContainerMetrics(pod: Pod): Promise<PodMetrics<Metrics>> {
    return podsApi.getMetrics([pod], pod.getNs(), "container, namespace")
  }

  async loadKubeMetrics(namespace?: string): Promise<void> {
    const metrics = await podMetricsApi.list({ namespace })
    this.kubeMetrics.replace(metrics)
  }

  getPodsByOwner(workload: WorkloadKubeObject): Pod[] {
    if (!workload) return []
    return this.items.filter(pod => {
      const owners = pod.getOwnerRefs()
      if (!owners.length) return
      return owners.find(owner => owner.uid === workload.getId())
    })
  }

  getPodsByNode(node: string): any[] {
    if (!this.isLoaded) return []
    return this.items.filter(pod => pod.spec.nodeName === node)
  }

  getStatuses(pods: Pod[]): Record<string, number> {
    return countBy(pods.map(pod => pod.getStatus()))
  }

  getPodKubeMetrics(pod: Pod): MetricsData {
    const containers = pod.getContainers()
    const empty = { cpu: 0, memory: 0 }
    const metrics = this.kubeMetrics.find(metric => {
      return [
        metric.getName() === pod.getName(),
        metric.getNs() === pod.getNs(),
      ].every(v => v)
    })
    if (!metrics) return empty
    return containers.reduce((total, container) => {
      const metric = metrics.containers.find(item => item.name == container.name)
      const { cpu = "0", memory = "0" } = metric?.usage
      return {
        cpu: total.cpu + cpuUnitsToNumber(cpu),
        memory: total.memory + unitsToBytes(memory),
      }
    }, empty)
  }

  reset(): void {
    this.metrics = null
  }
}

export const podsStore = new PodsStore()
apiManager.registerStore(podsApi, podsStore)

import { KubeObject } from "../kube-object"
import { KubeApi } from "../kube-api"

export class KubePodMetrics extends KubeObject {
  timestamp: string
  window: string
  containers: {
    name: string;
    usage: {
      cpu: string;
      memory: string;
    };
  }[]
}

export const podMetricsApi = new KubeApi({
  kind: KubePodMetrics.kind,
  apiBase: "/apis/metrics.k8s.io/v1beta1/pods",
  isNamespaced: true,
  objectConstructor: KubePodMetrics,
})

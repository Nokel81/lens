import { KubeObject } from "../kube-object"
import { KubeApi } from "../kube-api"

export enum HpaMetricType {
  Resource = "Resource",
  Pods = "Pods",
  Object = "Object",
  External = "External",
}

export type IHpaMetricData<T = any> = T & {
  target?: {
    kind: string;
    name: string;
    apiVersion: string;
  };
  name?: string;
  metricName?: string;
  currentAverageUtilization?: number;
  currentAverageValue?: string;
  targetAverageUtilization?: number;
  targetAverageValue?: string;
}

export interface HpaMetric {
  [kind: string]: IHpaMetricData;

  type: HpaMetricType;
  resource?: IHpaMetricData<{ name: string }>;
  pods?: IHpaMetricData;
  external?: IHpaMetricData;
  object?: IHpaMetricData<{
    describedObject: {
      apiVersion: string;
      kind: string;
      name: string;
    };
  }>;
}

interface HpaCondition {
  lastTransitionTime: string;
  message: string;
  reason: string;
  status: string;
  type: string;
}

interface HpaConditionAnnotated extends HpaCondition {
  isReady: boolean;
  tooltip: string;
}

export class HorizontalPodAutoscaler extends KubeObject {
  static kind = "HorizontalPodAutoscaler";

  spec: {
    scaleTargetRef: {
      kind: string;
      name: string;
      apiVersion: string;
    };
    minReplicas: number;
    maxReplicas: number;
    metrics: HpaMetric[];
  }
  status: {
    currentReplicas: number;
    desiredReplicas: number;
    currentMetrics: HpaMetric[];
    conditions: HpaCondition[];
  }

  getMaxPods(): number {
    return this.spec.maxReplicas || 0
  }

  getMinPods(): number {
    return this.spec.minReplicas || 0
  }

  getReplicas(): number {
    return this.status.currentReplicas
  }

  getConditions(): HpaConditionAnnotated[] {
    if (!this.status.conditions) return []
    return this.status.conditions.map(condition => {
      const { message, reason, lastTransitionTime, status } = condition
      return {
        ...condition,
        isReady: status === "True",
        tooltip: `${message || reason} (${lastTransitionTime})`,
      }
    })
  }

  getMetrics(): HpaMetric[] {
    return this.spec.metrics || []
  }

  getCurrentMetrics(): HpaMetric[] {
    return this.status.currentMetrics || []
  }

  protected getMetricName(metric: HpaMetric): string {
    const { type, resource, pods, object, external } = metric
    switch (type) {
      case HpaMetricType.Resource:
        return resource.name
      case HpaMetricType.Pods:
        return pods.metricName
      case HpaMetricType.Object:
        return object.metricName
      case HpaMetricType.External:
        return external.metricName
    }
  }

  // todo: refactor
  getMetricValues(metric: HpaMetric): string {
    const metricType = metric.type.toLowerCase()
    const currentMetric = this.getCurrentMetrics().find(current =>
      metric.type == current.type && this.getMetricName(metric) == this.getMetricName(current),
    )
    const current = currentMetric ? currentMetric[metricType] : null
    const target = metric[metricType]
    let currentValue = "unknown"
    let targetValue = "unknown"
    if (current) {
      currentValue = current.currentAverageUtilization || current.currentAverageValue || current.currentValue
      if (current.currentAverageUtilization) currentValue += "%"
    }
    if (target) {
      targetValue = target.targetAverageUtilization || target.targetAverageValue || target.targetValue
      if (target.targetAverageUtilization) targetValue += "%"
    }
    return `${currentValue} / ${targetValue}`
  }
}

export const hpaApi = new KubeApi({
  kind: HorizontalPodAutoscaler.kind,
  apiBase: "/apis/autoscaling/v2beta1/horizontalpodautoscalers",
  isNamespaced: true,
  objectConstructor: HorizontalPodAutoscaler,
})

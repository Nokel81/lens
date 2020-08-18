import { KubeObject } from "../kube-object"
import { autobind } from "../../utils"
import { Metrics, metricsApi } from "./metrics.api"
import { KubeApi } from "../kube-api"

export class IngressApi extends KubeApi<Ingress> {
  getMetrics(ingress: string, namespace: string): Promise<IngressMetrics> {
    const opts = { category: "ingress", ingress }
    return metricsApi.getMetrics({
      bytesSentSuccess: opts,
      bytesSentFailure: opts,
      requestDurationSeconds: opts,
      responseDurationSeconds: opts,
    }, {
      namespace,
    })
  }
}

export interface IngressMetrics<T = Metrics> {
  [metric: string]: T;
  bytesSentSuccess: T;
  bytesSentFailure: T;
  requestDurationSeconds: T;
  responseDurationSeconds: T;
}

@autobind()
export class Ingress extends KubeObject {
  static kind = "Ingress"

  spec: {
    tls: {
      secretName: string;
    }[];
    rules?: {
      host?: string;
      http: {
        paths: {
          path?: string;
          backend: {
            serviceName: string;
            servicePort: number;
          };
        }[];
      };
    }[];
    backend?: {
      serviceName: string;
      servicePort: number;
    };
  }
  status: {
    loadBalancer: {
      ingress: any[];
    };
  }

  getRoutes(): string[] {
    const { spec: { tls, rules } } = this
    if (!rules) return []

    let protocol = "http"
    const routes: string[] = []
    if (tls && tls.length > 0) {
      protocol += "s"
    }
    rules.map(rule => {
      const host = rule.host ? rule.host : "*"
      if (rule.http && rule.http.paths) {
        rule.http.paths.forEach(path => {
          routes.push(protocol + "://" + host + (path.path || "/") + " ⇢ " + path.backend.serviceName + ":" + path.backend.servicePort)
        })
      }
    })

    return routes
  }

  getHosts(): string[] {
    const { spec: { rules } } = this
    if (!rules) return []
    return rules.filter(rule => rule.host).map(rule => rule.host)
  }

  getPorts(): string {
    const ports: number[] = []
    const { spec: { tls, rules, backend } } = this
    const httpPort = 80
    const tlsPort = 443
    if (rules && rules.length > 0) {
      if (rules.some(rule => rule.hasOwnProperty("http"))) {
        ports.push(httpPort)
      }
    }
    else {
      if (backend && backend.servicePort) {
        ports.push(backend.servicePort)
      }
    }
    if (tls && tls.length > 0) {
      ports.push(tlsPort)
    }
    return ports.join(", ")
  }
}

export const ingressApi = new IngressApi({
  kind: Ingress.kind,
  apiBase: "/apis/extensions/v1beta1/ingresses",
  isNamespaced: true,
  objectConstructor: Ingress,
})

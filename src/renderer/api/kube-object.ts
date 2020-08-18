// Base class for all kubernetes objects

import moment from "moment"
import { KubeJsonApiData, KubeJsonApiDataList } from "./kube-json-api"
import { autobind, formatDuration } from "../utils"
import { ItemObject } from "../item.store"
import { apiKube } from "./index"
import { JsonApiParams } from "./json-api"
import { resourceApplierApi } from "./endpoints/resource-applier.api"
import { CancellablePromise } from "../utils/cancelableFetch"

export type KubeObjectConstructor<T extends KubeObject = any> = (new (data: KubeJsonApiData | any) => T) & {
  kind?: string;
};

export interface KubeObjectMetadata {
  uid: string;
  name: string;
  namespace?: string;
  creationTimestamp: string;
  resourceVersion: string;
  selfLink: string;
  deletionTimestamp?: string;
  finalizers?: string[];
  continue?: string; // provided when used "?limit=" query param to fetch objects list
  labels?: {
    [label: string]: string;
  };
  annotations?: {
    [annotation: string]: string;
  };
  ownerReferences?: {
    apiVersion: string;
    kind: string;
    name: string;
    uid: string;
    controller: boolean;
    blockOwnerDeletion: boolean;
  }[];
}

export type KubeMetaField = keyof KubeObjectMetadata;

@autobind()
export class KubeObject implements ItemObject {
  static readonly kind: string;

  static isNonSystem(item: KubeJsonApiData | KubeObject): boolean {
    return !item.metadata.name.startsWith("system:")
  }

  static isJsonApiData(object: Record<string, any>): object is KubeJsonApiData {
    return !object.items && object.metadata
  }

  static isJsonApiDataList(object: Record<string, any>): object is KubeJsonApiDataList {
    return object.items && object.metadata
  }

  static stringifyLabels(labels: { [name: string]: string }): string[] {
    if (!labels) return []
    return Object.entries(labels).map(([name, value]) => `${name}=${value}`)
  }

  constructor(data: KubeJsonApiData) {
    Object.assign(this, data)
  }

  apiVersion: string
  kind: string
  metadata: KubeObjectMetadata;
  status?: any; // todo: type-safety support

  get selfLink(): string {
    return this.metadata.selfLink
  }

  getId(): string {
    return this.metadata.uid
  }

  getResourceVersion(): string {
    return this.metadata.resourceVersion
  }

  getName(): string {
    return this.metadata.name
  }

  getNs(): string {
    // avoid "null" serialization via JSON.stringify when post data
    return this.metadata.namespace || undefined
  }

  // todo: refactor with named arguments
  getAge(humanize = true, compact = true, fromNow = false): any {
    if (fromNow) {
      return moment(this.metadata.creationTimestamp).fromNow()
    }
    const diff = new Date().getTime() - new Date(this.metadata.creationTimestamp).getTime()
    if (humanize) {
      return formatDuration(diff, compact)
    }
    return diff
  }

  getFinalizers(): string[] {
    return this.metadata.finalizers || []
  }

  getLabels(): string[] {
    return KubeObject.stringifyLabels(this.metadata.labels)
  }

  getAnnotations(): string[] {
    const labels = KubeObject.stringifyLabels(this.metadata.annotations)
    return labels.filter(label => {
      const skip = resourceApplierApi.annotations.some(key => label.startsWith(key))
      return !skip
    })
  }

  getOwnerRefs(): { namespace: string; apiVersion: string; kind: string; name: string; uid: string; controller: boolean; blockOwnerDeletion: boolean; }[] {
    const refs = this.metadata.ownerReferences || []
    return refs.map(ownerRef => ({
      ...ownerRef,
      namespace: this.getNs(),
    }))
  }

  getSearchFields(): string[] {
    const { getName, getId, getNs, getAnnotations, getLabels } = this
    return [
      getName(),
      getNs(),
      getId(),
      ...getLabels(),
      ...getAnnotations(),
    ]
  }

  toPlainObject(): Record<string, any> {
    return JSON.parse(JSON.stringify(this))
  }

  // use unified resource-applier api for updating all k8s objects
  async update<T extends KubeObject>(data: Partial<T>): Promise<T> {
    return resourceApplierApi.update<T>({
      ...this.toPlainObject(),
      ...data,
    })
  }

  delete(params?: JsonApiParams): CancellablePromise<KubeJsonApiData> {
    return apiKube.del(this.selfLink, params)
  }
}
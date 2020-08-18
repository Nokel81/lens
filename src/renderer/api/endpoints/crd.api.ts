import { KubeObject } from "../kube-object"
import { KubeApi } from "../kube-api"
import { crdResourcesURL } from "../../components/+custom-resources/crd.route"

enum PrinterColumnType {
  INTEGER = "integer",
  NUMBER = "number",
  STRING = "string",
  BOOLEAN = "boolean",
  DATE = "date",
}

interface PrinterColumn {
  name: string;
  type: PrinterColumnType;
  priority: number;
  description: string;
  JSONPath: string;
}

interface CRDCondition {
  lastTransitionTime: string;
  message: string;
  reason: string;
  status: string;
  type: string;
}

interface CRDConditionAnnotated extends CRDCondition {
  isReady: boolean;
  tooltip: string;
}

interface CRDNames {
  plural: string;
  singular: string;
  kind: string;
  listKind: string;
}

export class CustomResourceDefinition extends KubeObject {
  static kind = "CustomResourceDefinition";

  spec: {
    group: string;
    version: string;
    names: CRDNames;
    scope: "Namespaced" | "Cluster" | string;
    validation?: any;
    versions: {
      name: string;
      served: boolean;
      storage: boolean;
    }[];
    conversion: {
      strategy?: string;
      webhook?: any;
    };
    additionalPrinterColumns?: PrinterColumn[];
  }
  status: {
    conditions: CRDCondition[];
    acceptedNames: {
      plural: string;
      singular: string;
      kind: string;
      shortNames: string[];
      listKind: string;
    };
    storedVersions: string[];
  }

  getResourceUrl(): string {
    return crdResourcesURL({
      params: {
        group: this.getGroup(),
        name: this.getPluralName(),
      },
    })
  }

  getResourceApiBase(): string {
    const { version, group } = this.spec
    return `/apis/${group}/${version}/${this.getPluralName()}`
  }

  getPluralName(): string {
    return this.getNames().plural
  }

  getResourceKind(): string {
    return this.spec.names.kind
  }

  getResourceTitle(): string {
    const name = this.getPluralName()
    return name[0].toUpperCase() + name.substr(1)
  }

  getGroup(): string {
    return this.spec.group
  }

  getScope(): string {
    return this.spec.scope
  }

  getVersion(): string {
    return this.spec.version
  }

  isNamespaced(): boolean {
    return this.getScope() === "Namespaced"
  }

  getStoredVersions(): string {
    return this.status.storedVersions.join(", ")
  }

  getNames(): CRDNames {
    return this.spec.names
  }

  getConversion(): string {
    return JSON.stringify(this.spec.conversion)
  }

  getPrinterColumns(ignorePriority = true): PrinterColumn[] {
    const columns = this.spec.additionalPrinterColumns || []
    return columns
      .filter(column => column.name != "Age")
      .filter(column => ignorePriority ? true : !column.priority)
  }

  getValidation(): string {
    return JSON.stringify(this.spec.validation, null, 2)
  }

  getConditions(): CRDConditionAnnotated[] {
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
}

export const crdApi = new KubeApi<CustomResourceDefinition>({
  kind: CustomResourceDefinition.kind,
  apiBase: "/apis/apiextensions.k8s.io/v1beta1/customresourcedefinitions",
  isNamespaced: false,
  objectConstructor: CustomResourceDefinition,
})

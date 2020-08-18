import { autobind } from "../../utils"
import { KubeObject } from "../kube-object"
import { KubeApi } from "../kube-api"

export interface ServiceAccountSecret {
  name: string;
}

export interface ServiceAccountImagePullSecret {
  name: string;
}

@autobind()
export class ServiceAccount extends KubeObject {
  static kind = "ServiceAccount";

  secrets?: ServiceAccountSecret[]
  imagePullSecrets?: ServiceAccountImagePullSecret[]

  getSecrets(): ServiceAccountSecret[] {
    return this.secrets || []
  }

  getImagePullSecrets(): ServiceAccountImagePullSecret[] {
    return this.imagePullSecrets || []
  }
}

export const serviceAccountsApi = new KubeApi<ServiceAccount>({
  kind: ServiceAccount.kind,
  apiBase: "/api/v1/serviceaccounts",
  isNamespaced: true,
  objectConstructor: ServiceAccount,
})

import "./kube-object-details.scss"

import React from "react"
import { disposeOnUnmount, observer } from "mobx-react"
import { computed, observable, reaction } from "mobx"
import { Trans } from "@lingui/macro"
import { getDetails, hideDetails } from "../../navigation"
import { Drawer } from "../drawer"
import { KubeObject } from "../../api/kube-object"
import { Spinner } from "../spinner"
import { apiManager, ApiComponents } from "../../api/api-manager"
import { crdStore } from "../+custom-resources/crd.store"
import { CrdResourceDetails, CrdResourceMenu } from "../+custom-resources"

export interface KubeObjectDetailsProps<T = KubeObject> {
  className?: string;
  object: T;
}

@observer
export class KubeObjectDetails extends React.Component {
  @observable isLoading = false;
  @observable.ref loadingError: React.ReactNode;

  @computed get object(): any {
    const detailsPath = getDetails()
    return apiManager.getStore(detailsPath)?.getByPath(detailsPath)
  }

  @computed get isCrdInstance(): boolean {
    return !!crdStore.getByObject(this.object)
  }

  @disposeOnUnmount
  loader = reaction(() => [
    getDetails(),
    this.object, // resource might be updated via watch-event or from already opened details
    crdStore.items.length, // crd stores initialized after loading
  ], async () => {
    this.loadingError = ""
    const { object } = this
    const detailsPath = getDetails()
    if (!object) {
      const store = apiManager.getStore(detailsPath)
      if (store) {
        this.isLoading = true
        try {
          await store.loadFromPath(detailsPath)
        } catch (err) {
          this.loadingError = <Trans>Resource loading has failed: <b>{err.toString()}</b></Trans>
        } finally {
          this.isLoading = false
        }
      }
    }
  })

  render(): React.ReactNode {
    const { object, isLoading, loadingError, isCrdInstance } = this
    const isOpen = !!(object || isLoading || loadingError)
    let title = ""
    let apiComponents: ApiComponents
    if (object) {
      const { kind, getName, selfLink } = object
      title = `${kind}: ${getName()}`
      apiComponents = apiManager.getViews(selfLink)
      if (isCrdInstance && !apiComponents.Details) {
        apiComponents.Details = CrdResourceDetails
        apiComponents.Menu = CrdResourceMenu
      }
    }
    return (
      <Drawer
        className="KubeObjectDetails flex column"
        open={isOpen}
        title={title}
        toolbar={apiComponents && apiComponents.Menu && <apiComponents.Menu object={object} toolbar />}
        onClose={hideDetails}
      >
        {isLoading && <Spinner center />}
        {loadingError && <div className="box center">{loadingError}</div>}
        {apiComponents && apiComponents.Details && <apiComponents.Details object={object} />}
      </Drawer>
    )
  }
}

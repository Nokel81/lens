import "./cluster-manager.scss"
import React from "react"
import { computed } from "mobx"
import { observer } from "mobx-react"
import { App } from "../app"
import { ClustersMenu } from "./clusters-menu"
import { BottomBar } from "./bottom-bar"
import { cssNames, IClassName } from "../../utils"
import { Terminal } from "../dock/terminal"
import { i18nStore } from "../../i18n"
import { themeStore } from "../../theme.store"
import { clusterStore, getHostedClusterId } from "../../../common/cluster-store"
import { CubeSpinner } from "../spinner"

interface Props {
  className?: IClassName;
  contentClass?: IClassName;
}

@observer
export class ClusterManager extends React.Component<Props> {
  static async init(): Promise<void> {
    await Promise.all([
      i18nStore.init(),
      themeStore.init(),
      Terminal.preloadFonts(),
    ])
  }

  @computed get isInactive(): boolean {
    const { activeCluster, activeClusterId, clusters } = clusterStore
    const isActivatedBefore = activeCluster?.initialized
    return clusters.size > 0 && !isActivatedBefore && activeClusterId !== getHostedClusterId()
  }

  render(): React.ReactNode {
    const { className, contentClass } = this.props
    const lensViewClass = cssNames("flex column", contentClass, {
      inactive: this.isInactive,
    })
    return (
      <div className={cssNames("ClusterManager", className)}>
        <div id="draggable-top" />
        <div id="lens-view" className={lensViewClass}>
          <App />
        </div>
        <ClustersMenu />
        <BottomBar />
        {this.isInactive && <CubeSpinner center />}
      </div>
    )
  }
}

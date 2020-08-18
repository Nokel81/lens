import React from "react"
import { Trans } from "@lingui/macro"
import { observer } from "mobx-react"
import { clusterStore } from "../../../../common/cluster-store"
import { Cluster } from "../../../../main/cluster"
import { autobind } from "../../../utils"
import { Button } from "../../button"
import { ConfirmDialog } from "../../confirm-dialog"

interface Props {
  cluster: Cluster;
}

@observer
export class RemoveClusterButton extends React.Component<Props> {
  @autobind()
  confirmRemoveCluster(): void {
    const { cluster } = this.props
    ConfirmDialog.open({
      message: <p>Are you sure you want to remove <b>{cluster.preferences.clusterName}</b> from Lens?</p>,
      labelOk: <Trans>Yes</Trans>,
      labelCancel: <Trans>No</Trans>,
      ok: async () => {
        await clusterStore.removeById(cluster.id)
      },
    })
  }

  render(): React.ReactNode {
    return (
      <Button accent onClick={this.confirmRemoveCluster} className="button-area">
        Remove Cluster
      </Button>
    )
  }
}
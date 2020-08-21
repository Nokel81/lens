import React from "react";
import { Cluster } from "../../../../main/cluster";
import { AutoDetectExectuables } from "../../AutoDetectExecutables";
import { SubTitle } from "../../layout/sub-title";

interface Props {
  cluster: Cluster;
}

export class ClusterAutoDetectSettings extends React.Component<Props> {
  render() {
    const { cluster } = this.props;
    return <>
      <SubTitle title="Autodetect executables" />
      <p>These settings are for specifying how each executable binary should be determined. Either automatically based on the cluster version, using the bundled version that comes with Lens, or by manually specifying a path to the executable.</p>
      <AutoDetectExectuables preferences={cluster.preferences} />
    </>
  }
}
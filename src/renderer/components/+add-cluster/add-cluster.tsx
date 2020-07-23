import "./add-cluster.scss"
import path from "path";
import fs from "fs-extra";
import React from "react";
import { observer } from "mobx-react";
import { computed, observable } from "mobx";
import { Select, SelectOption } from "../select";
import { t, Trans } from "@lingui/macro";
import { Input } from "../input";
import { _i18n } from "../../i18n";
import { AceEditor } from "../ace-editor";
import { Button } from "../button";
import { KubeConfig } from "@kubernetes/client-node";
import { loadConfig, saveConfigToAppFiles, splitConfig, validateConfig } from "../../../common/kube-helpers";
import { tracker } from "../../../common/tracker";
import { clusterStore } from "../../../common/cluster-store";
import { workspaceStore } from "../../../common/workspace-store";
import { v4 as uuid } from "uuid"
import { navigation } from "../../navigation";

function createKubeSelect(from: KubeConfig): SelectOption<KubeConfig> {
  const isNew = false; // fixme: detect new context since last visit
  
  return {
    value: from,
    label: <>
      {from.currentContext}
      {isNew && <span className="new"> <Trans>(new)</Trans></span>}
    </>
  }
}

@observer
export class AddCluster extends React.Component {
  readonly custom: any = "custom"
  @observable.ref clusterConfig: KubeConfig;
  @observable.ref kubeConfig: KubeConfig; // local ~/.kube/config (if available)
  @observable.ref error: React.ReactNode;

  @observable isWaiting = false
  @observable showSettings = false
  @observable proxyServer = ""
  @observable customConfig = ""

  async componentDidMount() {
    const kubeConfig = await this.readLocalKubeConfig();
    if (kubeConfig) {
      this.kubeConfig = loadConfig(kubeConfig)
      this.customConfig = kubeConfig
    }
  }

  async readLocalKubeConfig(): Promise<string> {
    const localPath = path.join(process.env.HOME, '.kube', 'config');
    return fs.readFile(localPath, "utf8").catch(() => null)
  }

  @computed get isCustom() {
    return this.clusterConfig === this.custom;
  }

  @computed get clusterOptions() {
    const options: SelectOption<KubeConfig>[] = [];
    if (this.kubeConfig) {
      const contexts = splitConfig(this.kubeConfig)
        .filter(kc => !clusterStore.hasContext(kc.currentContext));

      options.push(...contexts.map(createKubeSelect))
    }
    options.push({
      label: <Trans>Custom..</Trans>,
      value: this.custom,
    });
    return options;
  }

  addCluster = async () => {
    tracker.event("cluster", "add");
    const { clusterConfig, customConfig, proxyServer } = this;
    const clusterId = uuid();
    this.isWaiting = true
    this.error = ""
    try {
      const config = this.isCustom ? loadConfig(customConfig) : clusterConfig;
      if (!config) {
        this.error = <Trans>Please select kubeconfig</Trans>
        return;
      }
      validateConfig(config);
      await clusterStore.addCluster({
        id: clusterId,
        kubeConfigPath: saveConfigToAppFiles(clusterId, config),
        workspace: workspaceStore.currentWorkspaceId,
        contextName: config.currentContext,
        preferences: {
          clusterName: config.currentContext,
          httpsProxy: proxyServer || undefined,
        },
      });
      navigation.goBack(); // return to previous opened page for the cluster view
    } catch (err) {
      this.error = String(err);
    } finally {
      this.isWaiting = false;
    }
  }

  render() {
    return (
      <div className="AddCluster">
        <div className="content flex column gaps">
          <h2><Trans>Add Cluster</Trans></h2>
          <Select
            placeholder={<Trans>Select kubeconfig</Trans>}
            value={createKubeSelect(this.clusterConfig)}
            options={this.clusterOptions}
            onNewSelection={(conf: KubeConfig) => this.clusterConfig = conf}
          />
          <div className="cluster-settings">
            <a href="#" onClick={() => this.showSettings = !this.showSettings}>
              <Trans>Proxy settings</Trans>
            </a>
          </div>
          {this.showSettings && (
            <div className="proxy-settings">
              <Input
                autoFocus
                placeholder={_i18n._(t`A HTTP proxy server URL (format: http://<address>:<port>)`)}
                value={this.proxyServer}
                onChange={value => this.proxyServer = value}
              />
              <small className="hint">
                <Trans>HTTP Proxy server. Used for communicating with Kubernetes API.</Trans>
              </small>
            </div>
          )}
          {this.isCustom && (
            <div className="custom-kubeconfig flex column gaps box grow">
              <p>Kubeconfig:</p>
              <AceEditor
                autoFocus
                mode="yaml"
                value={this.customConfig}
                onChange={value => this.customConfig = value}
              />
            </div>
          )}
          {this.error && (
            <div className="error">{this.error}</div>
          )}
          <div className="actions-panel">
            <Button
              primary
              label={<Trans>Add cluster</Trans>}
              onClick={this.addCluster}
              waiting={this.isWaiting}
            />
          </div>
        </div>
        <div className="info-panel flex column gaps">
          <h2>Clusters associated with Lens</h2>
          <p>
            Add clusters by clicking the <span className="text-primary">Add Cluster</span> button.
            You'll need to obtain a working kubeconfig for the cluster you want to add.
          </p>
          <p>
            Each <a href="https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/#context" target="_blank">cluster context</a> is added as a separate item in the
            left-side cluster menu
            to allow you to operate easily on multiple clusters and/or contexts.
          </p>
          <p>
            For more information on kubeconfig see <a href="https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/" target="_blank">Kubernetes docs</a>
          </p>
          <p>
            NOTE: Any manually added cluster is not merged into your kubeconfig file.
          </p>
          <p>
            To see your currently enabled config with <code>kubectl</code>, use <code>kubectl config view --minify --raw</code> command in your terminal.
          </p>
          <p>
            When connecting to a cluster, make sure you have a valid and working kubeconfig for the cluster. Following lists known "gotchas" in some authentication types used in kubeconfig with Lens
            app.
          </p>
          <a href="https://kubernetes.io/docs/reference/access-authn-authz/authentication/#option-1-oidc-authenticator" target="_blank">
            <h4>OIDC (OpenID Connect)</h4>
          </a>
          <div>
            <p>
              When connecting Lens to OIDC enabled cluster, there's few things you as a user need to take into account.
            </p>
            <b>Dedicated refresh token</b>
            <p>
              As Lens app utilized kubeconfig is "disconnected" from your main kubeconfig Lens needs to have it's own refresh token it utilizes.
              If you share the refresh token with e.g. <code>kubectl</code> who ever uses the token first will invalidate it for the next user.
              One way to achieve this is with <a href="https://github.com/int128/kubelogin" target="_blank">kubelogin</a> tool by removing the tokens
              (both <code>id_token</code> and <code>refresh_token</code>) from
              the config and issuing <code>kubelogin</code> command. That'll take you through the login process and will result you having "dedicated" refresh token.
            </p>
          </div>
          <h4>Exec auth plugins</h4>
          <p>
            When using <a href="https://kubernetes.io/docs/reference/access-authn-authz/authentication/#configuration" target="_blank">exec auth</a> plugins make sure the paths that are used to call
            any binaries
            are full paths as Lens app might not be able to call binaries with relative paths. Make also sure that you pass all needed information either as arguments or env variables in the config,
            Lens app might not have all login shell env variables set automatically.
          </p>
        </div>
      </div>
    )
  }
}

import "./workspaces.scss"
import React from "react";
import { observer } from "mobx-react";
import { computed, observable, toJS } from "mobx";
import { t, Trans } from "@lingui/macro";
import { WizardLayout } from "../layout/wizard-layout";
import { Workspace, WorkspaceId, workspaceStore } from "../../../common/workspace-store";
import { v4 as uuid } from "uuid"
import { _i18n } from "../../i18n";
import { ConfirmDialog } from "../confirm-dialog";
import { Icon } from "../icon";
import { Input } from "../input";
import { autobind, cssNames, prevDefault } from "../../utils";
import { Button } from "../button";
import { AutoDetectExectuables } from "../AutoDetectExecutables";

@observer
export class Workspaces extends React.Component {
  @observable editingWorkspaces = observable.map<WorkspaceId, Workspace>();
  @observable editSettingsWorkspaceId: WorkspaceId = "default";

  @computed get workspaces(): Workspace[] {
    const allWorkspaces = new Map([
      ...workspaceStore.workspaces,
      ...this.editingWorkspaces,
    ]);
    return Array.from(allWorkspaces.values());
  }

  renderInfo() {
    return <>
      <h2><Trans>What is a Workspace?</Trans></h2>
      <p className="info">
        <Trans>Workspaces are used to organize number of clusters into logical groups.</Trans>
      </p>
      <p>
        <Trans>A single workspaces contains a list of clusters and their full configuration.</Trans>
      </p>
    </>
  }

  renderSettings() {
    const workspace = workspaceStore.getById(this.editSettingsWorkspaceId)
    workspace.preferences ??= {}
    return <>
      <h2><Trans>Workspace Settings for</Trans> "{workspace.name}"</h2>
      <p>
        <Trans>These settings are for specifying how each executable binary should be determined workspace wide.</Trans>{" "}
        <Trans>Either automatically based on the cluster version, using the bundled version, or by manually specifying a path to the executable.</Trans>
      </p>
      <AutoDetectExectuables preferences={workspace.preferences} />
    </>
  }

  renderInfoPanel() {
    return <>
      {this.renderInfo()}
      {this.renderSettings()}
    </>
  }

  @autobind()
  saveWorkspace(id: WorkspaceId) {
    const draft = toJS(this.editingWorkspaces.get(id));
    if (draft) {
      this.clearEditing(id);
      workspaceStore.saveWorkspace(draft);
    }
  }

  @autobind()
  addWorkspace() {
    const workspaceId = uuid();
    this.editingWorkspaces.set(workspaceId, {
      id: workspaceId,
      name: "",
      description: "",
    })
  }

  @autobind()
  editWorkspace(id: WorkspaceId) {
    const workspace = workspaceStore.getById(id);
    this.editingWorkspaces.set(id, toJS(workspace));
  }

  @autobind()
  clearEditing(id: WorkspaceId) {
    this.editingWorkspaces.delete(id);
  }

  @autobind()
  removeWorkspace(id: WorkspaceId) {
    const workspace = workspaceStore.getById(id);
    ConfirmDialog.open({
      okButtonProps: {
        label: _i18n._(t`Remove Workspace`),
        primary: false,
        accent: true,
      },
      ok: () => {
        this.clearEditing(id);
        workspaceStore.removeWorkspace(id);
      },
      message: (
        <div className="confirm flex column gaps">
          <p>
            <Trans>Are you sure you want remove workspace <b>{workspace.name}</b>?</Trans>
          </p>
          <p className="info">
            <Trans>All clusters within workspace will be cleared as well</Trans>
          </p>
        </div>
      ),
    })
  }

  @autobind()
  editWorkspaceSettings(workspaceId: string): void {
    this.editSettingsWorkspaceId = workspaceId;
  }

  render() {
    return (
      <WizardLayout className="Workspaces" infoPanel={this.renderInfoPanel()}>
        <h2>
          <Trans>Workspaces</Trans>
        </h2>
        <div className="items flex column gaps">
          {this.workspaces.map(({ id: workspaceId, name, description }) => {
            const isActive = workspaceStore.currentWorkspaceId === workspaceId;
            const isDefault = workspaceStore.isDefault(workspaceId);
            const isEditing = this.editingWorkspaces.has(workspaceId);
            const editingWorkspace = this.editingWorkspaces.get(workspaceId);
            const className = cssNames("workspace flex gaps align-center", {
              active: isActive,
              editing: isEditing,
              default: isDefault,
            });
            const row = []

            if (isEditing) {
              row.push(
                <Input
                  key="edit-name"
                  className="name"
                  placeholder={_i18n._(t`Name`)}
                  value={editingWorkspace.name}
                  onChange={v => editingWorkspace.name = v}
                />,
                <Input
                  key="edit-description"
                  className="description"
                  placeholder={_i18n._(t`Description`)}
                  value={editingWorkspace.description}
                  onChange={v => editingWorkspace.description = v}
                />,
                <Icon
                  key="edit-cancel"
                  material="cancel"
                  tooltip={<Trans>Cancel</Trans>}
                  onClick={() => this.clearEditing(workspaceId)}
                />,
                <Icon
                  key="edit-save"
                  material="save"
                  tooltip={<Trans>Save</Trans>}
                  onClick={() => this.saveWorkspace(workspaceId)}
                />,
              )
            } else {
              const actions = [
                <Icon
                  key="settings"
                  material="settings"
                  tooltip={<Trans>Settings</Trans>}
                  onClick={() => this.editWorkspaceSettings(workspaceId)}
                />
              ];
              if (!isDefault) {
                actions.push(
                  <Icon
                    key="edit"
                    material="edit"
                    tooltip={<Trans>Edit</Trans>}
                    onClick={() => this.editWorkspace(workspaceId)}
                  />,
                  <Icon
                    key="delete"
                    material="delete"
                    tooltip={<Trans>Delete</Trans>}
                    onClick={() => this.removeWorkspace(workspaceId)}
                  />
                )
              }
              row.push(
                <span key="display-name" className="name flex gaps align-center">
                  <a href="#" onClick={prevDefault(() => workspaceStore.setActive(workspaceId))}>{name}</a>
                  {isActive && <span> <Trans>(current)</Trans></span>}
                </span>,
                <span key="display-description" className="description">{description}</span>,
                ...actions
              )
            }
            return <div key={workspaceId} className={className}>{row}</div>
          })}
        </div>
        <Button
          primary
          className="box left"
          label={<Trans>Add Workspace</Trans>}
          onClick={this.addWorkspace}
        />
      </WizardLayout>
    );
  }
}

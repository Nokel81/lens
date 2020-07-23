import "./add-role-binding-dialog.scss"

import React from "react";
import { computed, observable } from "mobx";
import { observer } from "mobx-react";
import { t, Trans } from "@lingui/macro";
import { _i18n } from "../../i18n";
import { Dialog, DialogProps } from "../dialog";
import { Wizard, WizardStep } from "../wizard";
import { Select, SelectOption } from "../select";
import { SubTitle } from "../layout/sub-title";
import { IRoleBindingSubject, RoleBinding, ServiceAccount, Role } from "../../api/endpoints";
import { Icon } from "../icon";
import { Input } from "../input";
import { NamespaceSelect } from "../+namespaces/namespace-select";
import { Checkbox } from "../checkbox";
import { KubeObject } from "../../api/kube-object";
import { Notifications } from "../notifications";
import { showDetails } from "../../navigation";
import { rolesStore } from "../+user-management-roles/roles.store";
import { namespaceStore } from "../+namespaces/namespace.store";
import { serviceAccountsStore } from "../+user-management-service-accounts/service-accounts.store";
import { roleBindingsStore } from "./role-bindings.store";

interface BindingSelectOption<T> extends SelectOption<T> {
  subject?: IRoleBindingSubject; // used for new user/group when users-management-api not available
}

interface Props extends Partial<DialogProps> {
}

@observer
export class AddRoleBindingDialog extends React.Component<Props> {
  @observable static isOpen = false;
  @observable static data: RoleBinding = null;

  static open(roleBinding?: RoleBinding) {
    AddRoleBindingDialog.isOpen = true;
    AddRoleBindingDialog.data = roleBinding;
  }

  static close() {
    AddRoleBindingDialog.isOpen = false;
  }

  get roleBinding(): RoleBinding {
    return AddRoleBindingDialog.data;
  }

  @observable isLoading = false;
  @observable selectedRoleId = "";
  @observable useRoleForBindingName = true;
  @observable bindingName = ""; // new role-binding name
  @observable bindContext = ""; // empty value means "cluster-wide", otherwise bind to namespace
  @observable selectedAccounts = observable.array<ServiceAccount>([], { deep: false });

  @computed get isEditing() {
    return !!this.roleBinding;
  }

  @computed get selectedRole() {
    return rolesStore.items.find(role => role.getId() === this.selectedRoleId);
  }

  @computed get selectedBindings() {
    return [
      ...this.selectedAccounts,
    ]
  }

  close = () => {
    AddRoleBindingDialog.close();
  }

  async loadData() {
    const stores = [
      namespaceStore,
      rolesStore,
      serviceAccountsStore,
    ];
    this.isLoading = true;
    await Promise.all(stores.map(store => store.loadAll()));
    this.isLoading = false;
  }

  onOpen = async () => {
    await this.loadData();

    if (this.roleBinding) {
      const { name, kind } = this.roleBinding.roleRef;
      const role = rolesStore.items.find(role => role.kind === kind && role.getName() === name);
      if (role) {
        this.selectedRoleId = role.getId();
        this.bindContext = role.getNs() || "";
      }
    }
  }

  reset = () => {
    this.selectedRoleId = "";
    this.bindContext = "";
    this.selectedAccounts.clear();
  }

  onBindContextChange = (namespace: string) => {
    this.bindContext = namespace;
    const roleContext = this.selectedRole && this.selectedRole.getNs() || "";
    if (this.bindContext && this.bindContext !== roleContext) {
      this.selectedRoleId = ""; // reset previously selected role for specific context
    }
  }

  createBindings = async () => {
    const { selectedRole, bindContext: namespace, selectedBindings, bindingName, useRoleForBindingName } = this;

    const subjects = selectedBindings.map((item: KubeObject | IRoleBindingSubject) => {
      if (item instanceof KubeObject) {
        return {
          name: item.getName(),
          kind: item.kind,
          namespace: item.getNs(),
        }
      }
      return item;
    });

    try {
      let roleBinding: RoleBinding;
      if (this.isEditing) {
        roleBinding = await roleBindingsStore.updateSubjects({
          roleBinding: this.roleBinding,
          addSubjects: subjects,
        });
      }
      else {
        const name = useRoleForBindingName ? selectedRole.getName() : bindingName;
        roleBinding = await roleBindingsStore.create({ name, namespace }, {
          subjects: subjects,
          roleRef: {
            name: selectedRole.getName(),
            kind: selectedRole.kind,
          }
        });
      }
      showDetails(roleBinding.selfLink);
      this.close();
    } catch (err) {
      Notifications.error(err);
    }
  };

  @computed get roleOptions(): SelectOption<Role>[] {
    let roles = rolesStore.items as Role[]
    if (this.bindContext) {
      // show only cluster-roles or roles for selected context namespace
      roles = roles.filter(role => !role.getNs() || role.getNs() === this.bindContext);
    }
    return roles.map(role => {
      const namespace = role.getNs();
      return {
        value: role,
        label: role.getName() + (namespace ? ` (${namespace})` : "")
      }
    })
  }

  @computed get serviceAccountOptions(): SelectOption<ServiceAccount>[] {
    return serviceAccountsStore.items.map(account => ({
      value: account,
      label: <><Icon small material="account_box" /> {name} ({account.getNs()})</>
    }))
  }

  renderContents() {
    return (
      <>
        <SubTitle title={<Trans>Context</Trans>}/>
        <NamespaceSelect
          showClusterOption
          themeName="light"
          isDisabled={this.isEditing}
          value={this.bindContext}
          onNewSelection={(ns: string) => this.onBindContextChange(ns)}
        />

        <SubTitle title={<Trans>Role</Trans>}/>
        <Select
          key={this.selectedRoleId}
          themeName="light"
          placeholder={_i18n._(t`Select role..`)}
          isDisabled={this.isEditing}
          options={this.roleOptions}
          value={this.roleOptions.find(({ value }) => value.getId() === this.selectedRoleId)}
          onNewSelection={(r: Role) => this.selectedRoleId = r.getId()}
        />
        {
          !this.isEditing && (
            <>
              <Checkbox
                theme="light"
                label={<Trans>Use same name for RoleBinding</Trans>}
                value={this.useRoleForBindingName}
                onChange={v => this.useRoleForBindingName = v}
              />
              {
                !this.useRoleForBindingName && (
                  <Input
                    autoFocus
                    placeholder={_i18n._(t`Name`)}
                    disabled={this.isEditing}
                    value={this.bindingName}
                    onChange={v => this.bindingName = v}
                  />
                )
              }
            </>
          )
        }

        <SubTitle title={<Trans>Binding targets</Trans>}/>
        <Select
          themeName="light"
          value={[]}
          placeholder={_i18n._(t`Select service accounts`)}
          options={this.serviceAccountOptions}
          onNewSelection={(selection: ServiceAccount[]) => this.selectedAccounts.replace(selection)}
          maxMenuHeight={200}
        />
      </>
    )
  }

  render() {
    const { ...dialogProps } = this.props;
    const { isEditing, roleBinding, selectedRole, selectedBindings } = this;
    const roleBindingName = roleBinding ? roleBinding.getName() : "";
    const header = (
      <h5>
        {roleBindingName
          ? <Trans>Edit RoleBinding <span className="name">{roleBindingName}</span></Trans>
          : <Trans>Add RoleBinding</Trans>
        }
      </h5>
    );
    const disableNext = this.isLoading || !selectedRole || !selectedBindings.length;
    const nextLabel = isEditing ? <Trans>Update</Trans> : <Trans>Create</Trans>;
    return (
      <Dialog
        {...dialogProps}
        className="AddRoleBindingDialog"
        isOpen={AddRoleBindingDialog.isOpen}
        onOpen={this.onOpen}
        close={this.close}
      >
        <Wizard header={header} done={this.close}>
          <WizardStep
            nextLabel={nextLabel} next={this.createBindings}
            disabledNext={disableNext}
            loading={this.isLoading}
          >
            {this.renderContents()}
          </WizardStep>
        </Wizard>
      </Dialog>
    )
  }
}

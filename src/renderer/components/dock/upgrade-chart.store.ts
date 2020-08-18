import { action, autorun, IReactionDisposer, reaction } from "mobx"
import { t } from "@lingui/macro"
import { dockStore, DockTabEntry, TabId, TabKind } from "./dock.store"
import { DockTabStore } from "./dock-tab.store"
import { HelmRelease, helmReleasesApi } from "../../api/endpoints/helm-releases.api"
import { releaseStore } from "../+apps-releases/release.store"
import { _i18n } from "../../i18n"

export interface ChartUpgradeData {
  releaseName: string;
  releaseNamespace: string;
}

export class UpgradeChartStore extends DockTabStore<ChartUpgradeData> {
  private watchers = new Map<string, IReactionDisposer>();

  values = new DockTabStore<string>();

  constructor() {
    super({
      storageName: "chart_releases",
    })

    autorun(() => {
      const { selectedTab, isOpen } = dockStore
      if (!isUpgradeChartTab(selectedTab)) return
      if (isOpen) {
        this.loadData(selectedTab.id)
      }
    }, { delay: 250 })

    autorun(() => {
      const objects = [...this.data.values()]
      objects.forEach(({ releaseName }) => this.createReleaseWatcher(releaseName))
    })
  }

  private createReleaseWatcher(releaseName: string) {
    if (this.watchers.get(releaseName)) {
      return
    }
    const dispose = reaction(
      () => {
        const release = releaseStore.getByName(releaseName)
        if (release) return release.getRevision() // watch changes only by revision
      },
      release => {
        const releaseTab = this.getTabByRelease(releaseName)
        if (!releaseStore.isLoaded || !releaseTab) {
          return
        }
        // auto-reload values if was loaded before
        if (release) {
          if (dockStore.selectedTab === releaseTab && this.values.getData(releaseTab.id)) {
            this.loadValues(releaseTab.id)
          }
        }
        // clean up watcher, close tab if release not exists / was removed
        else {
          dispose()
          this.watchers.delete(releaseName)
          dockStore.closeTab(releaseTab.id)
        }
      },
    )
    this.watchers.set(releaseName, dispose)
  }

  isLoading(tabId = dockStore.selectedTabId): boolean {
    const values = this.values.getData(tabId)
    return !releaseStore.isLoaded || values === undefined
  }

  @action
  async loadData(tabId: TabId): Promise<void> {
    const values = this.values.getData(tabId)
    await Promise.all([
      !releaseStore.isLoaded && releaseStore.loadAll(),
      !values && this.loadValues(tabId),
    ])
  }

  @action
  async loadValues(tabId: TabId): Promise<void> {
    this.values.clearData(tabId) // reset
    const { releaseName, releaseNamespace } = this.getData(tabId)
    const values = await helmReleasesApi.getValues(releaseName, releaseNamespace)
    this.values.setData(tabId, values)
  }

  getTabByRelease(releaseName: string): DockTabEntry {
    const item = [...this.data].find(item => item[1].releaseName === releaseName)
    if (item) {
      const [tabId] = item
      return dockStore.getTabById(tabId)
    }
  }
}

export const upgradeChartStore = new UpgradeChartStore()

export function createUpgradeChartTab(release: HelmRelease, tabParams: Partial<DockTabEntry> = {}): DockTabEntry {
  let tab = upgradeChartStore.getTabByRelease(release.getName())
  if (tab) {
    dockStore.open()
    dockStore.selectTab(tab.id)
  }
  if (!tab) {
    tab = dockStore.createTab({
      kind: TabKind.UPGRADE_CHART,
      title: _i18n._(t`Helm Upgrade: ${release.getName()}`),
      ...tabParams,
    }, false)

    upgradeChartStore.setData(tab.id, {
      releaseName: release.getName(),
      releaseNamespace: release.getNs(),
    })
  }
  return tab
}

export function isUpgradeChartTab(tab: DockTabEntry): boolean {
  return tab && tab.kind === TabKind.UPGRADE_CHART
}

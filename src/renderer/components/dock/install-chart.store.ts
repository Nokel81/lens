import { action, autorun } from "mobx"
import { dockStore, DockTabEntry, TabId, TabKind } from "./dock.store"
import { DockTabStore } from "./dock-tab.store"
import { t } from "@lingui/macro"
import { HelmChart, helmChartsApi } from "../../api/endpoints/helm-charts.api"
import { ReleaseUpdateDetails } from "../../api/endpoints/helm-releases.api"
import { _i18n } from "../../i18n"

export interface ChartInstallData {
  name: string;
  repo: string;
  version: string;
  values?: string;
  releaseName?: string;
  description?: string;
  namespace?: string;
  lastVersion?: boolean;
}

export class InstallChartStore extends DockTabStore<ChartInstallData> {
  public versions = new DockTabStore<string[]>();
  public details = new DockTabStore<ReleaseUpdateDetails>();

  constructor() {
    super({
      storageName: "install_charts",
    })
    autorun(() => {
      const { selectedTab, isOpen } = dockStore
      if (!isInstallChartTab(selectedTab)) return
      if (isOpen) {
        this.loadData()
      }
    }, { delay: 250 })
  }

  @action
  async loadData(tabId = dockStore.selectedTabId): Promise<void> {
    const sources = []

    if (!this.versions.getData(tabId)) {
      sources.push(this.loadValues(tabId))
    }
    if (!this.getData(tabId).values) {
      sources.push(this.loadValues(tabId))
    }

    await Promise.all(sources)
  }

  @action
  async loadVersions(tabId: TabId): Promise<void> {
    const { repo, name } = this.getData(tabId)
    this.versions.clearData(tabId) // reset
    const charts = await helmChartsApi.get(repo, name)
    const versions = charts.versions.map(chartVersion => chartVersion.version)
    this.versions.setData(tabId, versions)
  }

  @action
  async loadValues(tabId: TabId): Promise<void> {
    const data = this.getData(tabId)
    const { repo, name, version } = data
    let values = ""
    const fetchValues = async (retry = 1, maxRetries = 3) => {
      values = await helmChartsApi.getValues(repo, name, version)
      if (values || retry == maxRetries) return
      await fetchValues(retry + 1)
    }
    this.setData(tabId, { ...data, values: undefined }) // reset
    await fetchValues()
    this.setData(tabId, { ...data, values })
  }
}

export const installChartStore = new InstallChartStore()

export function createInstallChartTab(chart: HelmChart, tabParams: Partial<DockTabEntry> = {}): DockTabEntry {
  const { name, repo, version } = chart

  const tab = dockStore.createTab({
    kind: TabKind.INSTALL_CHART,
    title: _i18n._(t`Helm Install: ${repo}/${name}`),
    ...tabParams,
  }, false)

  installChartStore.setData(tab.id, {
    name,
    repo,
    version,
    namespace: "default",
    releaseName: "",
    description: "",
  })

  return tab
}

export function isInstallChartTab(tab: DockTabEntry): boolean {
  return tab && tab.kind === TabKind.INSTALL_CHART
}

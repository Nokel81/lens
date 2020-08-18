import semver from "semver"
import { observable } from "mobx"
import { autobind } from "../../utils"
import { HelmChart, helmChartsApi } from "../../api/endpoints/helm-charts.api"
import { ItemStore } from "../../item.store"
import flatten from "lodash/flatten"

export interface ChartVersion {
  repo: string;
  version: string;
}

@autobind()
export class HelmChartStore extends ItemStore<HelmChart> {
  @observable versions = observable.map<string, ChartVersion[]>();

  loadAll(): Promise<any> {
    return this.loadItems(() => helmChartsApi.list())
  }

  getByName(name: string, repo: string): HelmChart {
    return this.items.find(chart => chart.getName() === name && chart.getRepository() === repo)
  }

  protected sortVersions = (versions: ChartVersion[]): ChartVersion[] => {
    return versions.sort((first, second) => {
      return semver.compare(second.version, first.version)
    })
  };

  async getVersions(chartName: string, force?: boolean): Promise<ChartVersion[]> {
    let versions = this.versions.get(chartName)
    if (versions && !force) {
      return versions
    }
    const loadVersions = (repo: string) => {
      return helmChartsApi.get(repo, chartName).then(({ versions }) => {
        return versions.map(chart => ({
          repo,
          version: chart.getVersion(),
        }))
      })
    }
    if (!this.isLoaded) {
      await this.loadAll()
    }
    const repos = this.items
      .filter(chart => chart.getName() === chartName)
      .map(chart => chart.getRepository())
    versions = await Promise.all(repos.map(loadVersions))
      .then(flatten)
      .then(this.sortVersions)

    this.versions.set(chartName, versions)
    return versions
  }

  reset(): void {
    super.reset()
    this.versions.clear()
  }
}

export const helmChartStore = new HelmChartStore()

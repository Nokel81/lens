import { Cluster } from "../cluster";
import logger from "../logger";
import { HelmRepoManager } from "./helm-repo-manager";
import { HelmChartManager } from "./helm-chart-manager";
import { releaseManager } from "./helm-release-manager";

export async function installChart(cluster: Cluster, data: { chart: string; values: {}; name: string; namespace: string; version: string }) {
  return await releaseManager.installChart(data.chart, data.values, data.name, data.namespace, data.version, cluster.getProxyKubeconfigPath())
}

export async function listCharts() {
  const charts: any = {}
  await HelmRepoManager.getInstance().init()
  const repositories = await HelmRepoManager.getInstance().repositories()
  for (const repo of repositories) {
    charts[repo.name] = {}
    const manager = new HelmChartManager(repo)
    const entries = excludeDeprecated(await manager.charts())
    for (const key in entries) {
      entries[key] = entries[key][0]
    }
    charts[repo.name] = entries
  }
  return charts
}

export async function getChart(repoName: string, chartName: string, version = "") {
  const result = {
    readme: "",
    versions: {}
  }
  const repo = await HelmRepoManager.getInstance().repository(repoName)
  const chartManager = new HelmChartManager(repo)
  const chart = await chartManager.chart(chartName)
  result.readme = await chartManager.getReadme(chartName, version)
  result.versions = chart
  return result
}

export async function getChartValues(repoName: string, chartName: string, version = "") {
  const repo = await HelmRepoManager.getInstance().repository(repoName)
  const chartManager = new HelmChartManager(repo)
  return chartManager.getValues(chartName, version)
}

export async function listReleases(cluster: Cluster, namespace: string = null) {
  await HelmRepoManager.getInstance().init()
  return await releaseManager.listReleases(cluster.getProxyKubeconfigPath(), namespace)
}

export async function getRelease(cluster: Cluster, releaseName: string, namespace: string) {
  logger.debug("Fetch release")
  return await releaseManager.getRelease(releaseName, namespace, cluster)
}

export async function getReleaseValues(cluster: Cluster, releaseName: string, namespace: string) {
  logger.debug("Fetch release values")
  return await releaseManager.getValues(releaseName, namespace, cluster.getProxyKubeconfigPath())
}

export async function getReleaseHistory(cluster: Cluster, releaseName: string, namespace: string) {
  logger.debug("Fetch release history")
  return await releaseManager.getHistory(releaseName, namespace, cluster.getProxyKubeconfigPath())
}

export async function deleteRelease(cluster: Cluster, releaseName: string, namespace: string) {
  logger.debug("Delete release")
  return await releaseManager.deleteRelease(releaseName, namespace, cluster.getProxyKubeconfigPath())
}

export async function updateRelease(cluster: Cluster, releaseName: string, namespace: string, data: { chart: string; values: {}; version: string }) {
  logger.debug("Upgrade release")
  return await releaseManager.upgradeRelease(releaseName, data.chart, data.values, namespace, data.version, cluster)
}

export async function rollback(cluster: Cluster, releaseName: string, namespace: string, revision: number) {
  logger.debug("Rollback release")
  const output = await releaseManager.rollback(releaseName, namespace, revision, cluster.getProxyKubeconfigPath())
  return { message: output }
}

function excludeDeprecated(entries: any) {
  for (const key in entries) {
    entries[key] = entries[key].filter((entry: any) => {
      if (Array.isArray(entry)) {
        return entry[0]['deprecated'] != true
      }
      return entry["deprecated"] != true
    })
  }
  return entries
}

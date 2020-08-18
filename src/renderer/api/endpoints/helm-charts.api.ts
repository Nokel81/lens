import { compile } from "path-to-regexp"
import { apiBase } from "../index"
import { stringify } from "querystring"
import { autobind } from "../../utils"
import { CancellablePromise } from "../../utils/cancelableFetch"

interface HelmChartList {
  [repo: string]: {
    [name: string]: HelmChart;
  };
}

export interface HelmChartDetails {
  readme: string;
  versions: HelmChart[];
}

interface EndpointArgs {
  repo?: string;
  name?: string;
}

const endpoint: (params?: EndpointArgs) => string = compile(`/v2/charts/:repo?/:name?`)

export const helmChartsApi = {
  list(): CancellablePromise<any> {
    return apiBase
      .get<HelmChartList>(endpoint())
      .then(data => (
        Object
          .values(data)
          .reduce((allCharts: HelmChart[], repoCharts) => allCharts.concat(Object.values(repoCharts)), [])
          .map(chart => new HelmChart(chart))
      ))
  },

  get(repo: string, name: string, readmeVersion?: string): CancellablePromise<HelmChartDetails> {
    const path = endpoint({ repo, name })
    return apiBase
      .get<HelmChartDetails>(path + "?" + stringify({ version: readmeVersion }))
      .then(({ versions, readme }) => ({
        readme,
        versions: versions.map(v => new HelmChart(v)),
      }))
  },

  getValues(repo: string, name: string, version: string): CancellablePromise<string> {
    return apiBase
      .get<string>(`/v2/charts/${repo}/${name}/values?` + stringify({ version }))
  },
}

@autobind()
export class HelmChart {
  constructor(data: Record<string, any>) {
    Object.assign(this, data)
  }

  apiVersion: string
  name: string
  version: string
  repo: string
  kubeVersion?: string
  created: string
  description?: string
  digest: string
  keywords?: string[]
  home?: string
  sources?: string[]
  maintainers?: {
    name: string;
    email: string;
    url: string;
  }[]
  engine?: string
  icon?: string
  appVersion?: string
  deprecated?: boolean
  tillerVersion?: string

  getId(): string {
    return this.digest
  }

  getName(): string {
    return this.name
  }

  getFullName(splitter = "/"): string {
    return [this.getRepository(), this.getName()].join(splitter)
  }

  getDescription(): string {
    return this.description
  }

  getIcon(): string {
    return this.icon
  }

  getHome(): string {
    return this.home
  }

  getMaintainers(): { name: string; email: string; url: string; }[] {
    return this.maintainers || []
  }

  getVersion(): string {
    return this.version
  }

  getRepository(): string {
    return this.repo
  }

  getAppVersion(): string {
    return this.appVersion || ""
  }

  getKeywords(): string[] {
    return this.keywords || []
  }
}

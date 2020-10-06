import { LensApiRequest } from "../router"
import * as HelmService from "../helm/helm-service"
import { LensApi } from "../lens-api"
import logger from "../logger"

class HelmApiRoute extends LensApi {
  public async listCharts(request: LensApiRequest) {
    const { response } = request
    const charts = await HelmService.listCharts()
    this.respondJson(response, charts)
  }

  public async getChart(request: LensApiRequest) {
    const { params, query, response } = request
    const chart = await HelmService.getChart(params.repo, params.chart, query.get("version"))
    this.respondJson(response, chart)
  }

  public async getChartValues(request: LensApiRequest) {
    const { params, query, response } = request
    const values = await HelmService.getChartValues(params.repo, params.chart, query.get("version"))
    this.respondJson(response, values)
  }

  public async installChart(request: LensApiRequest) {
    const { payload, cluster, response } = request
    try {
      const result = await HelmService.installChart(cluster, payload)
      this.respondJson(response, result, 201)
    } catch (error) {
      logger.debug(error)
      this.respondText(response, error, 422)
    }
  }

  public async updateRelease(request: LensApiRequest) {
    const { cluster, params, payload, response } = request
    try {
      const result = await HelmService.updateRelease(cluster, params.release, params.namespace, payload)
      this.respondJson(response, result)
    } catch (error) {
      logger.debug(error)
      this.respondText(response, error, 422)
    }
  }

  public async rollbackRelease(request: LensApiRequest) {
    const { cluster, params, payload, response } = request
    try {
      const result = await HelmService.rollback(cluster, params.release, params.namespace, payload.revision)
      this.respondJson(response, result)
    } catch (error) {
      logger.debug(error)
      this.respondText(response, error)
    }
  }

  public async listReleases(request: LensApiRequest) {
    const { cluster, params, response } = request
    try {
      const result = await HelmService.listReleases(cluster, params.namespace)
      this.respondJson(response, result)
    } catch (error) {
      logger.debug(error)
      this.respondText(response, error)
    }
  }

  public async getRelease(request: LensApiRequest) {
    const { cluster, params, response } = request
    try {
      const result = await HelmService.getRelease(cluster, params.release, params.namespace)
      this.respondJson(response, result)
    } catch (error) {
      logger.debug(error)
      this.respondText(response, error, 422)
    }
  }

  public async getReleaseValues(request: LensApiRequest) {
    const { cluster, params, response } = request
    try {
      const result = await HelmService.getReleaseValues(cluster, params.release, params.namespace)
      this.respondText(response, result)
    } catch (error) {
      logger.debug(error)
      this.respondText(response, error, 422)
    }
  }

  public async getReleaseHistory(request: LensApiRequest) {
    const { cluster, params, response } = request
    try {
      const result = await HelmService.getReleaseHistory(cluster, params.release, params.namespace)
      this.respondJson(response, result)
    } catch (error) {
      logger.debug(error)
      this.respondText(response, error, 422)
    }
  }

  public async deleteRelease(request: LensApiRequest) {
    const { cluster, params, response } = request
    try {
      const result = await HelmService.deleteRelease(cluster, params.release, params.namespace)
      this.respondJson(response, result)
    } catch (error) {
      logger.debug(error)
      this.respondText(response, error, 422)
    }
  }
}

export const helmRoute = new HelmApiRoute()

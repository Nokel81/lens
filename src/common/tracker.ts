import ua from "universal-analytics"
import { machineIdSync } from "node-machine-id"
import Singleton from "./utils/singleton";
import { UserStore } from "./user-store"
import logger from "../main/logger";

export class Tracker extends Singleton {
  static readonly GA_ID = "UA-159377374-1"

  protected visitor: ua.Visitor
  protected machineId: string = null;
  protected ip: string = null;
  protected appVersion: string;
  protected locale: string;
  protected electronUA: string;

  constructor() {
    super();
    try {
      this.visitor = ua(Tracker.GA_ID, machineIdSync(), { strictCidFormat: false })
    } catch (error) {
      this.visitor = ua(Tracker.GA_ID)
    }
    this.visitor.set("dl", "https://telemetry.k8slens.dev")
  }

  protected async isTelemetryAllowed(): Promise<boolean> {
    return UserStore.getInstance().preferences.allowTelemetry;
  }

  async event(eventCategory: string, eventAction: string, otherParams = {}) {
    try {
      if (!await this.isTelemetryAllowed()) {
        return;
      }
      this.visitor.event({
        ec: eventCategory,
        ea: eventAction,
        ...otherParams,
      }).send()
    } catch (err) {
      logger.error(`Failed to track "${eventCategory}:${eventAction}"`, err)
    }
  }
}

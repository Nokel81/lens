import { RouteProps } from "react-router"
import { configMapsURL } from "../+config-maps"
import { Config } from "./config"

export const configRoute: RouteProps = {
  get path() {
    return Config.tabRoutes.map(({ path }) => path).flat()
  },
}

export const configURL = configMapsURL

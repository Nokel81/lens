// Main process

import "../common/system-ca"
import "../common/prometheus-providers"
import { app, dialog } from "electron"
import { appName } from "../common/vars";
import path from "path"
import { LensProxy } from "./lens-proxy"
import { WindowManager } from "./window-manager";
import { ClusterManager } from "./cluster-manager";
import AppUpdater from "./app-updater"
import { shellSync } from "./shell-sync"
import { getFreePort } from "./port"
import { mangleProxyEnv } from "./proxy-env"
import { registerFileProtocol } from "../common/register-protocol";
import { ClusterStore } from "../common/cluster-store"
import { UserStore } from "../common/user-store";
import { WorkspaceStore } from "../common/workspace-store";
import { Tracker } from "../common/tracker";
import logger from "./logger"

const workingDir = path.join(app.getPath("appData"), appName);
app.setName(appName);
if (!process.env.CICD) {
  app.setPath("userData", workingDir);
}

mangleProxyEnv()
if (app.commandLine.getSwitchValue("proxy-server") !== "") {
  process.env.HTTPS_PROXY = app.commandLine.getSwitchValue("proxy-server")
}

const onQuit: (() => void)[] = []

async function main() {
  await shellSync();
  logger.info(`🚀 Starting Lens from "${workingDir}"`)

  Tracker.getInstance().event("app", "start");
  const updater = new AppUpdater()
  updater.start();

  registerFileProtocol("static", __static);

  // find free port
  let proxyPort: number
  try {
    proxyPort = await getFreePort()
  } catch (error) {
    logger.error(error)
    dialog.showErrorBox("Lens Error", "Could not find a free port for the cluster proxy")
    app.quit();
  }

  // preload configuration from stores
  await Promise.all([
    UserStore.getInstance().init(),
    ClusterStore.getInstance().init(),
    WorkspaceStore.getInstance().init(),
  ]);

  // create cluster manager
  const clusterManager = new ClusterManager(proxyPort);
  onQuit.push(() => clusterManager.stop())

  // run proxy
  try {
    const proxyServer = LensProxy.create(proxyPort, clusterManager);
    onQuit.push(() => proxyServer.close())
  } catch (error) {
    logger.error(`Could not start proxy (127.0.0:${proxyPort}): ${error.message}`)
    dialog.showErrorBox("Lens Error", `Could not start proxy (127.0.0:${proxyPort}): ${error.message || "unknown error"}`)
    app.quit();
  }

  // create window manager and open app
  const windowManager = new WindowManager(proxyPort);
  onQuit.push(() => windowManager.destroy())
}

app.on("ready", main);

app.on("will-quit", async (event) => {
  event.preventDefault(); // To allow mixpanel sending to be executed
  for (const cleanup of onQuit) {
    cleanup()
  }
  app.exit();
})

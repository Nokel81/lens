import path from "path"
import Config from "conf"
import { Options as ConfOptions } from "conf/dist/source/types"
import { app, ipcMain, IpcMainEvent, ipcRenderer, IpcRendererEvent, remote } from "electron"
import { observable, reaction, runInAction, toJS } from "mobx";
import Singleton from "./utils/singleton";
import { getAppVersion } from "./utils/app-version";
import logger from "../main/logger";
import { broadcastIpc, IpcBroadcastParams } from "./ipc";
import isEqual from "lodash/isEqual";
import { autobind } from "../renderer/utils";

export interface BaseStoreParams<T> extends ConfOptions<T> {
  syncEnabled?: boolean;
}

export abstract class BaseStore<T> extends Singleton {
  protected storeConfig: Config<T>;
  protected syncDisposers: (() => void)[] = [];
  protected syncEnabled: boolean;

  @observable protected data: T;

  protected constructor(params: BaseStoreParams<T>) {
    super();
    const { syncEnabled = true, ...confOptions } = params

    this.syncEnabled = syncEnabled
    this.storeConfig = new Config({
      ...confOptions,
      projectName: "lens",
      projectVersion: getAppVersion(),
      cwd: (app || remote.app).getPath("userData")
    })
  }

  get name() {
    return path.basename(this.storeConfig.path);
  }

  get syncChannel() {
    return `store-sync:${this.name}`
  }

  async init() {
    await this.load();

    if (this.syncEnabled) {
      this.startSyncing();
    }
  }

  protected async load() {
    this.fromStore(this.storeConfig.store);
    logger.info(`[STORE]: LOADED from ${this.storeConfig.path}`);
  }

  protected async saveToFile(model: T) {
    logger.info(`[STORE]: SAVING ${this.name}`);
    // todo: update when fixed https://github.com/sindresorhus/conf/issues/114
    Object.entries(model).forEach(([key, value]) => {
      this.storeConfig.set(key, value);
    });
  }

  @autobind()
  private mainCallback(event: IpcMainEvent, model: T) {
    logger.silly(`[STORE]: SYNC ${this.name} from renderer`, { model });
    this.onSync(model);
  }

  @autobind()
  private rendererCallback(event: IpcRendererEvent, model: T) {
    logger.silly(`[STORE]: SYNC ${this.name} from main`, { model });
    this.onSync(model);
  }

  startSyncing() {
    this.syncDisposers.push(
      reaction(() => this.toJSON(), model => this.onModelChange(model)),
    );
    if (ipcMain) {
      ipcMain.on(this.syncChannel, this.mainCallback);
      this.syncDisposers.push(() => ipcMain.off(this.syncChannel, this.mainCallback));
    }
    if (ipcRenderer) {
      ipcRenderer.on(this.syncChannel, this.rendererCallback);
      this.syncDisposers.push(() => ipcRenderer.off(this.syncChannel, this.rendererCallback));
    }
  }

  unregisterIpcListener() {
    ipcRenderer.removeAllListeners(this.syncChannel)
  }

  disableSync() {
    this.syncDisposers.forEach(dispose => dispose());
    this.syncDisposers.length = 0;
  }

  protected applyWithoutSync(callback: () => void) {
    this.disableSync();
    runInAction(callback);
    if (this.syncEnabled) {
      this.startSyncing();
    }
  }

  protected onSync(model: T) {
    // todo: use "resourceVersion" if merge required (to avoid equality checks => better performance)
    if (!isEqual(this.toJSON(), model)) {
      this.fromStore(model);
    }
  }

  protected async onModelChange(model: T) {
    if (ipcMain) {
      this.saveToFile(model); // save config file
      this.syncToWebViews(model); // send update to renderer views
    }
    // send "update-request" to main-process
    if (ipcRenderer) {
      ipcRenderer.send(this.syncChannel, model);
    }
  }

  protected async syncToWebViews(model: T) {
    const msg: IpcBroadcastParams = {
      channel: this.syncChannel,
      args: [model],
    }
    broadcastIpc(msg); // send to all windows (BrowserWindow, webContents)

    const { ClusterStore } = await import("./cluster-store")

    for (const frameId of ClusterStore.getInstance().subFrameIds) {
      // send to all sub-frames (e.g. cluster-view managed in iframe)
      broadcastIpc({
        ...msg,
        frameId,
        frameOnly: true,
      })
    }
  }

  protected abstract fromStore(data: T): void;

  // todo: use "serializr" ?
  toJSON(): T {
    return toJS(this.data, {
      recurseEverything: true,
    })
  }
}

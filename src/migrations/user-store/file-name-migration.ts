import fse from "fs-extra"
import { app, remote } from "electron";
import path from "path"

export function fileNameMigration() {
  const userDataPath = (app || remote.app).getPath("userData");
  const configJsonPath = path.join(userDataPath, "config.json")
  const lensUserStoreJsonPath = path.join(userDataPath, "lens-user-store.json")
  const configJsonExists = fse.pathExistsSync(configJsonPath)
  const lensUserStoreJsonExists = fse.pathExistsSync(lensUserStoreJsonPath)

  if (configJsonExists && !lensUserStoreJsonExists) {
    fse.moveSync(configJsonPath, lensUserStoreJsonPath)
  }
}
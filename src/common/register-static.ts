// Setup static folder for common assets

import path from "path";
import { protocol } from "electron"
import logger from "../main/logger";
import { staticDir, staticProto, staticScheme } from "./vars";

export function registerStaticProtocol(rootFolder = staticDir) {
  protocol.registerFileProtocol(staticScheme, (request, callback) => {
    const relativePath = request.url.replace(staticProto, "");
    const absPath = path.resolve(rootFolder, relativePath);
    callback(absPath);
  }, (error) => {
    logger.debug(`Failed to register protocol "${staticScheme}"`, error);
  })
}

export function getStaticUrl(filePath: string) {
  return staticProto + filePath;
}

export function getStaticPath(filePath: string) {
  return path.resolve(staticDir, filePath);
}

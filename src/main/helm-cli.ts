import packageInfo from "../../package.json"
import path from "path"
import { LensBinary } from "./lens-binary"
import { isProduction } from "../common/vars";

export class HelmCli extends LensBinary {

  public constructor(baseDir: string, version: string) {
    super({
      version,
      baseDir,
      originalBinaryName: "helm",
      newBinaryName: "helm3"
    })
  }

  protected getTarName(): string {
    return `${this.binaryName}-v${this.binaryVersion}-${this.platformName}-${this.arch}.tar.gz`
  }

  protected getUrl(): string {
    return `https://get.helm.sh/helm-v${this.binaryVersion}-${this.platformName}-${this.arch}.tar.gz`
  }

  protected getBinaryPath(): string {
    return path.join(this.dirname, this.binaryName)
  }

  protected getOriginalBinaryPath(): string {
    return path.join(this.dirname, this.platformName + "-" + this.arch, this.originalBinaryName)
  }
}

export const helmCli = new HelmCli(
  isProduction ? path.join(process.cwd(), "binaries", "client") : process.resourcesPath, 
  packageInfo.config.bundledHelmVersion
);


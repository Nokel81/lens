import path from "path"
import fs from "fs"
import request from "request"
import logger from "./logger"
import * as tar from "tar"
import { isWindows } from "../common/vars";
import { pathExists, ensureDir } from "fs-extra"
const { promises: fsp } = fs;

export type LensBinaryOpts = {
  version: string;
  baseDir: string;
  originalBinaryName: string;
  newBinaryName?: string;
  requestOpts?: request.Options;
}

export class LensBinary {

  public binaryVersion: string
  protected directory: string
  protected url: string
  protected path: string;
  protected tarPath: string;
  protected dirname: string
  protected binaryName: string
  protected platformName: string
  protected arch: string
  protected originalBinaryName: string
  protected requestOpts: request.Options

  constructor(opts: LensBinaryOpts) {
    const baseDir = opts.baseDir || __dirname;
    this.originalBinaryName = opts.originalBinaryName
    this.binaryName = opts.newBinaryName || opts.originalBinaryName
    this.binaryVersion = opts.version
    this.requestOpts = opts.requestOpts

    let arch = null

    if (process.arch == "x64") {
      arch = "amd64"
    }
    else if (process.arch == "x86" || process.arch == "ia32") {
      arch = "386"
    }
    else {
      arch = process.arch
    }
    this.arch = arch
    this.platformName = isWindows ? "windows" : process.platform
    this.dirname = path.normalize(path.join(baseDir, this.binaryName))
    if (isWindows) {
      this.binaryName = this.binaryName + ".exe"
      this.originalBinaryName = this.originalBinaryName + ".exe"
    }
    const tarName = this.getTarName()
    if (tarName) {
      this.tarPath = path.join(this.dirname, tarName)
    }
  }

  protected binaryDir() {
    throw new Error("binaryDir not implemented")
  }

  public async binaryPath() {
    await this.ensureBinary()
    return this.getBinaryPath()
  }

  protected getTarName(): string | null {
    return null
  }

  protected getUrl(): string {
    return ""
  }

  protected getBinaryPath() {
    return ""
  }

  protected getOriginalBinaryPath() {
    return ""
  }

  public getBinaryDir() {
    return path.dirname(this.getBinaryPath())
  }

  public async binDir() {
    try {
      await this.ensureBinary()
      return this.dirname
    } catch (err) {
      logger.error(err)
      return ""
    }
  }

  protected async checkBinary() {
    console.log(this.getBinaryPath())
    return pathExists(this.getBinaryPath())
  }

  public async ensureBinary() {
    const isValid = await this.checkBinary()
    if (!isValid) {
      try {
        await this.downloadBinary()
      } catch (error) {
        logger.error(error)
      }
      if (this.tarPath) await this.untarBinary()
      if (this.originalBinaryName != this.binaryName) await this.renameBinary()
      logger.info(`${this.originalBinaryName} has been downloaded to ${this.getBinaryPath()}`)
    }
  }

  protected async untarBinary() {
    return new Promise<void>((resolve, reject) => {
      logger.debug(`Extracting ${this.originalBinaryName} binary`)
      tar.x({
        file: this.tarPath,
        cwd: this.dirname
      }).then((_ => {
        resolve()
      }))
    })
  }

  protected async renameBinary() {
    logger.debug(`Renaming ${this.originalBinaryName} binary to ${this.binaryName}`)
    return fsp.rename(this.getOriginalBinaryPath(), this.getBinaryPath())
  }

  protected async downloadBinary() {
    const binaryPath = this.tarPath || this.getBinaryPath()
    await ensureDir(this.getBinaryDir(), 0o755)

    const file = fs.createWriteStream(binaryPath)
    const url = this.getUrl()

    logger.info(`Downloading ${this.originalBinaryName} ${this.binaryVersion} from ${url} to ${binaryPath}`)
    const requestOpts: request.UriOptions & request.CoreOptions = {
      uri: url,
      gzip: true,
      ...this.requestOpts
    }

    const stream = request(requestOpts)

    stream.on("complete", () => {
      logger.info(`Download of ${this.originalBinaryName} finished`)
      file.end()
    })

    stream.on("error", async (error) => {
      logger.error(error)
      await fsp.unlink(binaryPath)
      throw(error)
    })
    
    return new Promise((resolve, reject) => {
      file.on("close", async () => {
        logger.debug(`${this.originalBinaryName} binary download closed`)
        if (!this.tarPath) await fsp.chmod(binaryPath, 0o755)
        resolve()
      })
      stream.pipe(file)
    })
  }
}

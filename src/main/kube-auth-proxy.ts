import { ChildProcess, spawn } from "child_process"
import { waitUntilUsed } from "tcp-port-used";
import { broadcastIpc } from "../common/ipc";
import type { Cluster } from "./cluster"
import { bundledKubectl, Kubectl } from "./kubectl"
import logger from "./logger"

export interface KubeAuthProxyLog {
  data: string;
  error?: boolean; // stream=stderr
}

export class KubeAuthProxy {
  public lastError: string

  protected cluster: Cluster
  protected env: NodeJS.ProcessEnv = null
  protected proxyProcess: ChildProcess
  protected port: number
  protected kubectl: Kubectl

  constructor(cluster: Cluster, port: number, env: NodeJS.ProcessEnv) {
    this.env = env
    this.port = port
    this.cluster = cluster
    this.kubectl = bundledKubectl
  }

  public async run(): Promise<void> {
    if (this.proxyProcess) {
      return;
    }
    const proxyBin = await this.kubectl.getPath()
    const args = [
      "proxy",
      "-p", `${this.port}`,
      "--kubeconfig", `${this.cluster.kubeConfigPath}`,
      "--context", `${this.cluster.contextName}`,
      "--accept-hosts", ".*",
      "--reject-paths", "^[^/]"
    ]
    if (process.env.DEBUG_PROXY === "true") {
      args.push("-v", "9")
    }
    logger.debug(`spawning kubectl proxy with args: ${args}`)
    this.proxyProcess = spawn(proxyBin, args, { env: this.env, })
    this.proxyProcess.on("error", (error) => {
      this.sendIpcLogMessage({ data: error.message, error: true })
      this.exit()
    })
    this.proxyProcess.on("exit", (code) => {
      this.sendIpcLogMessage({ data: `proxy exited with code: ${code}`, error: code > 0 })
      this.exit();
    })

    this.proxyProcess.stdout.on('data', (chunk) => {
      const data = chunk.toString()
      if (data.startsWith("Starting to serve on")) {
        this.sendIpcLogMessage({ data: "Authentication proxy started\n" })
      } else {
        this.sendIpcLogMessage({ data })
      }
    })

    this.proxyProcess.stderr.on('data', (chunk) => {
      const data = chunk.toString()
      this.lastError = this.parseError(data)
      this.sendIpcLogMessage({ data, error: true })
    })

    return waitUntilUsed(this.port, 500, 10000)
  }

  protected parseError(data: string) {
    const error = data.split("http: proxy error:").slice(1).join("").trim()
    const jsonError = error.split("Response: ")[1]
    if (jsonError) {
      try {
        const parsedError = JSON.parse(jsonError)
        return parsedError.error_description || parsedError.error || jsonError
      } catch (_) {
        return jsonError.trim()
      }
    }

    return error
  }

  protected async sendIpcLogMessage(res: KubeAuthProxyLog) {
    const channel = `kube-auth:${this.cluster.id}`
    logger.info(`[KUBE-AUTH]: out-channel "${channel}"`, { ...res, meta: this.cluster.getMeta() });
    broadcastIpc({ channel, args: [res] });
  }

  public exit() {
    if (!this.proxyProcess) return;
    logger.debug("[KUBE-AUTH]: stopping local proxy", this.cluster.getMeta())
    this.proxyProcess.kill()
    this.proxyProcess.removeAllListeners();
    this.proxyProcess.stderr.removeAllListeners();
    this.proxyProcess.stdout.removeAllListeners();
    this.proxyProcess = null;
  }
}

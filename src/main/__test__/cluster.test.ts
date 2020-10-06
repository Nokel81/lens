const logger = {
  silly: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  crit: jest.fn(),
};

jest.mock("winston", () => ({
  format: {
    colorize: jest.fn(),
    combine: jest.fn(),
    simple: jest.fn(),
    label: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn()
  },
  createLogger: jest.fn().mockReturnValue(logger),
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  }
}))

jest.mock("../../common/ipc")
jest.mock("../context-handler")

import { Console } from "console";
import mockFs from "mock-fs";
import { WorkspaceStore } from "../../common/workspace-store";
import { Cluster } from "../cluster"
import { getFreePort } from "../port";

console = new Console(process.stdout, process.stderr) // fix mockFS

describe("create clusters", () => {
  beforeEach(() => {
    Object.values(logger).forEach(l => l.mockClear())
  })

  beforeEach(() => {
    const mockOpts = {
      "minikube-config.yml": JSON.stringify({
        apiVersion: "v1",
        clusters: [{
          name: "minikube",
          cluster: {
            server: "https://192.168.64.3:8443",
          },
        }],
        contexts: [{
          context: {
            cluster: "minikube",
            user: "minikube",
          },
          name: "minikube",
        }],
        users: [{
          name: "minikube",
        }],
        kind: "Config",
        preferences: {},
      })
    }
    mockFs(mockOpts)
  })

  afterEach(() => {
    mockFs.restore()
  })

  it("should be able to create a cluster from a cluster model and apiURL should be decoded", () => {
    const c = new Cluster({
      id: "foo",
      contextName: "minikube",
      kubeConfigPath: "minikube-config.yml",
      workspace: WorkspaceStore.getInstance().currentWorkspaceId
    })
    expect(c.apiUrl).toBe("https://192.168.64.3:8443")
  })

  it("init should not throw if everything is in order", async () => {
    const c = new Cluster({
      id: "foo",
      contextName: "minikube",
      kubeConfigPath: "minikube-config.yml",
      workspace: WorkspaceStore.getInstance().currentWorkspaceId
    })
    await c.init(await getFreePort())
    expect(logger.info).toBeCalledWith(expect.stringContaining("init success"), {
      id: "foo",
      apiUrl: "https://192.168.64.3:8443",
      context: "minikube",
    })
  })

  it("activating cluster should try to connect to cluster and bind events", async () => {
    const c = new Cluster({
      id: "foo",
      contextName: "minikube",
      kubeConfigPath: "minikube-config.yml",
      workspace: WorkspaceStore.getInstance().currentWorkspaceId
    })
    await c.init(await getFreePort())
    await c.activate()
    expect(logger.info).toBeCalledWith(expect.stringContaining("init success"), {
      id: "foo",
      apiUrl: "https://192.168.64.3:8443",
      context: "minikube",
    })
  })
})

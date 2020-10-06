jest.mock("../../common/ipc")
jest.mock("child_process")

import { Cluster } from "../cluster"
import { KubeAuthProxy } from "../kube-auth-proxy"
import { getFreePort } from "../port"
import { broadcastIpc } from "../../common/ipc"
import { spawn, SpawnOptions } from "child_process"
import { bundledKubectl, Kubectl } from "../kubectl"

const mockBroadcastIpc = broadcastIpc as jest.MockedFunction<typeof broadcastIpc>
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>

describe("kube auth proxy tests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("calling exit multiple times shouldn't throw", async () => {
    const port = await getFreePort()
    const kap = new KubeAuthProxy(new Cluster({ id: "foobar", kubeConfigPath: "fake-path.yml" }), port, {})
    kap.exit()
    kap.exit()
    kap.exit()
  })

  it("should call spawn and broadcast errors", async () => {
    mockSpawn.mockImplementationOnce((command: string, args: readonly string[], options: SpawnOptions) => {
      expect(command).toBe(Kubectl.bundledKubectlPath)
    })

    const kap = new KubeAuthProxy(new Cluster({ id: "foobar", kubeConfigPath: "fake-path.yml" }), port, {})

  })
})

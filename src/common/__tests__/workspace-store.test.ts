import { Console } from "console"
import mockFs from "mock-fs"
import { WorkspaceStore } from "../workspace-store"

jest.mock("electron", () => {
  return {
    app: {
      getVersion: () => '99.99.99',
      getPath: () => 'tmp',
      getLocale: () => 'en'
    }
  }
})

console = new Console(process.stdout, process.stderr) // fix bug

describe("workspace store tests", () => {
  describe("for an empty config", () => {
    beforeEach(async () => {
      WorkspaceStore.resetInstance()
      mockFs({ tmp: { 'lens-workspace-store.json': "{}" } })

      await WorkspaceStore.getInstance().init();
    })

    afterEach(() => {
      mockFs.restore()
    })

    it("default workspace should always exist", () => {
      const ws = WorkspaceStore.getInstance();

      expect(ws.workspaces.size).toBe(1);
      expect(ws.getById(WorkspaceStore.defaultId)).not.toBe(null);
    })

    it("cannot remove the default workspace", () => {
      const ws = WorkspaceStore.getInstance();

      expect(() => ws.removeWorkspace(WorkspaceStore.defaultId)).toThrowError("Cannot remove");
    })

    it("can update default workspace name", () => {
      const ws = WorkspaceStore.getInstance();

      ws.saveWorkspace({
        id: WorkspaceStore.defaultId,
        name: "foobar",
      });

      expect(ws.currentWorkspace.name).toBe("foobar");
    })

    it("can add workspaces", () => {
      const ws = WorkspaceStore.getInstance();

      ws.saveWorkspace({
        id: "123",
        name: "foobar",
      });

      expect(ws.getById("123").name).toBe("foobar");
    })

    it("cannot set a non-existent workspace to be active", () => {
      const ws = WorkspaceStore.getInstance();

      expect(() => ws.setActive("abc")).toThrow("doesn't exist");
    })

    it("can set a existent workspace to be active", () => {
      const ws = WorkspaceStore.getInstance();

      ws.saveWorkspace({
        id: "abc",
        name: "foobar",
      });

      expect(() => ws.setActive("abc")).not.toThrowError();
    })

    it("can remove a workspace", () => {
      const ws = WorkspaceStore.getInstance();

      ws.saveWorkspace({
        id: "123",
        name: "foobar",
      });
      ws.saveWorkspace({
        id: "1234",
        name: "foobar 1",
      });
      ws.removeWorkspace("123");

      expect(ws.workspaces.size).toBe(2);
    })

    it("cannot create workspace with existent name", () => {
      const ws = WorkspaceStore.getInstance();

      ws.saveWorkspace({
        id: "someid",
        name: "default",
      });

      expect(ws.workspacesList.length).toBe(1);  // default workspace only
    })

    it("cannot create workspace with empty name", () => {
      const ws = WorkspaceStore.getInstance();

      ws.saveWorkspace({
        id: "random",
        name: "",
      });

      expect(ws.workspacesList.length).toBe(1);  // default workspace only
    })

    it("cannot create workspace with ' ' name", () => {
      const ws = WorkspaceStore.getInstance();

      ws.saveWorkspace({
        id: "random",
        name: " ",
      });

      expect(ws.workspacesList.length).toBe(1);  // default workspace only
    })

    it("trim workspace name", () => {
      const ws = WorkspaceStore.getInstance();

      ws.saveWorkspace({
        id: "random",
        name: "default ",
      });

      expect(ws.workspacesList.length).toBe(1);  // default workspace only
    })
  })

  describe("for a non-empty config", () => {
    beforeEach(async () => {
      WorkspaceStore.resetInstance()
      mockFs({
        tmp: {
          'lens-workspace-store.json': JSON.stringify({
            currentWorkspace: "abc",
            workspaces: [{
              id: "abc",
              name: "test"
            }, {
              id: "default",
              name: "default"
            }]
          })
        }
      })

      await WorkspaceStore.getInstance().init();
    })

    afterEach(() => {
      mockFs.restore()
    })

    it("doesn't revert to default workspace", async () => {
      const ws = WorkspaceStore.getInstance();

      expect(ws.currentWorkspaceId).toBe("abc");
    })
  })
})

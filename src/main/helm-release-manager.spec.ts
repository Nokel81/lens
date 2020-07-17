import { listReleases } from "./helm-release-manager";

describe("helm sanity checks", () => {
  it("listReleases should work", async () => {
    await listReleases("/path");
  });
})
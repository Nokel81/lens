import { app, remote } from 'electron';
import { PathLike } from 'fs-extra';
import path from 'path';

/**
 * This file is for types of preferences that can exist in multiple preference 
 * stores.
 */

export function getDefaultIntoDir(): string {
  return path.join((app || remote.app).getPath("userData"), "binaries")
}

export enum VersionFindingScheme {
  AUTO = "auto",
  BUNDLED = "bundled",
}

export interface ExecutableVersionOptions {
  versionFindingScheme?: VersionFindingScheme | PathLike;
}

export enum SupportedExecutables {
  KUBECTL = "kubectl",
  HELM = "helm",
}

export interface AutoDetectExecVersion {
  /**
   * This option is used for determining the functionality of automatically
   * detecting, downloading, and using versions of the executables that Lens
   * uses to do its work.
   * 
   * The options are:
   *  - Use the bundled version, this can always be used from its bundled 
   *    location since it is in the same location as Lens and Lens is 
   *    being used
   *  - Auto detect the version of the executable that most clostly matches
   *    the version desired by the cluster and download it into the `intoDir`.
   *    That option has a resonable default.
   *  - Use the provided path for each executable seperately
   * 
   * Precidence:
   *  - This settings should be in both `ClusterSettings`, `WorkspaceSettings`, 
   *    and `UserSettings`. And the precidence is that order (with the defaults
   *    being last).
   *  - if `useBundled` is true then that overrides everything else
   *  - if `autoDetectVersion` is false, then the bundled is still used. Even
   *    when `useBundled` is false
   *  - if `pathToExecutable` is set then that is used, if it doesn't work
   *    an error is displayed and no fallback is used
   */
  autoDetectExecVersions?: {
    for?: Partial<Record<SupportedExecutables, ExecutableVersionOptions>>;
    intoDir?: string;
    versionFindingScheme?: VersionFindingScheme | PathLike;
  }
}

import * as tempy from "tempy";
import { promises as fsp } from "fs";
import * as yaml from "js-yaml";
import { exec } from "./promise-exec"
import { helmCli } from "./helm-cli";
import { Cluster } from "./cluster";
import { toCamelCase } from "../common/utils";

interface HelmArgs {
  version?: string;
  namespace?: string;
  file?: string;
  kubeConfPath?: string;
  output?: string;
  generateName?: boolean;
}

function getArgs({ version, namespace, file, kubeConfPath, output, generateName }: HelmArgs): string {
  const list: string[] = [];

  if (version) {
    list.push("--version", version)
  }

  if (namespace) {
    list.push("-n", namespace)
  } else {
    list.push("--all-namespaces")
  }

  if (file) {
    list.push("-f", file);
  }

  if (kubeConfPath) {
    list.push("--kubeconfig", kubeConfPath);
  }

  if (output) {
    list.push("--output", output);
  }

  if (generateName) {
    list.push("--generate-namespace");
  }

  return list.join(" ");
}

/**
 * helmExec returns a promise of the stdout of running the helm command
 * @param args the arguments for the helm command
 */
async function helmExec(...args: string[]): Promise<string> {
  const helm = await helmCli.binaryPath()
  const { stdout } = await exec(`"${helm}" ${args.join(" ")}`);
  return stdout
}

export async function listReleases(kubeConfPath: string, namespace?: string): Promise<string[]> {
  const args = getArgs({ namespace, output: "json", kubeConfPath });
  const output = JSON.parse(await helmExec("ls", args));

  if (Array.isArray(output)) {
    return output
      .filter(s => typeof s === "string")
      .map(toCamelCase);
  }

  return [];
}

export async function installChart(chart: string, values: any, name: string, namespace: string, version: string, kubeConfPath: string){
  const file = tempy.file({ name: "values.yaml" })
  const args = getArgs({ version, file, namespace, kubeConfPath, generateName: name === ""})

  try {
    await fsp.writeFile(file, yaml.safeDump(values))
    
    const releaseNames = await helmExec("install", name, chart, args);
    const releaseName = releaseNames.split("\n")[0].split(' ')[1].trim()

    return {
      log: releaseNames,
      release: { name: releaseName, namespace }
    }
  } finally {
    await fsp.unlink(file)
  }
}

export async function upgradeRelease(name: string, chart: string, values: any, namespace: string, version: string, cluster: Cluster){
  const file = tempy.file({ name: "values.yaml" })
  const kubeConfPath = cluster.proxyKubeconfigPath();
  const args = getArgs({ version, file, namespace, kubeConfPath });
  
  try {
    await fsp.writeFile(file, yaml.safeDump(values))
    const stdout = await helmExec("upgrade", name, chart, args);
    
    return {
      log: stdout,
      release: getRelease(name, namespace, cluster)
    }
  } finally {
    await fsp.unlink(file)
  }
}

export async function getRelease(name: string, namespace: string, cluster: Cluster): Promise<Object> {
  const kubeConfPath = cluster.proxyKubeconfigPath();
  const args = getArgs({ output: "json", namespace, kubeConfPath })

  const release = JSON.parse(await helmExec("status", name, args))
  release.resources = await getResources(name, namespace, cluster)

  return release
}

export async function deleteRelease(name: string, namespace: string, kubeConfPath: string): Promise<string> {
  const args = getArgs({ namespace, kubeConfPath });

  return helmExec("delete", name, args)
}

export async function getValues(name: string, namespace: string, kubeConfPath: string): Promise<string> {
  const args = getArgs({ namespace, kubeConfPath, output: "yaml" });
  
  return helmExec("get", "values", name, "--all", args)
}

export async function getHistory(name: string, namespace: string, kubeConfPath: string): Promise<string> {
  const args = getArgs({ namespace, kubeConfPath, output: "json" });
  
  return helmExec("history", name, args)
}

export async function rollback(name: string, namespace: string, revision: number, kubeConfPath: string): Promise<string> {
  const args = getArgs({ namespace, kubeConfPath });
  
  return helmExec("rollback", name, `${revision}`, args)
}

async function getResources(name: string, namespace: string, cluster: Cluster): Promise<string> {
  const kubeConfPath = cluster.proxyKubeconfigPath()
  const args = getArgs({ namespace, kubeConfPath });
  const kubectl = await cluster.kubeCtl.kubectlPath()

  try {
    return await helmExec("get", "manifest", name, args, "|", `"${kubectl}"`, "get", args, "-f - -o=json")
  } catch (e) {
    return `{"items": []}`
  }
}

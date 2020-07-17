import * as k8s from "@kubernetes/client-node"
import * as os from "os"
import * as yaml from "js-yaml"
import logger from "./logger";
import { path } from "filenamify";

const kc = new k8s.KubeConfig()

function resolveTilde(filePath: string) {
  if (filePath[0] === "~" && (filePath[1] === "/" || filePath.length === 1)) {
    return filePath.replace("~", os.homedir());
  }
  return filePath;
}

export function loadConfig(kubeconfig: string): k8s.KubeConfig {
  if (kubeconfig) {
    kc.loadFromFile(resolveTilde(kubeconfig))
  } else {
    kc.loadFromDefault();
  }
  return kc
}

/**
 * KubeConfig is valid when there's atleast one of each defined:
 * - User
 * - Cluster
 * - Context
 *
 * @param config KubeConfig to check
 */
export function validateConfig(config: k8s.KubeConfig): boolean {
  logger.debug(`validating kube config: ${JSON.stringify(config)}`)
  if((config?.users.length || 0) == 0) {
    throw new Error("No users provided in config")
  }

  if((config?.clusters.length || 0) == 0) {
    throw new Error("No clusters provided in config")
  }

  if((config?.contexts.length || 0) == 0) {
    throw new Error("No contexts provided in config")
  }

  return true
}


/**
 * Breaks kube config into several configs. Each context as it own KubeConfig object
 *
 * @param configString yaml string of kube config
 */
export function splitConfig(kubeConfig: k8s.KubeConfig): k8s.KubeConfig[] {
  return (kubeConfig.contexts || []).map(ctx => {
    const kc = new k8s.KubeConfig();
    kc.clusters = [kubeConfig.getCluster(ctx.cluster)].filter(n => n);
    kc.users = [kubeConfig.getUser(ctx.user)].filter(n => n)
    kc.contexts = [kubeConfig.getContextObject(ctx.name)].filter(n => n)
    kc.setCurrentContext(ctx.name);

    return kc;
  })
}

/**
 * Loads KubeConfig from a yaml and breaks it into several configs. Each context per KubeConfig object
 *
 * @param configPath path to kube config yaml file
 */
export function loadAndSplitConfig(configPath: string): k8s.KubeConfig[] {
  const allConfigs = new k8s.KubeConfig();
  allConfigs.loadFromFile(configPath);
  return splitConfig(allConfigs);
}

export function dumpConfigYaml(kc: k8s.KubeConfig): string {
  const config = {
    apiVersion: "v1",
    kind: "Config",
    preferences: {},
    'current-context': kc.currentContext,
    clusters: kc.clusters.map(({
      name, caData, caFile, server, skipTLSVerify
    }) => {
      return {
        name,
        cluster: {
          'certificate-authority-data': caData,
          'certificate-authority': caFile,
          'insecure-skip-tls-verify': skipTLSVerify,
          server
        }
      }
    }),
    contexts: kc.contexts.map(({
      name, cluster, user, namespace
    }) => {
      return {
        name: name,
        context: { cluster, user, namespace }
      }
    }),
    users: kc.users.map(({
      name, certData, certFile, keyData, keyFile, authProvider, exec, token, username, password
    }) => {
      return {
        name,
        user: {
          'client-certificate-data': certData,
          'client-certificate': certFile,
          'client-key-data': keyData,
          'client-key': keyFile,
          'auth-provider': authProvider,
          exec, token, username, password
        }
      }
    })
  }

  console.log("dumping kc:", config);

  // skipInvalid: true makes dump ignore undefined values
  return yaml.safeDump(config, {skipInvalid: true});
}

export function podHasIssues(pod: k8s.V1Pod) {
  // Logic adapted from dashboard
  const notReady = !!pod.status.conditions.find(condition => {
    return condition.type == "Ready" && condition.status !== "True"
  });

  return (
    notReady ||
    pod.status.phase !== "Running" ||
    pod.spec.priority > 500000 // We're interested in high prio pods events regardless of their running status
  )
}

// Logic adapted from dashboard
// see: https://github.com/kontena/kontena-k8s-dashboard/blob/7d8f9cb678cc817a22dd1886c5e79415b212b9bf/client/api/endpoints/nodes.api.ts#L147
export function getNodeWarningConditions(node: k8s.V1Node) {
  return node.status.conditions.filter(c =>
    c.status.toLowerCase() === "true" && c.type !== "Ready" && c.type !== "HostUpgrades"
  )
}

import * as util from "util"
import { exec as syncExec } from "child_process";

export const exec = util.promisify(syncExec)

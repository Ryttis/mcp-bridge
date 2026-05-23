/**
 * Universal Agent — IO Layer (v1)
 *
 * Local project IO.
 * Project files are read from the bridge process filesystem. Server RPC
 * filesystem tools are reserved for explicit remote-server operations.
 */

import fs from "fs";
import path from "path";

/**
 * Read a project file using the local bridge filesystem.
 * @param {object} context
 * @param {string} filePath
 */
export async function readFileViaIO(context, filePath) {
    const absPath = path.resolve(context.options.rootPath, filePath);

    return await fs.promises.readFile(absPath, "utf8");
}

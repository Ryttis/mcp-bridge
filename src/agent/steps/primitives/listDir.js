import { listDir as fsListDir } from "../../../utils/fs/listDir.js";

export async function listDir(ctx, params = {}) {
    const { path = ".", ...opts } = params;
    const entries = await fsListDir(path, opts);
    return { entries };
}

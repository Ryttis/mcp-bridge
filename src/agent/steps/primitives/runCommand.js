import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function runCommand(ctx, params = {}) {
    const { command, cwd } = params;

    const { stdout, stderr } = await execAsync(command, { cwd });

    return {
        stdout,
        stderr
    };
}

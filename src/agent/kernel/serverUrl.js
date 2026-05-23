export { getServerUrl } from "./targetMode.js";

import { getServerUrl } from "./targetMode.js";

export function getServerUrlWithToken({
    serverUrl = getServerUrl(),
    token = process.env.AUTH_TOKEN
} = {}) {
    if (!token) return serverUrl;

    const parsed = new URL(serverUrl);
    parsed.searchParams.set("token", token);
    return parsed.toString();
}

export default {
    getServerUrl,
    getServerUrlWithToken
};

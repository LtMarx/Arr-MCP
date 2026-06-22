export class ArrClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async request(path, options = {}) {
        const url = `${this.config.baseUrl}/api/v3${path}`;
        const res = await fetch(url, {
            ...options,
            headers: {
                "X-Api-Key": this.config.apiKey,
                "Content-Type": "application/json",
                ...options.headers,
            },
        });
        if (!res.ok) {
            const text = await res.text().catch(() => res.statusText);
            throw new Error(`${res.status} ${res.statusText}: ${text}`);
        }
        return res.json();
    }
    get(path) {
        return this.request(path);
    }
    post(path, body) {
        return this.request(path, { method: "POST", body: JSON.stringify(body) });
    }
    put(path, body) {
        return this.request(path, { method: "PUT", body: JSON.stringify(body) });
    }
    delete(path) {
        return this.request(path, { method: "DELETE" });
    }
}

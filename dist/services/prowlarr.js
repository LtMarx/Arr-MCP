export class ProwlarrService {
    client;
    constructor(client) {
        this.client = client;
    }
    async getIndexers() {
        return this.client.get("/indexer");
    }
    async search(query, categories) {
        const params = new URLSearchParams({ query });
        if (categories?.length)
            params.set("categories", categories.join(","));
        return this.client.get(`/search?${params}`);
    }
    async getIndexerStats() {
        return this.client.get("/indexerstats");
    }
    async getSystemStatus() {
        return this.client.get("/system/status");
    }
    async getHealth() {
        return this.client.get("/health");
    }
}

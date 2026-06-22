export class SonarrService {
    client;
    constructor(client) {
        this.client = client;
    }
    async getSeries() {
        return this.client.get("/series");
    }
    async getSeriesById(id) {
        return this.client.get(`/series/${id}`);
    }
    async searchSeries(term) {
        return this.client.get(`/series/lookup?term=${encodeURIComponent(term)}`);
    }
    async addSeries(tvdbId, qualityProfileId, rootFolderPath, monitored = true, searchForMissingEpisodes = true) {
        const results = await this.client.get(`/series/lookup?term=tvdb:${tvdbId}`);
        const series = results[0];
        if (!series)
            throw new Error(`No series found with tvdbId ${tvdbId}`);
        return this.client.post("/series", {
            ...series,
            qualityProfileId,
            rootFolderPath,
            monitored,
            seasons: series.seasons ?? [],
            addOptions: { searchForMissingEpisodes },
        });
    }
    async deleteSeries(id, deleteFiles = false) {
        await this.client.delete(`/series/${id}?deleteFiles=${deleteFiles}`);
    }
    async getEpisodes(seriesId) {
        return this.client.get(`/episode?seriesId=${seriesId}`);
    }
    async getQueue() {
        return this.client.get("/queue?pageSize=100");
    }
    async getSystemStatus() {
        return this.client.get("/system/status");
    }
    async getHealth() {
        return this.client.get("/health");
    }
    async getQualityProfiles() {
        return this.client.get("/qualityprofile");
    }
    async getRootFolders() {
        return this.client.get("/rootfolder");
    }
}

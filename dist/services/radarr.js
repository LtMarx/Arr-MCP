export class RadarrService {
    client;
    constructor(client) {
        this.client = client;
    }
    async getMovies() {
        return this.client.get("/movie");
    }
    async getMovie(id) {
        return this.client.get(`/movie/${id}`);
    }
    async searchMovies(term) {
        return this.client.get(`/movie/lookup?term=${encodeURIComponent(term)}`);
    }
    async addMovie(tmdbId, qualityProfileId, rootFolderPath, monitored = true, searchForMovie = true) {
        const results = await this.client.get(`/movie/lookup/tmdb?tmdbId=${tmdbId}`);
        const movie = results[0];
        if (!movie)
            throw new Error(`No movie found with tmdbId ${tmdbId}`);
        return this.client.post("/movie", {
            ...movie,
            qualityProfileId,
            rootFolderPath,
            monitored,
            addOptions: { searchForMovie },
        });
    }
    async deleteMovie(id, deleteFiles = false) {
        await this.client.delete(`/movie/${id}?deleteFiles=${deleteFiles}`);
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

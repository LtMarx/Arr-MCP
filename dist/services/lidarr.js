export class LidarrService {
    client;
    constructor(client) {
        this.client = client;
    }
    async getArtists() {
        return this.client.get("/artist");
    }
    async searchArtists(term) {
        return this.client.get(`/artist/lookup?term=${encodeURIComponent(term)}`);
    }
    async addArtist(foreignArtistId, qualityProfileId, rootFolderPath, monitored = true, searchForMissingAlbums = true) {
        const results = await this.client.get(`/artist/lookup?term=lidarr:${foreignArtistId}`);
        const artist = results[0];
        if (!artist)
            throw new Error(`No artist found with id ${foreignArtistId}`);
        return this.client.post("/artist", {
            ...artist,
            qualityProfileId,
            rootFolderPath,
            monitored,
            addOptions: { searchForMissingAlbums },
        });
    }
    async getAlbums(artistId) {
        const query = artistId ? `?artistId=${artistId}` : "";
        return this.client.get(`/album${query}`);
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

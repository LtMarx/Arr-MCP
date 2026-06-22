export class ReadarrService {
    client;
    constructor(client) {
        this.client = client;
    }
    async getAuthors() {
        return this.client.get("/author");
    }
    async searchAuthors(term) {
        return this.client.get(`/author/lookup?term=${encodeURIComponent(term)}`);
    }
    async addAuthor(foreignAuthorId, qualityProfileId, rootFolderPath, monitored = true, searchForMissingBooks = true) {
        const results = await this.client.get(`/author/lookup?term=readarr:${foreignAuthorId}`);
        const author = results[0];
        if (!author)
            throw new Error(`No author found with id ${foreignAuthorId}`);
        return this.client.post("/author", {
            ...author,
            qualityProfileId,
            rootFolderPath,
            monitored,
            addOptions: { searchForMissingBooks },
        });
    }
    async getBooks(authorId) {
        const query = authorId ? `?authorId=${authorId}` : "";
        return this.client.get(`/book${query}`);
    }
    async searchBooks(term) {
        return this.client.get(`/book/lookup?term=${encodeURIComponent(term)}`);
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

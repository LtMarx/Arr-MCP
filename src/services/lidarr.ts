import { ArrClient } from "../arr-client.js";

export interface Artist {
  id: number;
  artistName: string;
  status: string;
  overview?: string;
  foreignArtistId?: string;
  monitored: boolean;
  qualityProfileId: number;
  rootFolderPath?: string;
  genres?: string[];
  albumCount?: number;
}

export interface Album {
  id: number;
  title: string;
  artistId: number;
  artistName?: string;
  releaseDate?: string;
  overview?: string;
  foreignAlbumId?: string;
  monitored: boolean;
  grabbed?: boolean;
}

export class LidarrService {
  constructor(private client: ArrClient) {}

  async getArtists(offset = 0, limit = 0): Promise<Artist[]> {
    const all = await this.client.get<Artist[]>("/artist");
    if (limit > 0) return all.slice(offset, offset + limit);
    return offset > 0 ? all.slice(offset) : all;
  }

  async searchArtists(term: string): Promise<Artist[]> {
    return this.client.get<Artist[]>(`/artist/lookup?term=${encodeURIComponent(term)}`);
  }

  async addArtist(
    foreignArtistId: string,
    qualityProfileId: number,
    rootFolderPath: string,
    monitored = true,
    searchForMissingAlbums = true
  ): Promise<Artist> {
    const results = await this.client.get<Artist[]>(`/artist/lookup?term=lidarr:${foreignArtistId}`);
    const artist = results[0];
    if (!artist) throw new Error(`No artist found with id ${foreignArtistId}`);
    return this.client.post<Artist>("/artist", {
      ...artist,
      qualityProfileId,
      rootFolderPath,
      monitored,
      addOptions: { searchForMissingAlbums },
    });
  }

  async getAlbums(artistId?: number, offset = 0, limit = 0): Promise<Album[]> {
    const query = artistId ? `?artistId=${artistId}` : "";
    const all = await this.client.get<Album[]>(`/album${query}`);
    if (limit > 0) return all.slice(offset, offset + limit);
    return offset > 0 ? all.slice(offset) : all;
  }

  async searchMissingAlbums(artistId: number): Promise<void> {
    await this.client.post("/command", { name: "MissingAlbumSearch", artistId });
  }

  async getCalendar(start?: string, end?: string): Promise<Album[]> {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return this.client.get<Album[]>(`/calendar?${params}`);
  }

  async getSystemStatus(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>("/system/status");
  }

  async getHealth(): Promise<Array<{ source: string; type: string; message: string }>> {
    return this.client.get("/health");
  }

  async getQualityProfiles(): Promise<Array<{ id: number; name: string }>> {
    return this.client.get("/qualityprofile");
  }

  async getMetadataProfiles(): Promise<Array<{ id: number; name: string }>> {
    return this.client.get("/metadataprofile");
  }

  async getRootFolders(): Promise<Array<{ id: number; path: string; freeSpace: number }>> {
    return this.client.get("/rootfolder");
  }

  async getDownloadClients(): Promise<Array<Record<string, unknown>>> {
    return this.client.get("/downloadclient");
  }

  async getTags(): Promise<Array<{ id: number; label: string }>> {
    return this.client.get("/tag");
  }
}

import { ArrClient } from "../arr-client.js";

export interface Series {
  id: number;
  title: string;
  year: number;
  status: string;
  overview: string;
  imdbId?: string;
  tvdbId?: number;
  monitored: boolean;
  qualityProfileId: number;
  rootFolderPath?: string;
  seasonCount: number;
  episodeCount?: number;
  episodeFileCount?: number;
  sizeOnDisk?: number;
  network?: string;
  airTime?: string;
  genres?: string[];
}

export interface SeriesSearchResult {
  title: string;
  year: number;
  overview: string;
  imdbId?: string;
  tvdbId?: number;
  remotePoster?: string;
  network?: string;
  genres?: string[];
}

export interface Episode {
  id: number;
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate?: string;
  hasFile: boolean;
  monitored: boolean;
  overview?: string;
}

export class SonarrService {
  private client: ArrClient;

  constructor(client: ArrClient) {
    this.client = client;
  }

  async getSeries(): Promise<Series[]> {
    return this.client.get<Series[]>("/series");
  }

  async getSeriesById(id: number): Promise<Series> {
    return this.client.get<Series>(`/series/${id}`);
  }

  async searchSeries(term: string): Promise<SeriesSearchResult[]> {
    return this.client.get<SeriesSearchResult[]>(`/series/lookup?term=${encodeURIComponent(term)}`);
  }

  async addSeries(
    tvdbId: number,
    qualityProfileId: number,
    rootFolderPath: string,
    monitored = true,
    searchForMissingEpisodes = true
  ): Promise<Series> {
    const results = await this.client.get<(SeriesSearchResult & { tvdbId: number })[]>(
      `/series/lookup?term=tvdb:${tvdbId}`
    );
    const series = results[0] as Series & SeriesSearchResult;
    if (!series) throw new Error(`No series found with tvdbId ${tvdbId}`);
    return this.client.post<Series>("/series", {
      ...series,
      qualityProfileId,
      rootFolderPath,
      monitored,
      seasons: (series as { seasons?: unknown[] }).seasons ?? [],
      addOptions: { searchForMissingEpisodes },
    });
  }

  async deleteSeries(id: number, deleteFiles = false): Promise<void> {
    await this.client.delete(`/series/${id}?deleteFiles=${deleteFiles}`);
  }

  async getEpisodes(seriesId: number): Promise<Episode[]> {
    return this.client.get<Episode[]>(`/episode?seriesId=${seriesId}`);
  }

  async getQueue(): Promise<{ records: Array<Record<string, unknown>> }> {
    return this.client.get("/queue?pageSize=100");
  }

  async getSystemStatus(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>("/system/status");
  }

  async getHealth(): Promise<Array<{ source: string; type: string; message: string; wikiUrl?: string }>> {
    return this.client.get("/health");
  }

  async getQualityProfiles(): Promise<Array<{ id: number; name: string }>> {
    return this.client.get("/qualityprofile");
  }

  async getRootFolders(): Promise<Array<{ id: number; path: string; freeSpace: number }>> {
    return this.client.get("/rootfolder");
  }
}

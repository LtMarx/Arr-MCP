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
  seasons?: unknown[];
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
  seasons?: unknown[];
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
  constructor(private client: ArrClient) {}

  async getSeries(offset = 0, limit = 0): Promise<Series[]> {
    const all = await this.client.get<Series[]>("/series");
    if (limit > 0) return all.slice(offset, offset + limit);
    return offset > 0 ? all.slice(offset) : all;
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
    const results = await this.client.get<SeriesSearchResult[]>(`/series/lookup?term=tvdb:${tvdbId}`);
    const series = results[0] as Series & SeriesSearchResult;
    if (!series) throw new Error(`No series found with tvdbId ${tvdbId}`);
    return this.client.post<Series>("/series", {
      ...series,
      qualityProfileId,
      rootFolderPath,
      monitored,
      seasons: series.seasons ?? [],
      addOptions: { searchForMissingEpisodes },
    });
  }

  async deleteSeries(id: number, deleteFiles = false): Promise<void> {
    await this.client.delete(`/series/${id}?deleteFiles=${deleteFiles}`);
  }

  async refreshSeries(seriesId: number): Promise<void> {
    await this.client.post("/command", { name: "RefreshSeries", seriesId });
  }

  async getEpisodes(seriesId: number, seasonNumber?: number): Promise<Episode[]> {
    const params = new URLSearchParams({ seriesId: String(seriesId) });
    if (seasonNumber !== undefined) params.set("seasonNumber", String(seasonNumber));
    return this.client.get<Episode[]>(`/episode?${params}`);
  }

  async searchMissingEpisodes(seriesId: number): Promise<void> {
    await this.client.post("/command", { name: "MissingEpisodeSearch", seriesId });
  }

  async searchEpisode(episodeId: number): Promise<void> {
    await this.client.post("/command", { name: "EpisodeSearch", episodeIds: [episodeId] });
  }

  async getQueue(offset = 0, limit = 25): Promise<{ records: Array<Record<string, unknown>>; totalRecords: number }> {
    const res = await this.client.get<{ records: Array<Record<string, unknown>>; totalRecords: number }>(
      "/queue?pageSize=100&page=1"
    );
    const records = res.records.slice(offset, offset + limit);
    return { records, totalRecords: res.totalRecords };
  }

  async deleteQueueItem(id: number, blacklist = false): Promise<void> {
    await this.client.delete(`/queue/${id}?blacklist=${blacklist}`);
  }

  async getCalendar(start?: string, end?: string): Promise<Episode[]> {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return this.client.get<Episode[]>(`/calendar?${params}`);
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

  async getDownloadClients(): Promise<Array<Record<string, unknown>>> {
    return this.client.get("/downloadclient");
  }

  async getTags(): Promise<Array<{ id: number; label: string }>> {
    return this.client.get("/tag");
  }

  async getNaming(): Promise<Record<string, unknown>> {
    return this.client.get("/config/naming");
  }

  async getReleases(episodeId: number): Promise<Array<Record<string, unknown>>> {
    return this.client.get(`/release?episodeId=${episodeId}`);
  }

  async grabRelease(guid: string, indexerId: number): Promise<Record<string, unknown>> {
    return this.client.post("/release", { guid, indexerId });
  }

  async getHistory(offset = 0, limit = 25, eventType?: string): Promise<{ records: Array<Record<string, unknown>>; totalRecords: number }> {
    const params = new URLSearchParams({ page: "1", pageSize: "100", sortKey: "date", sortDirection: "descending" });
    if (eventType) params.set("eventType", eventType);
    const res = await this.client.get<{ records: Array<Record<string, unknown>>; totalRecords: number }>(`/history?${params}`);
    return { records: res.records.slice(offset, offset + limit), totalRecords: res.totalRecords };
  }

  async getBlocklist(offset = 0, limit = 25): Promise<{ records: Array<Record<string, unknown>>; totalRecords: number }> {
    const res = await this.client.get<{ records: Array<Record<string, unknown>>; totalRecords: number }>("/blocklist?pageSize=100&page=1");
    return { records: res.records.slice(offset, offset + limit), totalRecords: res.totalRecords };
  }

  async deleteBlocklistItem(id: number): Promise<void> {
    await this.client.delete(`/blocklist/${id}`);
  }

  async getWantedMissing(offset = 0, limit = 25): Promise<{ records: Array<Record<string, unknown>>; totalRecords: number }> {
    const res = await this.client.get<{ records: Array<Record<string, unknown>>; totalRecords: number }>(`/wanted/missing?pageSize=100&page=1&sortKey=airDateUtc&sortDirection=descending`);
    return { records: res.records.slice(offset, offset + limit), totalRecords: res.totalRecords };
  }

  async getWantedCutoffUnmet(offset = 0, limit = 25): Promise<{ records: Array<Record<string, unknown>>; totalRecords: number }> {
    const res = await this.client.get<{ records: Array<Record<string, unknown>>; totalRecords: number }>(`/wanted/cutoff?pageSize=100&page=1`);
    return { records: res.records.slice(offset, offset + limit), totalRecords: res.totalRecords };
  }

  async getDiskspace(): Promise<Array<Record<string, unknown>>> {
    return this.client.get("/diskspace");
  }

  async getCommandStatus(commandId: number): Promise<Record<string, unknown>> {
    return this.client.get(`/command/${commandId}`);
  }

  async bulkEditSeries(seriesIds: number[], changes: { monitored?: boolean; qualityProfileId?: number; tags?: number[]; applyTags?: "add" | "remove" | "replace" }): Promise<Array<Record<string, unknown>>> {
    return this.client.put("/series/editor", { seriesIds, ...changes });
  }
}

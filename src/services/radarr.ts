import { ArrClient } from "../arr-client.js";

export interface Movie {
  id: number;
  title: string;
  year: number;
  status: string;
  overview: string;
  imdbId?: string;
  tmdbId?: number;
  hasFile: boolean;
  monitored: boolean;
  qualityProfileId: number;
  rootFolderPath?: string;
  added?: string;
  sizeOnDisk?: number;
}

export interface MovieSearchResult {
  title: string;
  year: number;
  overview: string;
  imdbId?: string;
  tmdbId?: number;
  remotePoster?: string;
}

export interface QueueItem {
  id: number;
  title: string;
  status: string;
  timeleft?: string;
  size: number;
  sizeleft: number;
  protocol: string;
  indexer?: string;
  downloadId?: string;
  errorMessage?: string;
}

export class RadarrService {
  constructor(private client: ArrClient) {}

  async getMovies(offset = 0, limit = 0): Promise<Movie[]> {
    const all = await this.client.get<Movie[]>("/movie");
    if (limit > 0) return all.slice(offset, offset + limit);
    return offset > 0 ? all.slice(offset) : all;
  }

  async getMovie(id: number): Promise<Movie> {
    return this.client.get<Movie>(`/movie/${id}`);
  }

  async searchMovies(term: string): Promise<MovieSearchResult[]> {
    return this.client.get<MovieSearchResult[]>(`/movie/lookup?term=${encodeURIComponent(term)}`);
  }

  async addMovie(
    tmdbId: number,
    qualityProfileId: number,
    rootFolderPath: string,
    monitored = true,
    searchForMovie = true
  ): Promise<Movie> {
    const results = await this.client.get<MovieSearchResult[]>(`/movie/lookup/tmdb?tmdbId=${tmdbId}`);
    const movie = results[0] as Movie & MovieSearchResult;
    if (!movie) throw new Error(`No movie found with tmdbId ${tmdbId}`);
    return this.client.post<Movie>("/movie", {
      ...movie,
      qualityProfileId,
      rootFolderPath,
      monitored,
      addOptions: { searchForMovie },
    });
  }

  async updateMovie(id: number, changes: Partial<Movie>): Promise<Movie> {
    const movie = await this.getMovie(id);
    return this.client.put<Movie>(`/movie/${id}`, { ...movie, ...changes });
  }

  async deleteMovie(id: number, deleteFiles = false): Promise<void> {
    await this.client.delete(`/movie/${id}?deleteFiles=${deleteFiles}`);
  }

  async triggerMovieSearch(movieId: number): Promise<void> {
    await this.client.post("/command", { name: "MoviesSearch", movieIds: [movieId] });
  }

  async refreshMovie(movieId: number): Promise<void> {
    await this.client.post("/command", { name: "RefreshMovie", movieId });
  }

  async getQueue(offset = 0, limit = 25): Promise<{ records: QueueItem[]; totalRecords: number }> {
    const res = await this.client.get<{ records: QueueItem[]; totalRecords: number }>(
      `/queue?pageSize=100&page=1`
    );
    const records = res.records.slice(offset, offset + limit);
    return { records, totalRecords: res.totalRecords };
  }

  async deleteQueueItem(id: number, blacklist = false): Promise<void> {
    await this.client.delete(`/queue/${id}?blacklist=${blacklist}`);
  }

  async getCalendar(start?: string, end?: string): Promise<Movie[]> {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return this.client.get<Movie[]>(`/calendar?${params}`);
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
}

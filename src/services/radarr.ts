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
  private client: ArrClient;

  constructor(client: ArrClient) {
    this.client = client;
  }

  async getMovies(): Promise<Movie[]> {
    return this.client.get<Movie[]>("/movie");
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

  async deleteMovie(id: number, deleteFiles = false): Promise<void> {
    await this.client.delete(`/movie/${id}?deleteFiles=${deleteFiles}`);
  }

  async getQueue(): Promise<{ records: QueueItem[] }> {
    return this.client.get<{ records: QueueItem[] }>("/queue?pageSize=100");
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

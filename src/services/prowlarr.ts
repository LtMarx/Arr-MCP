import { ArrClient } from "../arr-client.js";

export interface Indexer {
  id: number;
  name: string;
  enable: boolean;
  protocol: string;
  privacy: string;
  status?: string;
  added?: string;
}

export interface SearchResult {
  guid: string;
  title: string;
  size: number;
  indexer: string;
  indexerId: number;
  publishDate?: string;
  protocol: string;
  seeders?: number;
  leechers?: number;
  infoUrl?: string;
  imdbId?: number;
  tmdbId?: number;
  tvdbId?: number;
}

export class ProwlarrService {
  private client: ArrClient;

  constructor(client: ArrClient) {
    this.client = client;
  }

  async getIndexers(): Promise<Indexer[]> {
    return this.client.get<Indexer[]>("/indexer");
  }

  async search(query: string, categories?: number[]): Promise<SearchResult[]> {
    const params = new URLSearchParams({ query });
    if (categories?.length) params.set("categories", categories.join(","));
    return this.client.get<SearchResult[]>(`/search?${params}`);
  }

  async getIndexerStats(): Promise<Record<string, unknown>> {
    return this.client.get("/indexerstats");
  }

  async getSystemStatus(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>("/system/status");
  }

  async getHealth(): Promise<Array<{ source: string; type: string; message: string }>> {
    return this.client.get("/health");
  }
}

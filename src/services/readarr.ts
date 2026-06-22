import { ArrClient } from "../arr-client.js";

export interface Author {
  id: number;
  authorName: string;
  status: string;
  overview?: string;
  foreignAuthorId?: string;
  monitored: boolean;
  qualityProfileId: number;
  rootFolderPath?: string;
  bookCount?: number;
}

export interface Book {
  id: number;
  title: string;
  authorId: number;
  authorName?: string;
  releaseDate?: string;
  overview?: string;
  foreignBookId?: string;
  monitored: boolean;
  grabbed?: boolean;
  ratings?: { value: number; count: number };
}

export class ReadarrService {
  private client: ArrClient;

  constructor(client: ArrClient) {
    this.client = client;
  }

  async getAuthors(): Promise<Author[]> {
    return this.client.get<Author[]>("/author");
  }

  async searchAuthors(term: string): Promise<Author[]> {
    return this.client.get<Author[]>(`/author/lookup?term=${encodeURIComponent(term)}`);
  }

  async addAuthor(
    foreignAuthorId: string,
    qualityProfileId: number,
    rootFolderPath: string,
    monitored = true,
    searchForMissingBooks = true
  ): Promise<Author> {
    const results = await this.client.get<Author[]>(`/author/lookup?term=readarr:${foreignAuthorId}`);
    const author = results[0];
    if (!author) throw new Error(`No author found with id ${foreignAuthorId}`);
    return this.client.post<Author>("/author", {
      ...author,
      qualityProfileId,
      rootFolderPath,
      monitored,
      addOptions: { searchForMissingBooks },
    });
  }

  async getBooks(authorId?: number): Promise<Book[]> {
    const query = authorId ? `?authorId=${authorId}` : "";
    return this.client.get<Book[]>(`/book${query}`);
  }

  async searchBooks(term: string): Promise<Book[]> {
    return this.client.get<Book[]>(`/book/lookup?term=${encodeURIComponent(term)}`);
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

  async getRootFolders(): Promise<Array<{ id: number; path: string; freeSpace: number }>> {
    return this.client.get("/rootfolder");
  }
}

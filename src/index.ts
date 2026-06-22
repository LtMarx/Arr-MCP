import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ArrClient } from "./arr-client.js";
import { RadarrService } from "./services/radarr.js";
import { SonarrService } from "./services/sonarr.js";
import { LidarrService } from "./services/lidarr.js";
import { ReadarrService } from "./services/readarr.js";
import { ProwlarrService } from "./services/prowlarr.js";

function getEnv(key: string): string | undefined {
  return process.env[key];
}

function makeClient(baseUrlKey: string, apiKeyKey: string): ArrClient | null {
  const baseUrl = getEnv(baseUrlKey);
  const apiKey = getEnv(apiKeyKey);
  if (!baseUrl || !apiKey) return null;
  return new ArrClient({ baseUrl: baseUrl.replace(/\/$/, ""), apiKey });
}

const radarrClient = makeClient("RADARR_URL", "RADARR_API_KEY");
const sonarrClient = makeClient("SONARR_URL", "SONARR_API_KEY");
const lidarrClient = makeClient("LIDARR_URL", "LIDARR_API_KEY");
const readarrClient = makeClient("READARR_URL", "READARR_API_KEY");
const prowlarrClient = makeClient("PROWLARR_URL", "PROWLARR_API_KEY");

const radarr = radarrClient ? new RadarrService(radarrClient) : null;
const sonarr = sonarrClient ? new SonarrService(sonarrClient) : null;
const lidarr = lidarrClient ? new LidarrService(lidarrClient) : null;
const readarr = readarrClient ? new ReadarrService(readarrClient) : null;
const prowlarr = prowlarrClient ? new ProwlarrService(prowlarrClient) : null;

const server = new McpServer({
  name: "arr-mcp",
  version: "1.0.0",
});

function requireService<T>(service: T | null, name: string): T {
  if (!service) throw new Error(`${name} is not configured. Set ${name.toUpperCase()}_URL and ${name.toUpperCase()}_API_KEY environment variables.`);
  return service;
}

function ok(data: unknown): { content: [{ type: "text"; text: string }] } {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// ─── RADARR ────────────────────────────────────────────────────────────────

server.tool("radarr_get_movies", "List all movies in Radarr", {}, async () => {
  const movies = await requireService(radarr, "Radarr").getMovies();
  return ok(movies.map((m) => ({
    id: m.id,
    title: m.title,
    year: m.year,
    status: m.status,
    hasFile: m.hasFile,
    monitored: m.monitored,
    tmdbId: m.tmdbId,
    imdbId: m.imdbId,
    sizeOnDisk: m.sizeOnDisk,
  })));
});

server.tool(
  "radarr_search_movies",
  "Search for movies to add to Radarr",
  { term: z.string().describe("Search term (movie title)") },
  async ({ term }) => {
    const results = await requireService(radarr, "Radarr").searchMovies(term);
    return ok(results);
  }
);

server.tool(
  "radarr_add_movie",
  "Add a movie to Radarr by TMDB ID",
  {
    tmdbId: z.number().describe("TMDB ID of the movie"),
    qualityProfileId: z.number().describe("Quality profile ID"),
    rootFolderPath: z.string().describe("Root folder path for movie storage"),
    monitored: z.boolean().optional().default(true).describe("Whether to monitor the movie"),
    searchForMovie: z.boolean().optional().default(true).describe("Trigger search after adding"),
  },
  async ({ tmdbId, qualityProfileId, rootFolderPath, monitored, searchForMovie }) => {
    const result = await requireService(radarr, "Radarr").addMovie(tmdbId, qualityProfileId, rootFolderPath, monitored, searchForMovie);
    return ok(result);
  }
);

server.tool(
  "radarr_delete_movie",
  "Delete a movie from Radarr",
  {
    id: z.number().describe("Radarr movie ID"),
    deleteFiles: z.boolean().optional().default(false).describe("Also delete files from disk"),
  },
  async ({ id, deleteFiles }) => {
    await requireService(radarr, "Radarr").deleteMovie(id, deleteFiles);
    return ok({ success: true, message: `Movie ${id} deleted` });
  }
);

server.tool("radarr_get_queue", "Get Radarr download queue", {}, async () => {
  const queue = await requireService(radarr, "Radarr").getQueue();
  return ok(queue);
});

server.tool("radarr_get_health", "Get Radarr health status", {}, async () => {
  const health = await requireService(radarr, "Radarr").getHealth();
  return ok(health);
});

server.tool("radarr_get_quality_profiles", "Get available quality profiles in Radarr", {}, async () => {
  const profiles = await requireService(radarr, "Radarr").getQualityProfiles();
  return ok(profiles);
});

server.tool("radarr_get_root_folders", "Get configured root folders in Radarr", {}, async () => {
  const folders = await requireService(radarr, "Radarr").getRootFolders();
  return ok(folders);
});

server.tool("radarr_get_status", "Get Radarr system status", {}, async () => {
  const status = await requireService(radarr, "Radarr").getSystemStatus();
  return ok(status);
});

// ─── SONARR ────────────────────────────────────────────────────────────────

server.tool("sonarr_get_series", "List all series in Sonarr", {}, async () => {
  const series = await requireService(sonarr, "Sonarr").getSeries();
  return ok(series.map((s) => ({
    id: s.id,
    title: s.title,
    year: s.year,
    status: s.status,
    monitored: s.monitored,
    seasonCount: s.seasonCount,
    episodeCount: s.episodeCount,
    episodeFileCount: s.episodeFileCount,
    tvdbId: s.tvdbId,
    network: s.network,
    sizeOnDisk: s.sizeOnDisk,
  })));
});

server.tool(
  "sonarr_search_series",
  "Search for a TV series to add to Sonarr",
  { term: z.string().describe("Search term (series title)") },
  async ({ term }) => {
    const results = await requireService(sonarr, "Sonarr").searchSeries(term);
    return ok(results);
  }
);

server.tool(
  "sonarr_add_series",
  "Add a TV series to Sonarr by TVDB ID",
  {
    tvdbId: z.number().describe("TVDB ID of the series"),
    qualityProfileId: z.number().describe("Quality profile ID"),
    rootFolderPath: z.string().describe("Root folder path for series storage"),
    monitored: z.boolean().optional().default(true).describe("Whether to monitor the series"),
    searchForMissingEpisodes: z.boolean().optional().default(true).describe("Trigger search after adding"),
  },
  async ({ tvdbId, qualityProfileId, rootFolderPath, monitored, searchForMissingEpisodes }) => {
    const result = await requireService(sonarr, "Sonarr").addSeries(tvdbId, qualityProfileId, rootFolderPath, monitored, searchForMissingEpisodes);
    return ok(result);
  }
);

server.tool(
  "sonarr_delete_series",
  "Delete a series from Sonarr",
  {
    id: z.number().describe("Sonarr series ID"),
    deleteFiles: z.boolean().optional().default(false).describe("Also delete files from disk"),
  },
  async ({ id, deleteFiles }) => {
    await requireService(sonarr, "Sonarr").deleteSeries(id, deleteFiles);
    return ok({ success: true, message: `Series ${id} deleted` });
  }
);

server.tool(
  "sonarr_get_episodes",
  "Get episodes for a series",
  { seriesId: z.number().describe("Sonarr series ID") },
  async ({ seriesId }) => {
    const episodes = await requireService(sonarr, "Sonarr").getEpisodes(seriesId);
    return ok(episodes);
  }
);

server.tool("sonarr_get_queue", "Get Sonarr download queue", {}, async () => {
  const queue = await requireService(sonarr, "Sonarr").getQueue();
  return ok(queue);
});

server.tool("sonarr_get_health", "Get Sonarr health status", {}, async () => {
  const health = await requireService(sonarr, "Sonarr").getHealth();
  return ok(health);
});

server.tool("sonarr_get_quality_profiles", "Get available quality profiles in Sonarr", {}, async () => {
  const profiles = await requireService(sonarr, "Sonarr").getQualityProfiles();
  return ok(profiles);
});

server.tool("sonarr_get_root_folders", "Get configured root folders in Sonarr", {}, async () => {
  const folders = await requireService(sonarr, "Sonarr").getRootFolders();
  return ok(folders);
});

server.tool("sonarr_get_status", "Get Sonarr system status", {}, async () => {
  const status = await requireService(sonarr, "Sonarr").getSystemStatus();
  return ok(status);
});

// ─── LIDARR ────────────────────────────────────────────────────────────────

server.tool("lidarr_get_artists", "List all artists in Lidarr", {}, async () => {
  const artists = await requireService(lidarr, "Lidarr").getArtists();
  return ok(artists);
});

server.tool(
  "lidarr_search_artists",
  "Search for an artist to add to Lidarr",
  { term: z.string().describe("Artist name to search") },
  async ({ term }) => {
    const results = await requireService(lidarr, "Lidarr").searchArtists(term);
    return ok(results);
  }
);

server.tool(
  "lidarr_add_artist",
  "Add an artist to Lidarr by MusicBrainz ID",
  {
    foreignArtistId: z.string().describe("MusicBrainz artist ID"),
    qualityProfileId: z.number().describe("Quality profile ID"),
    rootFolderPath: z.string().describe("Root folder path for music storage"),
    monitored: z.boolean().optional().default(true),
    searchForMissingAlbums: z.boolean().optional().default(true),
  },
  async ({ foreignArtistId, qualityProfileId, rootFolderPath, monitored, searchForMissingAlbums }) => {
    const result = await requireService(lidarr, "Lidarr").addArtist(foreignArtistId, qualityProfileId, rootFolderPath, monitored, searchForMissingAlbums);
    return ok(result);
  }
);

server.tool(
  "lidarr_get_albums",
  "Get albums, optionally filtered by artist",
  { artistId: z.number().optional().describe("Filter by Lidarr artist ID") },
  async ({ artistId }) => {
    const albums = await requireService(lidarr, "Lidarr").getAlbums(artistId);
    return ok(albums);
  }
);

server.tool("lidarr_get_health", "Get Lidarr health status", {}, async () => {
  const health = await requireService(lidarr, "Lidarr").getHealth();
  return ok(health);
});

server.tool("lidarr_get_quality_profiles", "Get available quality profiles in Lidarr", {}, async () => {
  const profiles = await requireService(lidarr, "Lidarr").getQualityProfiles();
  return ok(profiles);
});

server.tool("lidarr_get_root_folders", "Get configured root folders in Lidarr", {}, async () => {
  const folders = await requireService(lidarr, "Lidarr").getRootFolders();
  return ok(folders);
});

server.tool("lidarr_get_status", "Get Lidarr system status", {}, async () => {
  const status = await requireService(lidarr, "Lidarr").getSystemStatus();
  return ok(status);
});

// ─── READARR ───────────────────────────────────────────────────────────────

server.tool("readarr_get_authors", "List all authors in Readarr", {}, async () => {
  const authors = await requireService(readarr, "Readarr").getAuthors();
  return ok(authors);
});

server.tool(
  "readarr_search_authors",
  "Search for an author to add to Readarr",
  { term: z.string().describe("Author name to search") },
  async ({ term }) => {
    const results = await requireService(readarr, "Readarr").searchAuthors(term);
    return ok(results);
  }
);

server.tool(
  "readarr_add_author",
  "Add an author to Readarr by Goodreads/foreign ID",
  {
    foreignAuthorId: z.string().describe("Foreign author ID (e.g. Goodreads ID)"),
    qualityProfileId: z.number().describe("Quality profile ID"),
    rootFolderPath: z.string().describe("Root folder path for books storage"),
    monitored: z.boolean().optional().default(true),
    searchForMissingBooks: z.boolean().optional().default(true),
  },
  async ({ foreignAuthorId, qualityProfileId, rootFolderPath, monitored, searchForMissingBooks }) => {
    const result = await requireService(readarr, "Readarr").addAuthor(foreignAuthorId, qualityProfileId, rootFolderPath, monitored, searchForMissingBooks);
    return ok(result);
  }
);

server.tool(
  "readarr_get_books",
  "Get books, optionally filtered by author",
  { authorId: z.number().optional().describe("Filter by Readarr author ID") },
  async ({ authorId }) => {
    const books = await requireService(readarr, "Readarr").getBooks(authorId);
    return ok(books);
  }
);

server.tool(
  "readarr_search_books",
  "Search for a book in Readarr",
  { term: z.string().describe("Book title or ISBN to search") },
  async ({ term }) => {
    const results = await requireService(readarr, "Readarr").searchBooks(term);
    return ok(results);
  }
);

server.tool("readarr_get_health", "Get Readarr health status", {}, async () => {
  const health = await requireService(readarr, "Readarr").getHealth();
  return ok(health);
});

server.tool("readarr_get_quality_profiles", "Get available quality profiles in Readarr", {}, async () => {
  const profiles = await requireService(readarr, "Readarr").getQualityProfiles();
  return ok(profiles);
});

server.tool("readarr_get_root_folders", "Get configured root folders in Readarr", {}, async () => {
  const folders = await requireService(readarr, "Readarr").getRootFolders();
  return ok(folders);
});

server.tool("readarr_get_status", "Get Readarr system status", {}, async () => {
  const status = await requireService(readarr, "Readarr").getSystemStatus();
  return ok(status);
});

// ─── PROWLARR ──────────────────────────────────────────────────────────────

server.tool("prowlarr_get_indexers", "List all configured indexers in Prowlarr", {}, async () => {
  const indexers = await requireService(prowlarr, "Prowlarr").getIndexers();
  return ok(indexers);
});

server.tool(
  "prowlarr_search",
  "Search across all Prowlarr indexers",
  {
    query: z.string().describe("Search query"),
    categories: z.array(z.number()).optional().describe("Newznab/Torznab category IDs to filter (e.g. [2000] for Movies, [5000] for TV)"),
  },
  async ({ query, categories }) => {
    const results = await requireService(prowlarr, "Prowlarr").search(query, categories);
    return ok(results);
  }
);

server.tool("prowlarr_get_indexer_stats", "Get Prowlarr indexer statistics", {}, async () => {
  const stats = await requireService(prowlarr, "Prowlarr").getIndexerStats();
  return ok(stats);
});

server.tool("prowlarr_get_health", "Get Prowlarr health status", {}, async () => {
  const health = await requireService(prowlarr, "Prowlarr").getHealth();
  return ok(health);
});

server.tool("prowlarr_get_status", "Get Prowlarr system status", {}, async () => {
  const status = await requireService(prowlarr, "Prowlarr").getSystemStatus();
  return ok(status);
});

// ─── START ─────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const configured = [
    radarr && "Radarr",
    sonarr && "Sonarr",
    lidarr && "Lidarr",
    readarr && "Readarr",
    prowlarr && "Prowlarr",
  ].filter(Boolean);
  process.stderr.write(`arr-mcp started. Configured services: ${configured.join(", ") || "none"}\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ArrClient } from "./arr-client.js";
import { RadarrService } from "./services/radarr.js";
import { SonarrService } from "./services/sonarr.js";
import { LidarrService } from "./services/lidarr.js";
import { ReadarrService } from "./services/readarr.js";
import { ProwlarrService } from "./services/prowlarr.js";

// ─── CONFIG ────────────────────────────────────────────────────────────────

function makeClient(urlKey: string, apiKeyKey: string): ArrClient | null {
  const baseUrl = process.env[urlKey];
  const apiKey = process.env[apiKeyKey];
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

// ─── SERVER ────────────────────────────────────────────────────────────────

const server = new McpServer({ name: "arr-mcp", version: "1.0.0" });

function ok(data: unknown): { content: [{ type: "text"; text: string }] } {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// ─── DISCOVERY ─────────────────────────────────────────────────────────────

server.tool(
  "arr_get_services",
  "List which *ARR services are configured and available",
  {},
  async () => {
    const services = [
      { name: "Radarr", configured: radarr !== null, url: process.env.RADARR_URL },
      { name: "Sonarr", configured: sonarr !== null, url: process.env.SONARR_URL },
      { name: "Lidarr", configured: lidarr !== null, url: process.env.LIDARR_URL },
      { name: "Readarr", configured: readarr !== null, url: process.env.READARR_URL },
      { name: "Prowlarr", configured: prowlarr !== null, url: process.env.PROWLARR_URL },
    ];
    return ok(services);
  }
);

// ─── RADARR ────────────────────────────────────────────────────────────────

if (radarr) {
  server.tool("radarr_get_movies", "List all movies in Radarr", {}, async () => {
    const movies = await radarr.getMovies();
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
    async ({ term }) => ok(await radarr.searchMovies(term))
  );

  server.tool(
    "radarr_add_movie",
    "Add a movie to Radarr by TMDB ID",
    {
      tmdbId: z.number().describe("TMDB ID of the movie"),
      qualityProfileId: z.number().describe("Quality profile ID (use radarr_get_quality_profiles)"),
      rootFolderPath: z.string().describe("Root folder path (use radarr_get_root_folders)"),
      monitored: z.boolean().optional().default(true),
      searchForMovie: z.boolean().optional().default(true).describe("Trigger search after adding"),
    },
    async ({ tmdbId, qualityProfileId, rootFolderPath, monitored, searchForMovie }) =>
      ok(await radarr.addMovie(tmdbId, qualityProfileId, rootFolderPath, monitored, searchForMovie))
  );

  server.tool(
    "radarr_delete_movie",
    "Delete a movie from Radarr",
    {
      id: z.number().describe("Radarr movie ID"),
      deleteFiles: z.boolean().optional().default(false).describe("Also delete files from disk"),
    },
    async ({ id, deleteFiles }) => {
      await radarr.deleteMovie(id, deleteFiles);
      return ok({ success: true, message: `Movie ${id} deleted` });
    }
  );

  server.tool("radarr_get_queue", "Get Radarr download queue", {}, async () =>
    ok(await radarr.getQueue())
  );

  server.tool("radarr_get_health", "Get Radarr health status", {}, async () =>
    ok(await radarr.getHealth())
  );

  server.tool("radarr_get_quality_profiles", "Get available quality profiles in Radarr", {}, async () =>
    ok(await radarr.getQualityProfiles())
  );

  server.tool("radarr_get_root_folders", "Get configured root folders in Radarr", {}, async () =>
    ok(await radarr.getRootFolders())
  );

  server.tool("radarr_get_status", "Get Radarr system status", {}, async () =>
    ok(await radarr.getSystemStatus())
  );
}

// ─── SONARR ────────────────────────────────────────────────────────────────

if (sonarr) {
  server.tool("sonarr_get_series", "List all series in Sonarr", {}, async () => {
    const series = await sonarr.getSeries();
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
    async ({ term }) => ok(await sonarr.searchSeries(term))
  );

  server.tool(
    "sonarr_add_series",
    "Add a TV series to Sonarr by TVDB ID",
    {
      tvdbId: z.number().describe("TVDB ID of the series"),
      qualityProfileId: z.number().describe("Quality profile ID (use sonarr_get_quality_profiles)"),
      rootFolderPath: z.string().describe("Root folder path (use sonarr_get_root_folders)"),
      monitored: z.boolean().optional().default(true),
      searchForMissingEpisodes: z.boolean().optional().default(true),
    },
    async ({ tvdbId, qualityProfileId, rootFolderPath, monitored, searchForMissingEpisodes }) =>
      ok(await sonarr.addSeries(tvdbId, qualityProfileId, rootFolderPath, monitored, searchForMissingEpisodes))
  );

  server.tool(
    "sonarr_delete_series",
    "Delete a series from Sonarr",
    {
      id: z.number().describe("Sonarr series ID"),
      deleteFiles: z.boolean().optional().default(false),
    },
    async ({ id, deleteFiles }) => {
      await sonarr.deleteSeries(id, deleteFiles);
      return ok({ success: true, message: `Series ${id} deleted` });
    }
  );

  server.tool(
    "sonarr_get_episodes",
    "Get episodes for a series in Sonarr",
    { seriesId: z.number().describe("Sonarr series ID") },
    async ({ seriesId }) => ok(await sonarr.getEpisodes(seriesId))
  );

  server.tool("sonarr_get_queue", "Get Sonarr download queue", {}, async () =>
    ok(await sonarr.getQueue())
  );

  server.tool("sonarr_get_health", "Get Sonarr health status", {}, async () =>
    ok(await sonarr.getHealth())
  );

  server.tool("sonarr_get_quality_profiles", "Get available quality profiles in Sonarr", {}, async () =>
    ok(await sonarr.getQualityProfiles())
  );

  server.tool("sonarr_get_root_folders", "Get configured root folders in Sonarr", {}, async () =>
    ok(await sonarr.getRootFolders())
  );

  server.tool("sonarr_get_status", "Get Sonarr system status", {}, async () =>
    ok(await sonarr.getSystemStatus())
  );
}

// ─── LIDARR ────────────────────────────────────────────────────────────────

if (lidarr) {
  server.tool("lidarr_get_artists", "List all artists in Lidarr", {}, async () =>
    ok(await lidarr.getArtists())
  );

  server.tool(
    "lidarr_search_artists",
    "Search for an artist to add to Lidarr",
    { term: z.string().describe("Artist name") },
    async ({ term }) => ok(await lidarr.searchArtists(term))
  );

  server.tool(
    "lidarr_add_artist",
    "Add an artist to Lidarr by MusicBrainz ID",
    {
      foreignArtistId: z.string().describe("MusicBrainz artist ID"),
      qualityProfileId: z.number().describe("Quality profile ID (use lidarr_get_quality_profiles)"),
      rootFolderPath: z.string().describe("Root folder path (use lidarr_get_root_folders)"),
      monitored: z.boolean().optional().default(true),
      searchForMissingAlbums: z.boolean().optional().default(true),
    },
    async ({ foreignArtistId, qualityProfileId, rootFolderPath, monitored, searchForMissingAlbums }) =>
      ok(await lidarr.addArtist(foreignArtistId, qualityProfileId, rootFolderPath, monitored, searchForMissingAlbums))
  );

  server.tool(
    "lidarr_get_albums",
    "Get albums in Lidarr, optionally filtered by artist",
    { artistId: z.number().optional().describe("Lidarr artist ID") },
    async ({ artistId }) => ok(await lidarr.getAlbums(artistId))
  );

  server.tool("lidarr_get_health", "Get Lidarr health status", {}, async () =>
    ok(await lidarr.getHealth())
  );

  server.tool("lidarr_get_quality_profiles", "Get available quality profiles in Lidarr", {}, async () =>
    ok(await lidarr.getQualityProfiles())
  );

  server.tool("lidarr_get_root_folders", "Get configured root folders in Lidarr", {}, async () =>
    ok(await lidarr.getRootFolders())
  );

  server.tool("lidarr_get_status", "Get Lidarr system status", {}, async () =>
    ok(await lidarr.getSystemStatus())
  );
}

// ─── READARR ───────────────────────────────────────────────────────────────

if (readarr) {
  server.tool("readarr_get_authors", "List all authors in Readarr", {}, async () =>
    ok(await readarr.getAuthors())
  );

  server.tool(
    "readarr_search_authors",
    "Search for an author to add to Readarr",
    { term: z.string().describe("Author name") },
    async ({ term }) => ok(await readarr.searchAuthors(term))
  );

  server.tool(
    "readarr_add_author",
    "Add an author to Readarr by foreign ID (Goodreads)",
    {
      foreignAuthorId: z.string().describe("Foreign author ID (e.g. Goodreads ID)"),
      qualityProfileId: z.number().describe("Quality profile ID (use readarr_get_quality_profiles)"),
      rootFolderPath: z.string().describe("Root folder path (use readarr_get_root_folders)"),
      monitored: z.boolean().optional().default(true),
      searchForMissingBooks: z.boolean().optional().default(true),
    },
    async ({ foreignAuthorId, qualityProfileId, rootFolderPath, monitored, searchForMissingBooks }) =>
      ok(await readarr.addAuthor(foreignAuthorId, qualityProfileId, rootFolderPath, monitored, searchForMissingBooks))
  );

  server.tool(
    "readarr_get_books",
    "Get books in Readarr, optionally filtered by author",
    { authorId: z.number().optional().describe("Readarr author ID") },
    async ({ authorId }) => ok(await readarr.getBooks(authorId))
  );

  server.tool(
    "readarr_search_books",
    "Search for a book in Readarr by title or ISBN",
    { term: z.string().describe("Book title or ISBN") },
    async ({ term }) => ok(await readarr.searchBooks(term))
  );

  server.tool("readarr_get_health", "Get Readarr health status", {}, async () =>
    ok(await readarr.getHealth())
  );

  server.tool("readarr_get_quality_profiles", "Get available quality profiles in Readarr", {}, async () =>
    ok(await readarr.getQualityProfiles())
  );

  server.tool("readarr_get_root_folders", "Get configured root folders in Readarr", {}, async () =>
    ok(await readarr.getRootFolders())
  );

  server.tool("readarr_get_status", "Get Readarr system status", {}, async () =>
    ok(await readarr.getSystemStatus())
  );
}

// ─── PROWLARR ──────────────────────────────────────────────────────────────

if (prowlarr) {
  server.tool("prowlarr_get_indexers", "List all configured indexers in Prowlarr", {}, async () =>
    ok(await prowlarr.getIndexers())
  );

  server.tool(
    "prowlarr_search",
    "Search across all Prowlarr indexers",
    {
      query: z.string().describe("Search query"),
      categories: z.array(z.number()).optional().describe("Newznab/Torznab category IDs (e.g. [2000] Movies, [5000] TV)"),
    },
    async ({ query, categories }) => ok(await prowlarr.search(query, categories))
  );

  server.tool("prowlarr_get_indexer_stats", "Get Prowlarr indexer statistics", {}, async () =>
    ok(await prowlarr.getIndexerStats())
  );

  server.tool("prowlarr_get_health", "Get Prowlarr health status", {}, async () =>
    ok(await prowlarr.getHealth())
  );

  server.tool("prowlarr_get_status", "Get Prowlarr system status", {}, async () =>
    ok(await prowlarr.getSystemStatus())
  );
}

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
  process.stderr.write(
    `arr-mcp started. Configured: ${configured.join(", ") || "none (set *_URL + *_API_KEY env vars)"}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});

import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
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

const transport = process.env.MCP_TRANSPORT ?? "stdio";
const httpPort = parseInt(process.env.MCP_PORT ?? "3000", 10);
const httpHost = process.env.MCP_HOST ?? "0.0.0.0";

// ─── HELPERS ───────────────────────────────────────────────────────────────

function ok(data: unknown): { content: [{ type: "text"; text: string }] } {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

const pagination = {
  offset: z.number().int().min(0).optional().default(0).describe("Number of items to skip"),
  limit: z.number().int().min(1).max(500).optional().default(100).describe("Maximum items to return"),
};

const dateRange = {
  start: z.string().optional().describe("ISO 8601 date (e.g. 2024-01-01)"),
  end: z.string().optional().describe("ISO 8601 date (e.g. 2024-01-31)"),
};

// ─── SERVER FACTORY ────────────────────────────────────────────────────────

function buildServer(): McpServer {
  const server = new McpServer({ name: "arr-mcp", version: "2.0.0" });

  // ── DISCOVERY ─────────────────────────────────────────────────────────

  server.tool(
    "arr_get_services",
    "List which *ARR services are configured and available",
    {},
    async () => ok([
      { name: "Radarr",   configured: radarr   !== null, url: process.env.RADARR_URL },
      { name: "Sonarr",   configured: sonarr   !== null, url: process.env.SONARR_URL },
      { name: "Lidarr",   configured: lidarr   !== null, url: process.env.LIDARR_URL },
      { name: "Readarr",  configured: readarr  !== null, url: process.env.READARR_URL },
      { name: "Prowlarr", configured: prowlarr !== null, url: process.env.PROWLARR_URL },
    ])
  );

  if (radarr || sonarr || lidarr || readarr) {
    server.tool(
      "arr_search_all",
      "Search for content across all configured *ARR services simultaneously",
      { term: z.string().describe("Search term") },
      async ({ term }) => {
        const results: Record<string, unknown> = {};
        await Promise.all([
          radarr  && radarr.searchMovies(term).then((r) => { results.radarr  = r; }).catch((e: Error) => { results.radarr  = { error: e.message }; }),
          sonarr  && sonarr.searchSeries(term).then((r) => { results.sonarr  = r; }).catch((e: Error) => { results.sonarr  = { error: e.message }; }),
          lidarr  && lidarr.searchArtists(term).then((r) => { results.lidarr  = r; }).catch((e: Error) => { results.lidarr  = { error: e.message }; }),
          readarr && readarr.searchAuthors(term).then((r) => { results.readarr = r; }).catch((e: Error) => { results.readarr = { error: e.message }; }),
        ]);
        return ok(results);
      }
    );
  }

  // ── RADARR ────────────────────────────────────────────────────────────

  if (radarr) {
    server.tool(
      "radarr_get_movies",
      "List all movies in Radarr",
      pagination,
      async ({ offset, limit }) => {
        const movies = await radarr.getMovies(offset, limit);
        return ok(movies.map((m) => ({
          id: m.id, title: m.title, year: m.year, status: m.status,
          hasFile: m.hasFile, monitored: m.monitored,
          tmdbId: m.tmdbId, imdbId: m.imdbId, sizeOnDisk: m.sizeOnDisk,
        })));
      }
    );

    server.tool(
      "radarr_search_movies",
      "Search for movies to add to Radarr",
      { term: z.string().describe("Movie title") },
      async ({ term }) => ok(await radarr.searchMovies(term))
    );

    server.tool(
      "radarr_add_movie",
      "Add a movie to Radarr by TMDB ID",
      {
        tmdbId: z.number().describe("TMDB ID"),
        qualityProfileId: z.number().describe("Quality profile ID (use radarr_get_quality_profiles)"),
        rootFolderPath: z.string().describe("Root folder path (use radarr_get_root_folders)"),
        monitored: z.boolean().optional().default(true),
        searchForMovie: z.boolean().optional().default(true),
      },
      async ({ tmdbId, qualityProfileId, rootFolderPath, monitored, searchForMovie }) =>
        ok(await radarr.addMovie(tmdbId, qualityProfileId, rootFolderPath, monitored, searchForMovie))
    );

    server.tool(
      "radarr_update_movie",
      "Update movie properties (monitored, quality profile, etc.)",
      {
        id: z.number().describe("Radarr movie ID"),
        monitored: z.boolean().optional(),
        qualityProfileId: z.number().optional(),
      },
      async ({ id, ...changes }) => ok(await radarr.updateMovie(id, changes))
    );

    server.tool(
      "radarr_delete_movie",
      "Delete a movie from Radarr",
      {
        id: z.number().describe("Radarr movie ID"),
        deleteFiles: z.boolean().optional().default(false),
      },
      async ({ id, deleteFiles }) => {
        await radarr.deleteMovie(id, deleteFiles);
        return ok({ success: true });
      }
    );

    server.tool(
      "radarr_search_movie",
      "Trigger a download search for a specific movie",
      { movieId: z.number().describe("Radarr movie ID") },
      async ({ movieId }) => { await radarr.triggerMovieSearch(movieId); return ok({ success: true }); }
    );

    server.tool(
      "radarr_refresh_movie",
      "Refresh metadata for a movie",
      { movieId: z.number().describe("Radarr movie ID") },
      async ({ movieId }) => { await radarr.refreshMovie(movieId); return ok({ success: true }); }
    );

    server.tool(
      "radarr_get_queue",
      "Get Radarr download queue",
      { offset: pagination.offset, limit: pagination.limit },
      async ({ offset, limit }) => ok(await radarr.getQueue(offset, limit))
    );

    server.tool(
      "radarr_delete_queue_item",
      "Remove an item from the Radarr download queue",
      {
        id: z.number().describe("Queue item ID"),
        blacklist: z.boolean().optional().default(false).describe("Add release to blocklist"),
      },
      async ({ id, blacklist }) => { await radarr.deleteQueueItem(id, blacklist); return ok({ success: true }); }
    );

    server.tool(
      "radarr_get_calendar",
      "Get upcoming movie releases in Radarr",
      dateRange,
      async ({ start, end }) => ok(await radarr.getCalendar(start, end))
    );

    server.tool("radarr_get_health", "Get Radarr health warnings", {}, async () => ok(await radarr.getHealth()));
    server.tool("radarr_get_status", "Get Radarr system status", {}, async () => ok(await radarr.getSystemStatus()));
    server.tool("radarr_get_quality_profiles", "List quality profiles in Radarr", {}, async () => ok(await radarr.getQualityProfiles()));
    server.tool("radarr_get_root_folders", "List root folders in Radarr", {}, async () => ok(await radarr.getRootFolders()));
    server.tool("radarr_get_download_clients", "List download clients configured in Radarr", {}, async () => ok(await radarr.getDownloadClients()));
    server.tool("radarr_get_tags", "List tags in Radarr", {}, async () => ok(await radarr.getTags()));
    server.tool("radarr_get_naming", "Get file naming configuration in Radarr", {}, async () => ok(await radarr.getNaming()));
  }

  // ── SONARR ────────────────────────────────────────────────────────────

  if (sonarr) {
    server.tool(
      "sonarr_get_series",
      "List all series in Sonarr",
      pagination,
      async ({ offset, limit }) => {
        const series = await sonarr.getSeries(offset, limit);
        return ok(series.map((s) => ({
          id: s.id, title: s.title, year: s.year, status: s.status,
          monitored: s.monitored, seasonCount: s.seasonCount,
          episodeCount: s.episodeCount, episodeFileCount: s.episodeFileCount,
          tvdbId: s.tvdbId, network: s.network, sizeOnDisk: s.sizeOnDisk,
        })));
      }
    );

    server.tool(
      "sonarr_search_series",
      "Search for a TV series to add to Sonarr",
      { term: z.string().describe("Series title") },
      async ({ term }) => ok(await sonarr.searchSeries(term))
    );

    server.tool(
      "sonarr_add_series",
      "Add a TV series to Sonarr by TVDB ID",
      {
        tvdbId: z.number().describe("TVDB ID"),
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
      async ({ id, deleteFiles }) => { await sonarr.deleteSeries(id, deleteFiles); return ok({ success: true }); }
    );

    server.tool(
      "sonarr_refresh_series",
      "Refresh metadata for a series",
      { seriesId: z.number().describe("Sonarr series ID") },
      async ({ seriesId }) => { await sonarr.refreshSeries(seriesId); return ok({ success: true }); }
    );

    server.tool(
      "sonarr_get_episodes",
      "Get episodes for a series, optionally filtered by season",
      {
        seriesId: z.number().describe("Sonarr series ID"),
        seasonNumber: z.number().optional().describe("Filter to a specific season"),
      },
      async ({ seriesId, seasonNumber }) => ok(await sonarr.getEpisodes(seriesId, seasonNumber))
    );

    server.tool(
      "sonarr_search_missing",
      "Trigger search for all missing episodes of a series",
      { seriesId: z.number().describe("Sonarr series ID") },
      async ({ seriesId }) => { await sonarr.searchMissingEpisodes(seriesId); return ok({ success: true }); }
    );

    server.tool(
      "sonarr_search_episode",
      "Trigger search for a specific episode",
      { episodeId: z.number().describe("Sonarr episode ID") },
      async ({ episodeId }) => { await sonarr.searchEpisode(episodeId); return ok({ success: true }); }
    );

    server.tool(
      "sonarr_get_queue",
      "Get Sonarr download queue",
      { offset: pagination.offset, limit: pagination.limit },
      async ({ offset, limit }) => ok(await sonarr.getQueue(offset, limit))
    );

    server.tool(
      "sonarr_delete_queue_item",
      "Remove an item from the Sonarr download queue",
      {
        id: z.number().describe("Queue item ID"),
        blacklist: z.boolean().optional().default(false),
      },
      async ({ id, blacklist }) => { await sonarr.deleteQueueItem(id, blacklist); return ok({ success: true }); }
    );

    server.tool(
      "sonarr_get_calendar",
      "Get upcoming episode air dates in Sonarr",
      dateRange,
      async ({ start, end }) => ok(await sonarr.getCalendar(start, end))
    );

    server.tool("sonarr_get_health", "Get Sonarr health warnings", {}, async () => ok(await sonarr.getHealth()));
    server.tool("sonarr_get_status", "Get Sonarr system status", {}, async () => ok(await sonarr.getSystemStatus()));
    server.tool("sonarr_get_quality_profiles", "List quality profiles in Sonarr", {}, async () => ok(await sonarr.getQualityProfiles()));
    server.tool("sonarr_get_root_folders", "List root folders in Sonarr", {}, async () => ok(await sonarr.getRootFolders()));
    server.tool("sonarr_get_download_clients", "List download clients configured in Sonarr", {}, async () => ok(await sonarr.getDownloadClients()));
    server.tool("sonarr_get_tags", "List tags in Sonarr", {}, async () => ok(await sonarr.getTags()));
    server.tool("sonarr_get_naming", "Get file naming configuration in Sonarr", {}, async () => ok(await sonarr.getNaming()));
  }

  // ── LIDARR ────────────────────────────────────────────────────────────

  if (lidarr) {
    server.tool(
      "lidarr_get_artists",
      "List all artists in Lidarr",
      pagination,
      async ({ offset, limit }) => ok(await lidarr.getArtists(offset, limit))
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
      { artistId: z.number().optional().describe("Lidarr artist ID"), ...pagination },
      async ({ artistId, offset, limit }) => ok(await lidarr.getAlbums(artistId, offset, limit))
    );

    server.tool(
      "lidarr_search_missing",
      "Trigger search for missing albums by an artist",
      { artistId: z.number().describe("Lidarr artist ID") },
      async ({ artistId }) => { await lidarr.searchMissingAlbums(artistId); return ok({ success: true }); }
    );

    server.tool(
      "lidarr_get_calendar",
      "Get upcoming album releases in Lidarr",
      dateRange,
      async ({ start, end }) => ok(await lidarr.getCalendar(start, end))
    );

    server.tool("lidarr_get_health", "Get Lidarr health warnings", {}, async () => ok(await lidarr.getHealth()));
    server.tool("lidarr_get_status", "Get Lidarr system status", {}, async () => ok(await lidarr.getSystemStatus()));
    server.tool("lidarr_get_quality_profiles", "List quality profiles in Lidarr", {}, async () => ok(await lidarr.getQualityProfiles()));
    server.tool("lidarr_get_metadata_profiles", "List metadata profiles in Lidarr", {}, async () => ok(await lidarr.getMetadataProfiles()));
    server.tool("lidarr_get_root_folders", "List root folders in Lidarr", {}, async () => ok(await lidarr.getRootFolders()));
    server.tool("lidarr_get_download_clients", "List download clients configured in Lidarr", {}, async () => ok(await lidarr.getDownloadClients()));
    server.tool("lidarr_get_tags", "List tags in Lidarr", {}, async () => ok(await lidarr.getTags()));
  }

  // ── READARR ───────────────────────────────────────────────────────────

  if (readarr) {
    server.tool(
      "readarr_get_authors",
      "List all authors in Readarr",
      pagination,
      async ({ offset, limit }) => {
        const all = await readarr.getAuthors();
        return ok(all.slice(offset, limit > 0 ? offset + limit : undefined));
      }
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
      { authorId: z.number().optional().describe("Readarr author ID"), ...pagination },
      async ({ authorId, offset, limit }) => {
        const all = await readarr.getBooks(authorId);
        return ok(all.slice(offset, limit > 0 ? offset + limit : undefined));
      }
    );

    server.tool(
      "readarr_search_books",
      "Search for a book in Readarr by title or ISBN",
      { term: z.string().describe("Book title or ISBN") },
      async ({ term }) => ok(await readarr.searchBooks(term))
    );

    server.tool("readarr_get_health", "Get Readarr health warnings", {}, async () => ok(await readarr.getHealth()));
    server.tool("readarr_get_status", "Get Readarr system status", {}, async () => ok(await readarr.getSystemStatus()));
    server.tool("readarr_get_quality_profiles", "List quality profiles in Readarr", {}, async () => ok(await readarr.getQualityProfiles()));
    server.tool("readarr_get_root_folders", "List root folders in Readarr", {}, async () => ok(await readarr.getRootFolders()));
  }

  // ── PROWLARR ──────────────────────────────────────────────────────────

  if (prowlarr) {
    server.tool(
      "prowlarr_get_indexers",
      "List all configured indexers in Prowlarr",
      {},
      async () => ok(await prowlarr.getIndexers())
    );

    server.tool(
      "prowlarr_test_indexer",
      "Test a specific indexer in Prowlarr",
      { id: z.number().describe("Indexer ID") },
      async ({ id }) => ok(await prowlarr.testIndexer(id))
    );

    server.tool(
      "prowlarr_test_all_indexers",
      "Test all indexers in Prowlarr",
      {},
      async () => ok(await prowlarr.testAllIndexers())
    );

    server.tool(
      "prowlarr_search",
      "Search across all Prowlarr indexers",
      {
        query: z.string().describe("Search query"),
        categories: z.array(z.number()).optional().describe("Category IDs (2000=Movies, 5000=TV, 3000=Audio, 7000=Books)"),
      },
      async ({ query, categories }) => ok(await prowlarr.search(query, categories))
    );

    server.tool("prowlarr_get_indexer_stats", "Get Prowlarr indexer statistics", {}, async () => ok(await prowlarr.getIndexerStats()));
    server.tool("prowlarr_get_health", "Get Prowlarr health warnings", {}, async () => ok(await prowlarr.getHealth()));
    server.tool("prowlarr_get_status", "Get Prowlarr system status", {}, async () => ok(await prowlarr.getSystemStatus()));
  }

  return server;
}

// ─── TRANSPORT ─────────────────────────────────────────────────────────────

async function startStdio() {
  const server = buildServer();
  const t = new StdioServerTransport();
  await server.connect(t);
  logConfigured();
}

async function startHttp() {
  // Each request gets its own transport+server instance (stateless).
  const httpServer = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", transport: "http" }));
      return;
    }

    if (req.url !== "/mcp") {
      res.writeHead(404);
      res.end("Not found. Use POST /mcp");
      return;
    }

    const server = buildServer();
    const t = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(t);

    // Parse body
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;

    await t.handleRequest(req, res, body);
  });

  httpServer.listen(httpPort, httpHost, () => {
    process.stderr.write(`arr-mcp HTTP server listening on http://${httpHost}:${httpPort}/mcp\n`);
    logConfigured();
  });
}

function logConfigured() {
  const configured = [
    radarr && "Radarr",
    sonarr && "Sonarr",
    lidarr && "Lidarr",
    readarr && "Readarr",
    prowlarr && "Prowlarr",
  ].filter(Boolean);
  process.stderr.write(
    `Configured: ${configured.join(", ") || "none (set *_URL + *_API_KEY env vars)"}\n`
  );
}

// ─── START ─────────────────────────────────────────────────────────────────

if (transport === "http") {
  startHttp().catch((err) => { process.stderr.write(`Fatal: ${err}\n`); process.exit(1); });
} else {
  startStdio().catch((err) => { process.stderr.write(`Fatal: ${err}\n`); process.exit(1); });
}

# Arr-MCP

An MCP server for your \*ARR stack — Radarr, Sonarr, Lidarr, Readarr, and Prowlarr.

Supports **stdio** (local, Claude Desktop) and **HTTP/Streamable HTTP** (remote, ChatGPT, any MCP-compatible client).

## Tools

### Cross-service
| Tool | Description |
|------|-------------|
| `arr_get_services` | Show which services are configured |
| `arr_search_all` | Search all configured services at once |

### Radarr (Movies)
| Tool | Description |
|------|-------------|
| `radarr_get_movies` | List movies (paginated) |
| `radarr_search_movies` | Search by title |
| `radarr_add_movie` | Add by TMDB ID |
| `radarr_update_movie` | Update monitored/quality profile |
| `radarr_delete_movie` | Delete (optionally with files) |
| `radarr_search_movie` | Trigger download search for a movie |
| `radarr_refresh_movie` | Refresh metadata |
| `radarr_get_queue` | Download queue (paginated) |
| `radarr_delete_queue_item` | Remove item from queue |
| `radarr_get_calendar` | Upcoming releases |
| `radarr_get_health` | Health warnings |
| `radarr_get_quality_profiles` | Quality profiles |
| `radarr_get_root_folders` | Root folders |
| `radarr_get_download_clients` | Download clients |
| `radarr_get_tags` | Tags |
| `radarr_get_naming` | File naming config |
| `radarr_get_status` | System status |

### Sonarr (TV Shows)
| Tool | Description |
|------|-------------|
| `sonarr_get_series` | List series (paginated) |
| `sonarr_search_series` | Search by title |
| `sonarr_add_series` | Add by TVDB ID |
| `sonarr_delete_series` | Delete (optionally with files) |
| `sonarr_refresh_series` | Refresh metadata |
| `sonarr_get_episodes` | List episodes (optionally by season) |
| `sonarr_search_missing` | Trigger search for missing episodes |
| `sonarr_search_episode` | Trigger search for a specific episode |
| `sonarr_get_queue` | Download queue (paginated) |
| `sonarr_delete_queue_item` | Remove item from queue |
| `sonarr_get_calendar` | Upcoming air dates |
| `sonarr_get_health` | Health warnings |
| `sonarr_get_quality_profiles` | Quality profiles |
| `sonarr_get_root_folders` | Root folders |
| `sonarr_get_download_clients` | Download clients |
| `sonarr_get_tags` | Tags |
| `sonarr_get_naming` | File naming config |
| `sonarr_get_status` | System status |

### Lidarr (Music)
| Tool | Description |
|------|-------------|
| `lidarr_get_artists` | List artists (paginated) |
| `lidarr_search_artists` | Search by name |
| `lidarr_add_artist` | Add by MusicBrainz ID |
| `lidarr_get_albums` | List albums (optionally by artist, paginated) |
| `lidarr_search_missing` | Trigger search for missing albums |
| `lidarr_get_calendar` | Upcoming album releases |
| `lidarr_get_health` | Health warnings |
| `lidarr_get_quality_profiles` | Quality profiles |
| `lidarr_get_metadata_profiles` | Metadata profiles |
| `lidarr_get_root_folders` | Root folders |
| `lidarr_get_download_clients` | Download clients |
| `lidarr_get_tags` | Tags |
| `lidarr_get_status` | System status |

### Readarr (Books)
| Tool | Description |
|------|-------------|
| `readarr_get_authors` | List authors (paginated) |
| `readarr_search_authors` | Search by name |
| `readarr_add_author` | Add by Goodreads ID |
| `readarr_get_books` | List books (optionally by author, paginated) |
| `readarr_search_books` | Search by title or ISBN |
| `readarr_get_health` | Health warnings |
| `readarr_get_quality_profiles` | Quality profiles |
| `readarr_get_root_folders` | Root folders |
| `readarr_get_status` | System status |

### Prowlarr (Indexers)
| Tool | Description |
|------|-------------|
| `prowlarr_get_indexers` | List indexers |
| `prowlarr_test_indexer` | Test a specific indexer |
| `prowlarr_test_all_indexers` | Test all indexers |
| `prowlarr_search` | Search across indexers |
| `prowlarr_get_indexer_stats` | Indexer statistics |
| `prowlarr_get_health` | Health warnings |
| `prowlarr_get_status` | System status |

## Setup

### 1. Install & Build

```bash
npm install
npm run build
```

### 2. Configure

Copy `.env.example` to `.env` and fill in your service URLs and API keys. Only configure the services you use — unconfigured services are skipped at startup and their tools don't appear.

API keys: **Settings → General → Security → API Key** in each app.

---

## Transport modes

### stdio — local (Claude Desktop)

Default mode. The MCP client launches the process directly.

```json
{
  "mcpServers": {
    "arr": {
      "command": "node",
      "args": ["/path/to/arr-mcp/dist/index.js"],
      "env": {
        "RADARR_URL": "http://localhost:7878",
        "RADARR_API_KEY": "...",
        "SONARR_URL": "http://localhost:8989",
        "SONARR_API_KEY": "..."
      }
    }
  }
}
```

### HTTP — remote (ChatGPT, hosted clients)

Set `MCP_TRANSPORT=http`. The server listens on `http://HOST:PORT/mcp` and accepts POST requests per the MCP Streamable HTTP spec.

```bash
MCP_TRANSPORT=http MCP_PORT=3000 \
  RADARR_URL=http://... RADARR_API_KEY=... \
  node dist/index.js
```

A `GET /health` endpoint is also available for uptime checks.

---

## Docker

### Stdio (default)

```bash
cp .env.example .env   # vul je keys in
docker compose up --build
```

### HTTP / remote

```bash
MCP_TRANSPORT=http MCP_PORT=3000 docker compose up --build
```

The container exposes the configured port. Point your MCP client to:

```
http://<host>:<port>/mcp
```

### Direct docker run

```bash
docker build -t arr-mcp .

# stdio
docker run --rm -i \
  -e RADARR_URL=http://192.168.1.x:7878 \
  -e RADARR_API_KEY=abc123 \
  arr-mcp

# http
docker run --rm -p 3000:3000 \
  -e MCP_TRANSPORT=http \
  -e RADARR_URL=http://192.168.1.x:7878 \
  -e RADARR_API_KEY=abc123 \
  arr-mcp
```

> **Tip:** Als je \*ARR draait op de host machine gebruik dan `host.docker.internal` (Mac/Windows) of het host IP-adres in plaats van `localhost`.

## Development

```bash
npm run dev   # run met tsx (geen build stap)
npm run build # compileer naar dist/
npm start     # run gecompileerde output
```

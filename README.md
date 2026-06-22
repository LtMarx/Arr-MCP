# Arr-MCP

An MCP server for your \*ARR stack — Radarr, Sonarr, Lidarr, Readarr, and Prowlarr.

## Tools

### Radarr (Movies)
| Tool | Description |
|------|-------------|
| `radarr_get_movies` | List all movies |
| `radarr_search_movies` | Search for a movie by title |
| `radarr_add_movie` | Add a movie by TMDB ID |
| `radarr_delete_movie` | Delete a movie (optionally with files) |
| `radarr_get_queue` | View download queue |
| `radarr_get_health` | Health check |
| `radarr_get_quality_profiles` | List quality profiles |
| `radarr_get_root_folders` | List root folders |
| `radarr_get_status` | System status |

### Sonarr (TV Shows)
| Tool | Description |
|------|-------------|
| `sonarr_get_series` | List all series |
| `sonarr_search_series` | Search for a series by title |
| `sonarr_add_series` | Add a series by TVDB ID |
| `sonarr_delete_series` | Delete a series (optionally with files) |
| `sonarr_get_episodes` | List episodes for a series |
| `sonarr_get_queue` | View download queue |
| `sonarr_get_health` | Health check |
| `sonarr_get_quality_profiles` | List quality profiles |
| `sonarr_get_root_folders` | List root folders |
| `sonarr_get_status` | System status |

### Lidarr (Music)
| Tool | Description |
|------|-------------|
| `lidarr_get_artists` | List all artists |
| `lidarr_search_artists` | Search for an artist |
| `lidarr_add_artist` | Add an artist by MusicBrainz ID |
| `lidarr_get_albums` | List albums (optionally by artist) |
| `lidarr_get_health` | Health check |
| `lidarr_get_quality_profiles` | List quality profiles |
| `lidarr_get_root_folders` | List root folders |
| `lidarr_get_status` | System status |

### Readarr (Books)
| Tool | Description |
|------|-------------|
| `readarr_get_authors` | List all authors |
| `readarr_search_authors` | Search for an author |
| `readarr_add_author` | Add an author by foreign ID |
| `readarr_get_books` | List books (optionally by author) |
| `readarr_search_books` | Search for a book by title/ISBN |
| `readarr_get_health` | Health check |
| `readarr_get_quality_profiles` | List quality profiles |
| `readarr_get_root_folders` | List root folders |
| `readarr_get_status` | System status |

### Prowlarr (Indexers)
| Tool | Description |
|------|-------------|
| `prowlarr_get_indexers` | List all configured indexers |
| `prowlarr_search` | Search across indexers |
| `prowlarr_get_indexer_stats` | Indexer statistics |
| `prowlarr_get_health` | Health check |
| `prowlarr_get_status` | System status |

## Setup

### 1. Install & Build

```bash
npm install
npm run build
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your service URLs and API keys. You only need to configure the services you use — unconfigured services are simply unavailable.

API keys are found in each app under **Settings → General → Security → API Key**.

### 3. Wire Up in Claude Desktop (or any MCP client)

Add to your MCP client config (e.g. `claude_desktop_config.json`):

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
        "SONARR_API_KEY": "...",
        "PROWLARR_URL": "http://localhost:9696",
        "PROWLARR_API_KEY": "..."
      }
    }
  }
}
```

Or with `npx` / `tsx` for development:

```json
{
  "mcpServers": {
    "arr": {
      "command": "npx",
      "args": ["tsx", "/path/to/arr-mcp/src/index.ts"],
      "env": { ... }
    }
  }
}
```

## Development

```bash
npm run dev   # run with tsx (no build step)
npm run build # compile to dist/
npm start     # run compiled output
```

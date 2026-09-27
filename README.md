# Arr-MCP

An MCP server for your \*ARR stack — Radarr, Sonarr, Lidarr, Readarr, and Prowlarr.

> **Readarr is retired by upstream** (since May 2024) — its tools still work but metadata may be unreliable. See [Readarr status](https://wiki.servarr.com/readarr/status).

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
| `lidarr_get_releases` | Get available releases for an album |
| `lidarr_grab_release` | Grab a specific release by GUID |
| `lidarr_get_history` | Download history (grabs, imports, failures) |
| `lidarr_get_blocklist` | Blocklist |
| `lidarr_delete_blocklist_item` | Remove item from blocklist |
| `lidarr_get_wanted_missing` | Monitored albums with no file |
| `lidarr_get_queue` | Download queue (paginated) |
| `lidarr_delete_queue_item` | Remove item from queue |
| `lidarr_get_diskspace` | Disk space per root folder |
| `lidarr_get_command_status` | Check status of a triggered command |
| `lidarr_get_calendar` | Upcoming album releases |
| `lidarr_get_health` | Health warnings |
| `lidarr_get_quality_profiles` | Quality profiles |
| `lidarr_get_metadata_profiles` | Metadata profiles |
| `lidarr_get_root_folders` | Root folders |
| `lidarr_get_download_clients` | Download clients |
| `lidarr_get_tags` | Tags |
| `lidarr_get_status` | System status |

### Readarr (Books) — ⚠️ retired upstream
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
| `prowlarr_grab` | Grab a release found via search |
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

### Health endpoint

In http mode zijn er twee niveaus:

| Request | Betekenis | Status |
|---|---|---|
| `GET /health` | **Liveness** — proces draait en serveert | altijd `200` zolang de server leeft |
| `GET /health?deep=1` | **Readiness** — pingt bovendien elke geconfigureerde \*ARR service | `200` als alles antwoordt, `503` bij één of meer fouten |

```bash
curl http://localhost:3000/health
# → {"status":"ok","transport":"http","version":"1.5.0","uptimeSeconds":42}

curl "http://localhost:3000/health?deep=1"
# → {"status":"degraded", ..., "services":[
#      {"name":"Radarr","ok":true,"ms":12,"version":"5.14.0"},
#      {"name":"Sonarr","ok":false,"ms":5000,"error":"timeout after 5000ms"}]}
```

De plain `/health` is bewust onafhankelijk van je \*ARR services: een kort onbereikbare Radarr maakt de MCP-server zelf niet stuk.

---

## Docker

Het gepubliceerde image staat op GitHub Container Registry:

```
ghcr.io/ltmarx/arr-mcp:latest
```

De `docker-compose.yml` heeft twee profielen — `stdio` en `http` — die nooit tegelijk actief zijn.

### HTTP mode — remote/persistent server

```bash
cp .env.example .env   # vul je keys in
docker compose --profile http up
```

De server luistert op `http://<host>:3000/mcp`. Poort aanpassen: `MCP_PORT=8080 docker compose --profile http up`.

Controleer of de server draait:

```bash
curl http://localhost:3000/health
# → {"status":"ok","transport":"http","version":"1.5.0","uptimeSeconds":42}
```

### Container healthcheck

Het image (v1.5.0 en hoger) heeft een ingebouwde `HEALTHCHECK`. Die gebruikt **node**,
niet `curl` of `wget` — die zitten namelijk niet in `node:22-alpine`. Een eigen
healthcheck met `curl -f ...` faalt daarom altijd met `curl: not found`.

Gebruik je een eigen compose-bestand, neem dan deze probe over. Hij is bewust
*inline* en werkt daardoor op elke image-versie:

```yaml
healthcheck:
  test:
    - CMD
    - node
    - -e
    - "require('http').get({host:'127.0.0.1',port:process.env.MCP_PORT||3000,path:'/health',timeout:4000},r=>{r.resume();process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
  interval: 30s
  timeout: 5s
  start_period: 10s
  retries: 3
```

Status bekijken:

```bash
docker compose --profile http ps          # STATUS toont (healthy)
docker inspect --format '{{json .State.Health}}' <container> | jq
```

#### Container blijft `unhealthy`

Loopt de server prima (`http server started` in de logs) maar staat de container
toch op `unhealthy`, loop dan deze drie langs:

**1. Draai je wel een recent image?**

```bash
curl -s http://127.0.0.1:3000/health
```

Zit er geen `version`-veld in de response, dan draai je een image ouder dan v1.5.0.
`docker compose up -d` haalt **geen** nieuwe `:latest` op als er al een lokaal image
ligt — je moet expliciet pullen:

```bash
docker compose pull && docker compose up -d
```

**2. Verwijst je healthcheck naar `docker-healthcheck.js`?**

Dat bestand bestaat pas vanaf v1.5.0. Op een ouder image geeft
`node docker-healthcheck.js` een `Cannot find module`-fout → exit 1 → `unhealthy`.
Gebruik de inline probe hierboven, die heeft die afhankelijkheid niet.

**3. Wat zegt de check zelf?**

```bash
docker inspect --format '{{json .State.Health}}' arr-mcp | jq '.Log[-1]'
```

De `Output` bevat de concrete foutmelding (`curl: not found`,
`Cannot find module`, connection refused, enz.).

In **stdio mode draait er geen HTTP-server**, dus daar is niets te proben: de check
stopt direct met exit 0 en in compose staat hij expliciet uit (`healthcheck: disable: true`).

Wil je dat de container ook ongezond wordt als een \*ARR service onbereikbaar is,
zet dan `HEALTHCHECK_DEEP=1`. Standaard staat dat uit, zodat een herstartende
Radarr niet je hele MCP-container omlaag trekt.

### Stdio mode — lokaal (Claude Desktop)

```bash
docker compose --profile stdio up
```

Of direct via `docker run` (wordt gestart door de MCP client):

```bash
docker run --rm -i \
  -e RADARR_URL=http://192.168.1.x:7878 \
  -e RADARR_API_KEY=abc123 \
  ghcr.io/ltmarx/arr-mcp:latest
```

MCP client config voor Claude Desktop:

```json
{
  "mcpServers": {
    "arr": {
      "command": "docker",
      "args": ["run", "--rm", "-i",
        "-e", "RADARR_URL", "-e", "RADARR_API_KEY",
        "-e", "SONARR_URL", "-e", "SONARR_API_KEY",
        "ghcr.io/ltmarx/arr-mcp:latest"
      ],
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

> **Tip:** Als je \*ARR draait op de host machine gebruik dan `host.docker.internal` (Mac/Windows) of het host IP-adres in plaats van `localhost`.

## Releases

Releases worden automatisch gepubliceerd via GitHub Actions. Maak een tag aan op GitHub (`v1.0.0`) en publiceer een Release — het multi-arch image (amd64 + arm64) verschijnt vanzelf op GHCR.

## Development

```bash
npm run dev   # run met tsx (geen build stap)
npm run build # compileer naar dist/
npm start     # run gecompileerde output
```

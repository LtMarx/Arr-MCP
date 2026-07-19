# Arr-MCP — context voor Claude

## Wat is dit project?

Een MCP (Model Context Protocol) server die AI-assistenten (Claude, ChatGPT) laat communiceren met de *ARR media-automatisering stack: Radarr, Sonarr, Lidarr, Readarr en Prowlarr.

> **Let op:** Readarr is sinds mei 2024 retired door upstream (metadata-server onbetrouwbaar, geen onderhoud meer). De tools blijven werken maar worden gemarkeerd als `deprecated` in `arr_get_services` en loggen een warning bij startup. Zie wiki.servarr.com/readarr/status.

## Stack & technologie

- **Runtime:** Node.js 22, TypeScript (volledig)
- **MCP SDK:** `@modelcontextprotocol/sdk` (McpServer, StdioServerTransport, StreamableHTTPServerTransport)
- **Validatie:** Zod
- **Transport:** stdio (lokaal) of HTTP/Streamable HTTP (remote)
- **Build:** `tsc` → `dist/`, module type `ESM`

## Projectstructuur

```
src/
  index.ts              # MCP server, tool-registratie, transport-setup
  arr-client.ts         # Gedeelde fetch-wrapper met X-Api-Key header
  services/
    radarr.ts           # Radarr API methoden
    sonarr.ts           # Sonarr API methoden
    lidarr.ts           # Lidarr API methoden
    readarr.ts          # Readarr API methoden
    prowlarr.ts         # Prowlarr API methoden
.github/workflows/
  ci.yml                # Build-check bij push/PR naar main
  release.yml           # Docker image → GHCR bij GitHub Release
```

## Architectuurprincipes

- **Conditionele registratie:** tools worden alleen geregistreerd als de bijbehorende service geconfigureerd is (`*_URL` + `*_API_KEY` aanwezig). Geen env vars = geen tools.
- **Stateless HTTP:** elke POST /mcp request krijgt een eigen `McpServer` + `StreamableHTTPServerTransport` instantie (`sessionIdGenerator: undefined`).
- **Eén client per service:** `ArrClient` is een dunne wrapper; alle logica zit in de service-klassen.
- **Paginering:** alle lijst-endpoints accepteren `offset` en `limit` parameters.

## Configuratie (env vars)

| Variabele | Omschrijving | Default |
|---|---|---|
| `MCP_TRANSPORT` | `stdio` of `http` | `stdio` |
| `MCP_PORT` | Poort voor HTTP mode | `3000` |
| `MCP_HOST` | Bind-adres voor HTTP mode | `0.0.0.0` |
| `RADARR_URL` | Base URL van Radarr | — |
| `RADARR_API_KEY` | API key van Radarr | — |
| `SONARR_URL` / `_API_KEY` | Sonarr | — |
| `LIDARR_URL` / `_API_KEY` | Lidarr | — |
| `READARR_URL` / `_API_KEY` | Readarr | — |
| `PROWLARR_URL` / `_API_KEY` | Prowlarr | — |

## Docker

Twee Compose-profielen, nooit samen actief:

```bash
docker compose --profile stdio up   # stdio mode
docker compose --profile http up    # http mode (poort 3000)
```

Gepubliceerd image: `ghcr.io/ltmarx/arr-mcp:latest`

## Releases

Releases via GitHub: maak een tag `vX.Y.Z` aan → GitHub Release publiceren → `release.yml` bouwt en pusht multi-arch image (amd64 + arm64) naar GHCR automatisch.

## Veelgebruikte commando's

```bash
npm run build   # TypeScript compileren
npm run dev     # Direct uitvoeren met tsx (geen build)
npm start       # Gecompileerde versie starten
```

## *ARR API-conventies

| Service | API versie |
|---|---|
| Radarr | `/api/v3` |
| Sonarr | `/api/v3` |
| Lidarr | `/api/v1` |
| Readarr | `/api/v1` |
| Prowlarr | `/api/v1` |

De versie wordt per client meegegeven via `ArrConfig.apiVersion`. `ArrClient` bouwt de base path als `/api/${apiVersion}`.

Radarr/Sonarr/Lidarr/Readarr hebben identieke endpoints voor health, quality profiles, root folders, download clients, tags en naming. Prowlarr wijkt af (geen `/movie` of `/series`, wel `/indexer` en `/search`).

Release-flow (Radarr/Sonarr/Lidarr): `GET /release?<entity>Id=X` → kandidaten ophalen → `POST /release { guid, indexerId }` → grab triggeren. Prowlarr heeft een vergelijkbare `POST /search { guid, indexerId }` voor het grabben van een losse indexer-hit.

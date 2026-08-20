# search-eve
[![](https://img.shields.io/badge/fly_safe-o7-2F849E.svg?style=for-the-badge)](https://www.eveonline.com/)

## General information
Search EVE is a flexible item, system, constellation and region search engine for EVE Online.

The engine continuously updates its information when the game updates and keeps multiple caches for
improved performance. A query is resolved by trying progressively looser strategies: an exact ID
match, a shortcut expansion, whole-word matches, prefix and suffix matches, a substring match, and
finally a fuzzy match. The shortest matching name wins, because it is usually the one you meant.

## Usage
### `/type/` or `/item/` (params: q)
Search types (items).
Example: `/type/?q=dancers%20female`

### `/system/` (params: q)
Search systems.
Example: `/system/?q=jita`

### `/constellation/` (params: q)
Search constellations.
Example: `/constellation/?q=kimotoro`

### `/region/` (params: q)
Search regions.
Example: `/region/?q=the%20forge`

### `/shortcuts/`
View defined search shortcuts.
Example: `/shortcuts/`

A result that was only found by the fuzzy matcher carries `"fuzzy": true`, so you can tell an exact
hit from a best guess.

## Self-hosting
It is possible to self-host this service. It requires Docker with the Compose v2 plugin.

1. Install [Docker Engine](https://docs.docker.com/engine/install/), which includes the Compose v2 plugin.
2. Clone this repository, or [download](https://github.com/Ionaru/search-eve/archive/master.zip) and extract it.
3. Create a `.env` file in the root of the checkout. Every variable is optional:

   ```dotenv
   # Optional, see the table below.
   SEARCHEVE_PORT=3000
   SEARCHEVE_DATA_VOLUME=/absolute/path/to/your/data
   ```

4. Start the service:

   ```bash
   docker compose --project-name search-eve --env-file "$PWD/.env" --file deploy/compose.yaml up -d
   ```

   The `--env-file` flag is not optional. The Compose file lives in `deploy/`, so Compose looks for a
   `.env` next to it and will **not** find the one in the root of the checkout. Without the flag the
   service starts on the default port and writes its caches somewhere you did not intend.

5. Check that it came up:

   ```bash
   docker compose --project-name search-eve --env-file "$PWD/.env" --file deploy/compose.yaml logs -f
   ```

The first start is slow. Search EVE downloads and caches the entire EVE Online universe (every type,
system, constellation and region) before it opens its port, which takes several minutes. The
container reports `starting` until that is done and `healthy` once it is serving. Subsequent starts
reuse the cache in `/app/data` and are fast.

Run `docker compose ... config` instead of `up` at any point to print the fully resolved
configuration. That is the quickest way to confirm your port and data directory are what you expect.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `SEARCHEVE_PORT` | No | The **host** port to publish the service on. Defaults to `3000`. |
| `SEARCHEVE_DATA_VOLUME` | No | Where Search EVE keeps its caches. Defaults to a Docker named volume. |
| `SEARCHEVE_GIT_REVISION` | No | Image tag to run. Defaults to `latest`. |
| `DEBUG` | No | Set to `search-eve*` or `*` for extra logging output. |

Inside the container the service always listens on port 3000; `SEARCHEVE_PORT` only changes the host
port it is published on. If you run the service outside Docker, `SEARCHEVE_PORT` is instead the port
the process itself binds to.

`SEARCHEVE_DATA_VOLUME` must be either left unset, which uses the named volume declared in the
Compose file, or set to an **absolute** host path. A relative path such as `./data` resolves against
`deploy/`, not the root of the checkout. The container runs as the unprivileged `node` user, so a
host directory needs to be writable by UID 1000.

### A note on architecture
The prebuilt `ghcr.io/ionaru/search-eve` images are `linux/amd64` only. On other architectures the
pull fails with a manifest error, and you will need to build the image locally instead:

```bash
docker compose --project-name search-eve --env-file "$PWD/.env" --file deploy/compose.yaml up -d --build
```

Contact me in EVE Online: `Ionaru Otsada` or on Discord: `@ionaru` if you need any assistance.

## Developer information
Want to contribute? Awesome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

Search EVE is written in TypeScript and requires **Node.js 24 or newer** and **pnpm**.

```bash
pnpm install    # Install dependencies
pnpm run build  # Compile TypeScript to dist/
pnpm run lint   # Lint the source
pnpm start      # Run the compiled service
```

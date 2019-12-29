# @ionaru/search-eve

## Description
Search EVE is a flexible item, system, constellation and region search engine for EVE Online.
The engine will continuously update information when the game updates and keeps multiple caches for improved performance.

## How to Use
### `/type/` (params: q)
Search types (items).
Example: `/system/?q=dancers%20female`

### `/system/` (params: q)
Search systems.
Example: `/system/?q=jita`

### `/constellation/` (params: q)
Search constellations.
Example: `/constellation/?q=kimotoro`

### `/region/` (params: q)
Search regions.
Example: `/region/?q=amarr`

### Configuration
Search-EVE requires some set-up to work, this information is for developers.

#### Environment variables
- `DEBUG`: Parameters for the debug package. See <https://www.npmjs.com/package/debug> for more information.
- `SEARCHEVE_DATA_VOLUME`: Docker volume for the data folder.`
- `SEARCHEVE_PORT`: The port the server should run on.

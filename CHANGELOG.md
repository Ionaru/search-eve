# Changelog
All notable changes to the search-eve project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Setup for this project
- Deployment to a Debian host via GHCR and SSH `docker compose`, replacing TeamCity
- A container healthcheck on `/shortcuts`, so a deploy waits for the service to actually serve
- Dependabot configuration for npm, GitHub Actions and Docker updates

### Changed
- Switched the package manager from npm to pnpm
- Moved the Docker setup to `deploy/`, with a Compose v2 `compose.yaml`
- `SEARCHEVE_PORT` is now the host port; the container always listens on 3000
- The container runs as the unprivileged `node` user
- Updated to Node.js 24 and TypeScript 5.9
- Updated all dependencies and GitHub Actions to current versions

### Removed
- `moment`, replaced with native `Date` arithmetic
- `@ionaru/array-utils`, replaced with `Array.from` and `Array.prototype.sort`
- `chalk` and `supports-color`, which were never imported

### Fixed
- All known security advisories in the dependency tree

[Unreleased]: https://github.com/Ionaru/search-eve/compare/4a84f37...HEAD

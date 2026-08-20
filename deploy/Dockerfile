# ---- Build stage: compile TypeScript to dist/ ----
FROM node:24-alpine AS build

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app

RUN corepack enable

# Install all dependencies (including dev) for the build. The pnpm version comes
# from the "packageManager" field in package.json.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile

# Compile the application.
COPY src ./src
RUN pnpm run build


# ---- Runtime stage: production image ----
FROM node:24-alpine AS runtime

ENV NODE_ENV=production
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app

RUN corepack enable

# Install production dependencies only. Everything is pure JavaScript, so there
# is no native compilation and no build toolchain is required.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

# Copy the compiled application from the build stage.
COPY --from=build /app/dist ./dist

# The universe caches (types.json, systems.json, ...) and the ESI request cache
# (requests.json) live here; mounted as a volume in production.
RUN mkdir -p /app/data && chown -R node:node /app
VOLUME /app/data

# The service always listens on 3000. Nothing is published to the host; a
# reverse proxy reaches it over a shared Docker network.
EXPOSE 3000

USER node
CMD ["node", "dist/index.js"]

FROM node:18-alpine as builder

RUN mkdir -p /app
WORKDIR /app

# Copy required files
COPY ./package.json ./package-lock.json ./tsconfig.json ./
# Install dependencies
RUN npm ci --ignore-scripts

# Build for production
ENV NODE_ENV production
COPY ./src ./src
RUN npm run build


FROM node:18-alpine as runner

RUN mkdir -p /app/data
WORKDIR /app

# Copy required files
COPY ./package.json ./package-lock.json ./

# Install dependencies
ENV NODE_ENV production
RUN npm ci --ignore-scripts

# Copy built files
COPY --from=builder /app/dist ./dist

# Run
VOLUME /app/data
ARG DEBUG
CMD ["npm", "start"]

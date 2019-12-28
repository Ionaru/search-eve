FROM node:12-alpine


## INSTALL SERVER

RUN mkdir -p /app /app/data
WORKDIR /app

# Copy required files
COPY ./package.json ./package-lock.json ./tsconfig.json ./
COPY ./src ./src

# Install dependencies
RUN npm install

# Build for production
ENV NODE_ENV production
RUN npm run build

# Add volumes
VOLUME /app/data


## RUN

ARG DEBUG
CMD ["npm", "start"]

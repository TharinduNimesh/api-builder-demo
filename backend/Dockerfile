# Backend Dockerfile
FROM node:18-bullseye-slim
WORKDIR /usr/src/app

# Install system dependencies required by Prisma query engine (libssl1.1) and common tools
RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates \
	curl \
	libssl1.1 \
 && rm -rf /var/lib/apt/lists/*

# install node deps
COPY package.json package-lock.json* ./
# Install dependencies (including dev deps) so prisma CLI is available for generation
RUN npm ci

# copy prisma schema early so we can generate the client during build
COPY prisma ./prisma

# generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma || true

# remove dev dependencies to keep image small
RUN npm prune --production

# copy rest of the sources
COPY . .

# build (if you have a build step)
RUN npm run build || true

ENV NODE_ENV=production
EXPOSE 3000

# entrypoint will run migrations then start the server
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/server.js"]

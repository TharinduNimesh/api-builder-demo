# Backend Dockerfile
FROM node:18-bullseye-slim
WORKDIR /usr/src/app

# Install system dependencies required by Prisma query engine (libssl1.1) and common tools
RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates \
	curl \
	libssl1.1 \
 && rm -rf /var/lib/apt/lists/*

# install node deps (including dev deps so build tools are available)
COPY package.json package-lock.json* ./
RUN npm ci

# copy rest of the project
COPY . .

# build the project (this should produce dist/server.js)
RUN npm run build || true

# generate Prisma client (needs build and prisma schema present)
RUN npx prisma generate --schema=./prisma/schema.prisma || true

# remove dev dependencies to keep image small
RUN npm prune --production

ENV NODE_ENV=production
EXPOSE 3000

# entrypoint will run migrations then start the server
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/server.js"]

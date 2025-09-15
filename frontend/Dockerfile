# Frontend Dockerfile (Vite)
FROM node:18-alpine AS build
WORKDIR /usr/src/app
COPY package.json yarn.lock* package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine as runner
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/dist ./dist
# serve with a lightweight static server
RUN npm i -g serve
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install
COPY apps/api apps/api
RUN npm run db:generate -w @movexa/api
EXPOSE 4000
CMD ["sh", "-c", "npm run db:push -w @movexa/api && npm start -w @movexa/api"]

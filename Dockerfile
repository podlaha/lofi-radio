FROM node:20-slim


WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "server/index.js"]

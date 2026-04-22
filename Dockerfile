FROM node:20-slim

ARG YTDLP_DATE=2026-04-22
RUN apt-get update && apt-get install -y python3 curl ffmpeg && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "server/index.js"]

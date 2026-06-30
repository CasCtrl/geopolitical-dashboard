# ── Build stage: compile the Vite/React frontend ──────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# ── Runtime stage: Node.js API + static frontend ──────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy server source
COPY server/ ./server/
COPY public/ ./public/

# Copy the built React app from the builder stage
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 5050

CMD ["node", "server/server.js"]

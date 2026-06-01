FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/blockchain-worker/package.json ./apps/blockchain-worker/package.json
RUN pnpm install --frozen-lockfile --filter @medvault/blockchain-worker...
COPY apps/blockchain-worker ./apps/blockchain-worker
WORKDIR /app/apps/blockchain-worker
CMD ["pnpm", "tsx", "src/index.ts"]

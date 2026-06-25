FROM node:22-bookworm-slim AS deps
WORKDIR /usr/src/app
ENV COREPACK_ENABLE_AUTO_PIN=0
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS build
WORKDIR /usr/src/app
ENV COREPACK_ENABLE_AUTO_PIN=0
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV COREPACK_ENABLE_AUTO_PIN=0
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]

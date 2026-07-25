# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Enable pnpm via corepack (ships with Node)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy lockfile + package.json first (layer caching)
COPY package.json pnpm-lock.yaml ./

# Install ALL deps (including devDependencies, needed for tsc)
RUN pnpm install --frozen-lockfile

# Copy the rest of the source
COPY . .

# Compile TypeScript -> dist/
RUN pnpm run build


# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

# Only production deps this time
RUN pnpm install --frozen-lockfile --prod

# Copy only the compiled output from the build stage
COPY --from=build /app/dist ./dist

EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]
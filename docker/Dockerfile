# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG MONGODB_URI=mongodb://127.0.0.1:27017/docker-build
ENV MONGODB_URI=${MONGODB_URI}
ARG NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ARG NEXT_PUBLIC_BETTER_AUTH_URL=http://127.0.0.1:3000/api/auth
ENV NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}
ARG BETTER_AUTH_URL=http://127.0.0.1:3000/api/auth
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ARG BETTER_AUTH_SECRET=docker-build-placeholder-secret-min-32-chars!!
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV AUTH_EMAIL_PROVIDER=noop
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]

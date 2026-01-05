FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
run pnpm i
COPY .
RUN pnpm build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env ./
COPY --from=builder /app/src/views ./src/views
RUN pnpm i --prod
EXPOSE 3000
CMD ["node", "dist/main.js"]

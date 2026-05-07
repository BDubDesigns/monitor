FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev 2>/dev/null || true
COPY . .
EXPOSE 3099
ENV BIND=0.0.0.0
ENV PORT=3099
CMD ["node", "server.mjs"]

# Stage 1: Build the Next.js application
FROM node:20-slim as builder

WORKDIR /app

COPY package.json package-lock.json* ./

# Clean npm cache and install dependencies
RUN npm cache clean --force && npm install

COPY . .

# Next.js uygulamasını derle
RUN npm run build
# REMOVED: RUN ls -al ./.next

# Stage 2: Create the production-ready image
FROM node:20-slim as runner

WORKDIR /app

ENV NODE_ENV production

# Public dizinini kopyala (statik varlıklar için) - En üste taşındı
COPY --from=builder /app/public ./public

# Gerekli dosyaları build aşamasından kopyala
COPY --from=builder /app/.next ./.next
# ADDED: This line to verify the .next directory content AFTER copy
RUN ls -al ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "exec", "next", "start"] 
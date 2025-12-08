FROM node:20-slim

# Install dependencies for native modules (bcrypt, sharp) and PDF generation
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
# Use npm install instead of ci to avoid lockfile platform mismatches
RUN npm install --production

# Copy source code
COPY . .

# Create invoices directory if it doesn't exist
RUN mkdir -p invoices

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]

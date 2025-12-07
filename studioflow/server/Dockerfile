FROM node:20-slim

# Install dependencies for PDF generation (if needed via puppeteeer or canvas, though pdfkit usually pure js)
# If using strict alpine, might miss some fonts. Slim is safer for Node apps generating visuals.
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create invoices directory if it doesn't exist (for local temp storage)
RUN mkdir -p invoices

# Environment variables should be provided by Railway
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]

FROM node:20-alpine

WORKDIR /app

# Copy root and workspace package.json files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages ./packages

# Install dependencies (including devDependencies for ts-node-dev)
RUN npm install

# Command will run through workspace
CMD ["npm", "run", "dev:api"]

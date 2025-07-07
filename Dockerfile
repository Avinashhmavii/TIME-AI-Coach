# Use official Node.js LTS image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --production=false

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the port the app runs on
EXPOSE 9002

# Set environment variables (if needed)
# ENV NODE_ENV=production

# Start the Next.js app
CMD ["npm", "run", "start", "--", "-p", "9002"] 
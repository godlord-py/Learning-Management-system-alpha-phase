# Use the official Node.js image as the base image
FROM --platform=$BUILDPLATFORM node:18-alpine as base
WORKDIR /app
COPY package.json ./
EXPOSE 3000

# Production stage
FROM base as production
ENV NODE_ENV=production
RUN npm install
COPY . .
CMD ["node", "app.js"]

# Development stage
FROM base as dev
ENV NODE_ENV=development
RUN npm install -g nodemon
COPY . .
CMD ["nodemon", "app.js"]

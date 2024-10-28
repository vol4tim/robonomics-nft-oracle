FROM node:20.10-alpine3.18
WORKDIR /app
COPY package*.json ./
RUN npm update -g npm
RUN npm install
#RUN npm ci --no-audit --maxsockets 1
COPY dist ./dist
RUN mkdir -p ./config
EXPOSE 3001
CMD [ "npm", "start"]

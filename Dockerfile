FROM node:11 as build-stage
WORKDIR /app
COPY package*.json ./
# RUN npm cache clean --force
RUN npm install
COPY . .
# RUN npm rebuild node-sass --force
RUN npm run build

FROM httpd:alpine as production-stage
COPY --from=build-stage /app/dist/ /usr/local/apache2/htdocs/

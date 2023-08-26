FROM node:alpine

WORKDIR /app

COPY ["package.json", "package-lock.json", "./"]

RUN npm ci
COPY . .

RUN npm run build
# RUN npx patch-package

CMD ["npm", "run", "start:dist"]
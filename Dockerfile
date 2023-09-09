FROM node:18 as build
RUN npm install -g degit
WORKDIR /code
RUN npx degit rpgjs/starter rpg
WORKDIR /code/rpg
RUN npm install
ENV RPG_TYPE=rpg
# RUN npm run dev

# RUN git clone https://github.com/RSamaium/RPG-JS.git # https://github.com/vulpes-games/RPG-JS.git
# WORKDIR /RPG-JS
# RUN npm i
# ENV NODE_ENV=production
# RUN npm run build
# RUN ls -lah

# # FROM node:18-alpine
# # WORKDIR /game
# # COPY --from=build /build/dist ./
# # COPY --from=build /build/package*.json ./
# # ENV NODE_ENV=production
# # RUN npm i
# EXPOSE 3000
# CMD node server

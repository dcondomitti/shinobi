FROM mhart/alpine-node:8
WORKDIR /opt/shinobi
RUN apk add --update --no-cache ffmpeg python pkgconfig cairo-dev make g++ jpeg-dev pango pango-dev
COPY package.json /opt/shinobi
RUN npm install && npm install canvas
COPY . /opt/shinobi
VOLUME ["/opt/shinobi/videos"]
EXPOSE 8080
ENTRYPOINT ["/opt/shinobi/docker-entrypoint.sh" ]
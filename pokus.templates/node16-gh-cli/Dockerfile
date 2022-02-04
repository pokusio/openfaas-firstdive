# -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- #
# -+-+- #       POKUS
# -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- #
#
#  -> Ok, faas-cli up command does not change the docker base image.
#  -> now, if i look at project structure generation process, I
#     understand that i need to create a new OpenFAAS template
#
#  https://erwinstaal.nl/posts/creating-a-simple-openfaas-template/
#
# -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- # -+-+- #


FROM --platform=${TARGETPLATFORM:-linux/amd64} ghcr.io/openfaas/of-watchdog:0.9.2 as watchdog
FROM --platform=${TARGETPLATFORM:-linux/amd64} node:16-alpine as ship

ARG TARGETPLATFORM
ARG BUILDPLATFORM

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

# RUN apk --no-cache add curl ca-certificates \
#     && addgroup -S app && adduser -S -g app app

# ---
# POKUS

# ---
# Install git
RUN apk --no-cache add curl ca-certificates git git-flow \
    && addgroup -S app && adduser -S -g app app

# ---
# Install github cli

COPY install-gh-cli.gnu.linux.amd64.sh ./install-gh-cli.gnu.linux.amd64.sh
RUN chmod +x ./install-gh-cli.gnu.linux.amd64.sh && ./install-gh-cli.gnu.linux.amd64.sh
# ---
# Turn down the verbosity to default level.
ENV NPM_CONFIG_LOGLEVEL warn

RUN chmod 777 /tmp

USER app

RUN mkdir -p /home/app/function

# Wrapper/boot-strapper
WORKDIR /home/app
COPY package.json ./

# This ordering means the npm installation is cached for the outer function handler.
RUN npm i

# Copy outer function handler
COPY index.js ./

# COPY function node packages and install, adding this as a separate
# entry allows caching of npm install

WORKDIR /home/app/function
COPY function/*.json ./

RUN npm i

# COPY function files and folders
COPY function/ ./

# Run any tests that may be available
RUN npm test

# Set correct permissions to use non root user
WORKDIR /home/app/

ENV cgi_headers="true"
ENV fprocess="node index.js"
ENV mode="http"
ENV upstream_url="http://127.0.0.1:3000"

ENV exec_timeout="10s"
ENV write_timeout="15s"
ENV read_timeout="15s"

ENV prefix_logs="false"

HEALTHCHECK --interval=3s CMD [ -e /tmp/.lock ] || exit 1

CMD ["fwatchdog"]

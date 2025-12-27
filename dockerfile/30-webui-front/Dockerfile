FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/base AS build
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      npm
RUN npm install -g pnpm
WORKDIR /root/dev
COPY dev/pnpm-lock.yaml ./
RUN pnpm fetch
COPY dev/ ./
RUN pnpm install --offline
RUN pnpm vite build

FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/base
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      lighttpd \
      lighttpd-mod-openssl \
      tini
COPY src/ /
COPY --from=build /root/dev/dist/ /opt/webui/
CMD ["tini", "--", "lighttpd", "-D", "-f", "/etc/lighttpd/lighttpd.webui.conf"]

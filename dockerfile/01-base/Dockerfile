FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/debian
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get upgrade --no-install-recommends -y \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      patch
COPY src/ /
ENTRYPOINT ["/entrypoint"]

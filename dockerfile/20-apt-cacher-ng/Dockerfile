FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/base
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      apt-cacher-ng \
      tini
CMD ["tini", "--", "runuser", "-u", "apt-cacher-ng", "--", "apt-cacher-ng", \
     "-v", "-c", "/etc/apt-cacher-ng", "foreground=1"]

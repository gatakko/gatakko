FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/base
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      sssd \
      realmd \
      adcli \
      libnss-sss \
      libpam-sss \
      expect \
 && find var/lib/sss -type d -print0 \
    | tar -czf /sss.tgz -C / --no-recursion --null -T - \
 && rm -rf /var/lib/sss/*
COPY src/ /
CMD ["sssd", "-i", "--logger=stderr"]

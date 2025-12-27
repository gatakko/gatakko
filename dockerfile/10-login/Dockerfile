FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/pini
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      fonts-ipafont \
      jq \
      libnss-sss \
      libpam-sss \
      openssh-client \
      xauth \
      yad

FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/sshd
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      age \
      apache2-utils \
      ca-certificates \
      curl \
      git \
      jq \
      ldap-utils \
      less \
      openssl \
      vim-tiny

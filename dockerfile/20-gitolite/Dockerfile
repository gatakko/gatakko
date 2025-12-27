FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/sshd-base
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      ca-certificates \
      gitolite3 \
      inotify-tools \
      jq \
      msmtp
RUN adduser \
      --disabled-password \
      --home /git --no-create-home \
      --shell /bin/bash --gecos 'git repository hosting' \
      git \
 && mkdir /git \
 && chown git:git /git \
 && ln -s /git/.gitolite.rc /etc/gitolite3/gitolite.rc
COPY src/ /

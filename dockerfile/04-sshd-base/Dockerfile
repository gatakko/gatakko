FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/pini
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      openssh-server \
 && rm -f /etc/ssh/ssh_host_*_key* \
 && mkdir /etc/ssh/keys \
 && sed -i -e '/^#HostKey /{s/^#//;s|/etc/ssh/|/etc/ssh/keys/|;}' \
      /etc/ssh/sshd_config
COPY src/ /
CMD ["pini", "-c", "/usr/sbin/sshd -D -e"]

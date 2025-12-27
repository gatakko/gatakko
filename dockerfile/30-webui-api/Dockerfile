FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/base
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      git \
      gunicorn \
      libnss-sss \
      libpam-sss \
      openssh-client \
      python3-apt \
      python3-pam \
      tini
COPY src/ /
WORKDIR /opt/webui
CMD ["tini", "--", "gunicorn", "-w4", "--access-logfile", "-", "wsgi:app"]

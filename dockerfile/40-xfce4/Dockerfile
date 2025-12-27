FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/debian
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-no-languages \
 && apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get upgrade --no-install-recommends -y \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      at-spi2-core \
      ca-certificates \
      cracklib-runtime \
      dbus-x11 \
      desktop-base \
      fonts-ipafont \
      fcitx5-mozc \
      libnss-sss \
      libpam-sss \
      locales \
      mesa-utils \
      openssh-sftp-server \
      pm-utils \
      sensible-utils \
      xauth \
      xfce4 \
      xfce4-terminal
RUN sed -i \
      -e '/en_US\.UTF-8/s/^# *//' \
      -e '/ja_JP\.UTF-8/s/^# *//' \
      /etc/locale.gen \
 && locale-gen

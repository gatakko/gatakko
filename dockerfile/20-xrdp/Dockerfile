FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/login
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      x11-xserver-utils \
      xrdp \
      xorgxrdp \
 && mkdir -p /run/dbus
CMD ["pini", \
     "-c", "dbus-daemon --system --nofork", \
     "-c", "xrdp-sesman -n", \
     "-c", "xrdp -n"]

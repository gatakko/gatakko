FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/base
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      rsyslog
RUN sed -i -e '/^module(load="imklog")/s/^/#/' /etc/rsyslog.conf \
 && echo '*.* -/proc/self/fd/1' > /etc/rsyslog.d/stdout.conf
CMD ["rsyslogd", "-n", "-iNONE"]

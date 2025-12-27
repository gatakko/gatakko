FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/base
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      slapd \
 && rm -rf /etc/ldap/slapd.d/* /var/lib/ldap/* \
 && install -d -o openldap -g openldap /var/run/slapd
COPY src/ /
CMD ["slapd", "-u", "openldap", "-g", "openldap", "-d", "256", \
     "-h", "ldap:/// ldapi:///"]

FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/base
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      apache2 \
      phpldapadmin \
      tini
RUN sed -i \
      -e '/^	DocumentRoot /s|/.*|/usr/share/phpldapadmin/htdocs|' \
      -e '/^	ErrorLog /s|\$.*|/proc/self/fd/2|' \
      -e '/^	CustomLog /s|\$.*|/proc/self/fd/1 combined|' \
      /etc/apache2/sites-available/000-default.conf \
      /etc/apache2/sites-available/default-ssl.conf \
 && sed -i \
      -e '/<IfModule mod_alias\.c>/,/<\/IfModule>/s/^/#/' \
      /etc/apache2/conf-available/phpldapadmin.conf
CMD ["tini", "--", "apachectl", "-DFOREGROUND"]

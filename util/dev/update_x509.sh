#!/bin/bash
# For developers' convenience. AT YOUR OWN RISK. 
set -euCx -o pipefail

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

year=$(date +%Y)
not_before="${year}0101000000Z"
not_after="$((year + 100))0101000000Z"

## Generate CA certificate
openssl req -x509 -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -subj "/CN=Cluster Local CA" \
  -addext keyUsage=critical,keyCertSign,cRLSign \
  -addext basicConstraints=critical,CA:true \
  -addext extendedKeyUsage=serverAuth,clientAuth \
  -not_before "$not_before" \
  -not_after "$not_after" \
  -noenc -keyout "$TMP/ca.key" -out "$TMP/ca.crt"

## Generate server certificates
for CN in \
  registry.gatakko-core.svc.cluster.local \
  ldap.gatakko-core.svc.cluster.local \
  phpldapadmin.gatakko-core.svc.cluster.local \
  webui.gatakko-core.svc.cluster.local
do
  openssl req -x509 -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
    -CA "$TMP/ca.crt" -CAkey "$TMP/ca.key" \
    -subj "/CN=$CN" \
    -addext keyUsage=critical,digitalSignature,keyEncipherment \
    -addext basicConstraints=critical,CA:false \
    -addext extendedKeyUsage=serverAuth,clientAuth \
    -addext "subjectAltName=DNS:$CN" \
    -not_before "$not_before" \
    -not_after "$not_after" \
    -noenc -keyout "$TMP/${CN%%.*}.key" -out "$TMP/${CN%%.*}.crt"
done

## Generate localhost self-signed certificates
openssl req -x509 -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -subj "/CN=localhost" \
  -addext keyUsage=critical,digitalSignature,keyEncipherment \
  -addext basicConstraints=critical,CA:false \
  -addext extendedKeyUsage=serverAuth,clientAuth \
  -addext "subjectAltName=DNS:localhost" \
  -days 36500 \
  -noenc -keyout "$TMP/server.key" -out "$TMP/server.crt"

## Insert certificates into manifests
update_secret () {
  ruby -ryaml -e '
    manifest = "manifest/#{ARGV.shift}/#{ARGV.shift}.secret.yaml"
    yaml = YAML.load_file(manifest)
    ARGV.each do |filename|
      yaml["stringData"][File.basename(filename)] = File.read(filename)
    end
    File.write(manifest, YAML.dump(yaml).sub(/\A---\s*/, ""))
  ' "$@"
}

update_secret gatakko-builder cacert \
  "$TMP/ca.crt"
update_secret gatakko-core admin \
  "$TMP/ca.key"
update_secret gatakko-core cacert \
  "$TMP/ca.crt"
update_secret gatakko-core ldap \
  "$TMP/ldap.crt" \
  "$TMP/ldap.key"
update_secret gatakko-core phpldapadmin \
  "$TMP/phpldapadmin.crt" \
  "$TMP/phpldapadmin.key"
update_secret gatakko-core registry \
  "$TMP/registry.crt" \
  "$TMP/registry.key"
update_secret gatakko-core webui \
  "$TMP/webui.crt" \
  "$TMP/webui.key"
update_secret gatakko-user tls \
  "$TMP/server.crt" \
  "$TMP/server.key"

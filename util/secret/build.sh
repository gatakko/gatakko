#!/bin/bash
set -euCx -o pipefail

if [[ -z ${__IN_K8S_CONTAINER__+defined} ]]; then
  : ${POD_NAME:=util-secret-build}
  kubectl create -f - <<END
apiVersion: v1
kind: Pod
metadata:
  name: $POD_NAME
  namespace: gatakko-core
spec:
  restartPolicy: Never
  imagePullSecrets:
  - name: regcred
  serviceAccountName: admin
  containers:
  - name: admin
    image: localhost:30500/gatakko/admin
    command: [pini, -c, "perl -e sleep"]
    env:
    - name: __IN_K8S_CONTAINER__
    workingDir: /root
END
  trap 'kubectl delete -n gatakko-core pod/"$POD_NAME"' EXIT
  kubectl wait --for=condition=Ready -n gatakko-core pod/"$POD_NAME"
  kubectl cp "$0" gatakko-core/"$POD_NAME":/
  kubectl exec -n gatakko-core "$POD_NAME" -- bash /build.sh "$@"
  exit
fi

make_secret () {
  kubectl get secret -o json -n "$1" "$2" >| secret.json || return 0
  set +x
  shift 2
  for i; do
    jq -cRs --arg name "${i##*/}" '{data:{($name):.|@base64}}' "$i"
  done >> secret.json
  jq -s '
    (map(.data) | add) as $data
    | .[0]
    | {apiVersion, kind, metadata:.metadata|{name, namespace}, type, data:$data}
  ' secret.json >> result.json
  set -x
}

## Generate CA certificate
openssl req -x509 -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -subj "/CN=Cluster Local CA" \
  -addext keyUsage=critical,keyCertSign,cRLSign \
  -addext basicConstraints=critical,CA:true \
  -addext extendedKeyUsage=serverAuth,clientAuth \
  -days 395 \
  -noenc -keyout ca.key -out ca.crt

## Generate server certificates
for CN in \
  registry.gatakko-core.svc.cluster.local \
  ldap.gatakko-core.svc.cluster.local \
  phpldapadmin.gatakko-core.svc.cluster.local \
  webui.gatakko-core.svc.cluster.local
do
  NAME=${CN%%.*}
  openssl req -x509 -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
    -CA ca.crt -CAkey ca.key \
    -subj "/CN=$CN" \
    -addext keyUsage=critical,digitalSignature,keyEncipherment \
    -addext basicConstraints=critical,CA:false \
    -addext extendedKeyUsage=serverAuth,clientAuth \
    -addext "subjectAltName=DNS:$CN" \
    -days 40 \
    -noenc -keyout "$NAME.key" -out "$NAME.crt"
done

## Generate Docker registry's password
openssl rand -base64 12 | jq -Rj . > REGISTRY_PASSWORD
htpasswd -c -i -B htpasswd admin < REGISTRY_PASSWORD

## Generate registry credential
jq -cRs --arg host localhost:30500 \
  '{auths:{($host):{auth:("admin:"+.|@base64)}}}' \
  REGISTRY_PASSWORD > .dockerconfigjson
jq -cRs --arg host registry.gatakko-core.svc.cluster.local:5000 \
  '{auths:{($host):{auth:("admin:"+.|@base64)}}}' \
  REGISTRY_PASSWORD > config.json

## Generate apt-proxy password
openssl rand -base64 12 | jq -Rj '"admin:\(.)"' > admin_auth

## Generate LDAP passwords
openssl rand -base64 12 | jq -Rj . > LDAP_ADMIN_PASSWORD
openssl rand -base64 12 | jq -Rj . > LDAP_SSS_DN_PASSWORD

## Generate git's SSH host key
mkdir git
ssh-keygen -q -t ed25519 -C git -P '' -f git/ssh_host_ed25519_key

echo -n 'git.gatakko-core.svc.cluster.local ' > known_hosts
sed 's/ *git$//' git/ssh_host_ed25519_key.pub >> known_hosts

## Generate sshd host keys
mkdir sshd
ssh-keygen -q -t ecdsa -C sshd -P '' -f sshd/ssh_host_ecdsa_key
ssh-keygen -q -t ed25519 -C sshd -P '' -f sshd/ssh_host_ed25519_key
ssh-keygen -q -t rsa -b 2048 -C sshd -P '' -f sshd/ssh_host_rsa_key

## Generate internal SSH client keys
ssh-keygen -q -t ed25519 -C login -P '' -f login
ssh-keygen -q -t ed25519 -C admin -P '' -f admin
ssh-keygen -q -t ed25519 -C webui -P '' -f webui

## Generate secrets
make_secret gatakko-builder buildkit \
  config.json
make_secret gatakko-builder cacert \
  ca.crt
make_secret gatakko-builder regcred \
  .dockerconfigjson
make_secret gatakko-core admin \
  admin \
  ca.key
make_secret gatakko-core apt-proxy \
  admin_auth
make_secret gatakko-core cacert \
  ca.crt
make_secret gatakko-core git-host-key \
  git/ssh_host_ed25519_key \
  git/ssh_host_ed25519_key.pub
make_secret gatakko-core git \
  admin.pub \
  login.pub \
  webui.pub
make_secret gatakko-core ldap-env \
  LDAP_ADMIN_PASSWORD \
  LDAP_SSS_DN_PASSWORD
make_secret gatakko-core ldap \
  ldap.crt \
  ldap.key
make_secret gatakko-core phpldapadmin \
  phpldapadmin.crt \
  phpldapadmin.key
make_secret gatakko-core regcred \
  .dockerconfigjson
make_secret gatakko-core registry \
  registry.crt \
  registry.key \
  htpasswd
make_secret gatakko-core webui \
  webui.crt \
  webui.key
make_secret gatakko-core webui-ssh \
  webui \
  known_hosts
make_secret gatakko-user opt-session-ssh \
  login \
  known_hosts
make_secret gatakko-user regcred \
  .dockerconfigjson
make_secret gatakko-user sshd-host-keys \
  sshd/ssh_host_ecdsa_key \
  sshd/ssh_host_ecdsa_key.pub \
  sshd/ssh_host_ed25519_key \
  sshd/ssh_host_ed25519_key.pub \
  sshd/ssh_host_rsa_key \
  sshd/ssh_host_rsa_key.pub

## Apply the changes in secrets
kubectl apply -f result.json

## Restart pods
kubectl rollout restart -n gatakko-core \
  daemonset/sssd \
  deployment/git \
  deployment/ldap \
  deployment/phpldapadmin \
  deployment/registry \
  deployment/webui || :
kubectl rollout restart -n gatakko-user \
  daemonset/lightdm \
  daemonset/sshd \
  daemonset/xrdp || :

## Notice
set +x
echo 1>&2
echo '*** NOTE: rebuild flavors to apply the updated CA certificate.' 1>&2
echo 1>&2

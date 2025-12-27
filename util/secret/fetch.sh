#!/bin/bash
set -euCx -o pipefail

if [[ -z ${__IN_K8S_CONTAINER__+defined} ]]; then
  : ${POD_NAME:=util-secret-fetch}
  kubectl create -f - <<END 1>&2
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
  trap 'kubectl delete -n gatakko-core pod/"$POD_NAME" 1>&2' EXIT
  kubectl wait --for=condition=Ready -n gatakko-core pod/"$POD_NAME" 1>&2
  kubectl cp "$0" gatakko-core/"$POD_NAME":/
  [[ ! -f .agepub ]] || kubectl cp .agepub gatakko-core/"$POD_NAME":/root
  kubectl exec -n gatakko-core "$POD_NAME" -- bash /fetch.sh "$@"
  exit
fi

FORCE=
while getopts f i; do
  case "$i" in
    f) FORCE=yes ;;
    *) echo "unknown option -$i" 1>&2 && exit 1 ;;
  esac
done
shift $(($OPTIND - 1))

get_secret () {
  kubectl get secret -o json -n "$1" "$2" > "$1.$2.json" || return 0
  local sum1
  local sum2
  jq '{apiVersion, kind, metadata:.metadata|{name, namespace}, type, data}' \
    "$1.$2.json" > "$1.$2"
  sum1=$(jq -r '.metadata.annotations."util-secret-fetch"//""' "$1.$2.json")
  sum2=$(sha256sum "$1.$2")
  if [[ -n $FORCE || $sum1 != $sum2 ]]; then
    mkdir -p "secret/$1"
    age -e -a -R .agepub -o "secret/$1/$2.secret.yaml.age" "$1.$2"
    kubectl annotate -n "$1" secret "$2" --overwrite "util-secret-fetch=$sum2" \
      1>&2
  fi
}

if [[ ! -f .agepub ]]; then
  age-keygen -o .agekey
  age-keygen -y -o .agepub .agekey
fi

get_secret gatakko-builder buildkit
get_secret gatakko-builder cacert
get_secret gatakko-builder regcred
get_secret gatakko-core admin
get_secret gatakko-core apt-proxy
get_secret gatakko-core cacert
get_secret gatakko-core git
get_secret gatakko-core git-host-key
get_secret gatakko-core git-msmtprc
get_secret gatakko-core ldap
get_secret gatakko-core ldap-env
get_secret gatakko-core phpldapadmin
get_secret gatakko-core regcred
get_secret gatakko-core registry
get_secret gatakko-core webui
get_secret gatakko-core webui-ssh
get_secret gatakko-user opt-session-ssh
get_secret gatakko-user regcred
get_secret gatakko-user sshd-host-keys
get_secret gatakko-user tls

if [[ ! -d secret ]]; then
  tar -zcf - -T /dev/null | base64
elif [[ -f .agekey ]]; then
  tar -zcf - .agekey .agepub secret | base64
else
  tar -zcf - secret | base64
fi

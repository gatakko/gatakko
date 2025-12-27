#!/bin/bash
set -euCx -o pipefail

if [[ -z ${__IN_K8S_CONTAINER__+defined} ]]; then
  kubectl wait --for=condition=Ready -n gatakko-core -l app=ldap pod
  : ${POD_NAME:=util-ldap-build}
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
  kubectl cp "$(dirname "$0")" gatakko-core/"$POD_NAME":/root/ldap
  kubectl exec -n gatakko-core "$POD_NAME" -- bash /root/ldap/build.sh "$@"
  exit
fi

with_template () {
  eval $'shift 1; "$@" <<__END__\n'"$(<"$1")"$'\n__END__'
}

kubectl get secret -o json -n gatakko-core cacert \
| jq -j '.data."ca.crt"|@base64d' > ca.crt
export LDAPTLS_CACERT="$HOME/ca.crt"

kubectl get secret -o json -n gatakko-core ldap-env \
| jq -j '.data.LDAP_ADMIN_PASSWORD|@base64d' > LDAP_ADMIN_PASSWORD
chmod 600 LDAP_ADMIN_PASSWORD
LDAP_ADMIN_PASSWORD=$(<LDAP_ADMIN_PASSWORD)

kubectl get configmap -o json -n gatakko-core ldap-env \
| jq -r '.data.LDAP_BASE_DN' > LDAP_BASE_DN
LDAP_BASE_DN=$(<LDAP_BASE_DN)

ls ldap \
| awk '/\.ldif$/ {c=$0; gsub("[^,]", "", c); print length(c)" "$0}' \
| sort -k1 -n \
| sed 's/^[0-9]* //' > ldap_files

for LDIF in $(<ldap_files); do
  DN="${LDIF%.ldif},$LDAP_BASE_DN"

  ldapsearch -ZZ -H ldap://ldap.gatakko-core.svc.cluster.local \
    -D "cn=admin,$LDAP_BASE_DN" -y LDAP_ADMIN_PASSWORD \
    -b "$DN" -LLL dn > /dev/null \
  && continue

  with_template "ldap/$LDIF" \
    ldapadd -ZZ -H ldap://ldap.gatakko-core.svc.cluster.local \
    -D "cn=admin,$LDAP_BASE_DN" -y LDAP_ADMIN_PASSWORD
done

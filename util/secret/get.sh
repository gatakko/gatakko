#!/bin/bash
set -euC -o pipefail

if [[ -z ${__IN_K8S_CONTAINER__+defined} ]]; then
  : ${POD_NAME:=util-secret-get}
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
  kubectl exec -n gatakko-core "$POD_NAME" -- bash /get.sh "$@"
  exit
fi

kubectl get secret -n gatakko-core admin -o json > admin.json
jq -rj '.data.admin|@base64d' admin.json > admin
chmod 600 admin

if kubectl get secret -n gatakko-core ldap-env -o json > ldap-env.json; then
  jq -rj '.data.LDAP_ADMIN_PASSWORD|@base64d' ldap-env.json > PASSWORD
else
  openssl rand -base64 12 | jq -Rj . > PASSWORD
fi

set +x
TMP=$(mktemp)
echo '#!/bin/sh' >> "$TMP"
echo 'cat PASSWORD' >> "$TMP"
chmod +x "$TMP"
DISPLAY=dummy:0 SSH_ASKPASS="$TMP" ssh-keygen -q -p -P '' -f admin 1>&2

echo 1>&2
echo "admin's password: $(<PASSWORD)" 1>&2
echo 1>&2
cat admin

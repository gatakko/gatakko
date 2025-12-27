#!/bin/bash
set -euCx -o pipefail

if [[ -z ${__IN_K8S_CONTAINER__+defined} ]]; then
  kubectl wait --for=condition=Ready -n gatakko-core -l app=git pod
  : ${POD_NAME:=util-flavor-build}
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
  kubectl cp "$(dirname "$0")" gatakko-core/"$POD_NAME":/root/flavor
  kubectl exec -n gatakko-core "$POD_NAME" -- bash /root/flavor/build.sh "$@"
  exit
fi

mkdir -p .ssh /gitkey /script
chmod 700 .ssh /gitkey
echo IdentitiesOnly yes > .ssh/ssh_config
echo StrictHostKeyChecking yes >> .ssh/ssh_config
kubectl get secret -n gatakko-core git-host-key -o json \
| jq -r --arg host git.gatakko-core.svc.cluster.local \
    '.data["ssh_host_ed25519_key.pub"]|@base64d|"\($host) \(.)"' \
    > .ssh/known_hosts
kubectl get secret -n gatakko-core admin -o json \
| jq -r '.data["admin"]|@base64d' > .ssh/id_ed25519
kubectl get secret -n gatakko-core git -o json \
| jq -r '.data["sign"]|@base64d' > /gitkey/sign
kubectl get cm -n gatakko-core git-script -o json \
| jq -r '.data["sign-manifest"]' > /script/sign-manifest
chmod 600 .ssh/id_ed25519 /gitkey/sign
chmod 700 /script/sign-manifest

git config --global init.defaultBranch main
git config --global user.name admin
git config --global user.email admin@cluster.local

git clone git@git.gatakko-core.svc.cluster.local:gitolite-admin
(
  cd gitolite-admin
  if ! grep -E -q '^repo +flavor' conf/gitolite.conf; then
    {
      echo
      echo 'repo flavor(/[0-9A-Za-z][0-9A-Za-z_-]*)*$'
      echo '    C       =   @all'
      echo '    RW+     =   CREATOR'
      echo '    RW      =   WRITERS webui'
      echo '    R       =   READERS'
    } >> conf/gitolite.conf
    git add conf/gitolite.conf
    git commit -m 'add repo flavor'
  fi
  git push
)

for DIR in flavor/*/; do
  NAME=${DIR#flavor/}
  NAME=${NAME%/}
  NAME=${NAME//__//}
  TMP=$(mktemp -d)
  git clone -n --depth=1 git@git.gatakko-core.svc.cluster.local:"$NAME" "$TMP"
  cp -a "$DIR/." "$TMP"
  if [[ $(jq 'has("patch")' "$DIR/manifest.json") = true ]]; then
    SIGN=$(/script/sign-manifest "$NAME" < "$DIR/manifest.json")
    jq --arg sign "$SIGN" '. + {sign:$sign}' \
      < "$DIR/manifest.json" >| "$TMP/manifest.json"
  fi
  (
    cd "$TMP"
    git add .
    if ! git diff --quiet --cached; then
      git commit -m update
      git push
    fi
  )
  rm -rf "$TMP"
done

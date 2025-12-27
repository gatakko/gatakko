#!/bin/bash

if [[ $$ -eq 1 ]]; then
  "$0" "$@" &
  trap 'kill $!; wait; exit 127' INT TERM
  wait
  exit $?
fi

set -euCx -o pipefail
cd "$(dirname "$0")"

if [[ ! -f 02-kubectl/kubectl.tgz || -L 02-kubectl/kubectl.tgz ]]; then
  DIR=$(kubectl version -o json | jq -r '
    .serverVersion
    | [(.gitVersion|sub("\\+.*$"; "")), "/bin/", .platform]
    | join("")
  ')
  if [[ ! -f 02-kubectl/kubectl.${DIR////_}.tgz ]]; then
    curl -L -o 02-kubectl/kubectl "https://dl.k8s.io/release/$DIR/kubectl"
    chmod 755 02-kubectl/kubectl
    (cd 02-kubectl && tar -cf - kubectl | gzip -n9 > "kubectl.${DIR////_}.tgz")
    rm 02-kubectl/kubectl
  fi
  ln -sf "kubectl.${DIR////_}.tgz" 02-kubectl/kubectl.tgz
fi

: ${POD_NAME:=buildkit-build-images}

kubectl create -f - <<END
apiVersion: v1
kind: Pod
metadata:
  name: "$POD_NAME"
  namespace: gatakko-builder
spec:
  restartPolicy: Never
  containers:
  - name: buildkit
    image: docker.io/moby/buildkit:rootless
    env:
    - name: APT_PROXY
      value: "${APT_PROXY:-}"
    securityContext:
      privileged: true
      runAsNonRoot: true
    resources:
      requests:
        cpu: 1000m
        memory: 2Gi
      limits:
        cpu: 2000m
        memory: 16Gi
    volumeMounts:
    - mountPath: /home/user/.config/buildkit
      name: buildkit-config
    - mountPath: /home/user/.docker
      name: buildkit-secret
    - mountPath: /cacert
      name: cacert
    - mountPath: /home/user/.local/share/buildkit
      name: buildkit-cache
  volumes:
  - name: buildkit-config
    configMap:
      name: buildkit
  - name: buildkit-secret
    secret:
      secretName: buildkit
  - name: cacert
    secret:
      secretName: cacert
  - name: buildkit-cache
    emptyDir:
      sizeLimit: 16Gi
END
trap 'kubectl delete -n gatakko-builder "pod/$POD_NAME"' EXIT

kubectl wait --for=condition=Ready -n gatakko-builder "pod/$POD_NAME"
kubectl cp . "gatakko-builder/$POD_NAME:/home/user/dockerfile"

FLAGS=
[[ -t 0 && -t 1 ]] && FLAGS=-it
kubectl exec $FLAGS -n gatakko-builder "$POD_NAME" -- sh -c '
  REGISTRY=registry.gatakko-core.svc.cluster.local:5000
  cd ~/dockerfile
  [ "$#" -gt 0 ] || set -- $(echo *) ""
  set -ex
  for DIR; do
    [ -d "${DIR:-.}" ] || continue
    ID=${DIR#*-}
    ID="$REGISTRY/gatakko/${ID:-build-images}"
    [ -r "${DIR:-.}/init.sh" ] && (cd "${DIR:-.}" && . ./init.sh && rm init.sh)
    buildctl \
      --wait \
      build \
      --frontend dockerfile.v0 \
      --local "context=./$DIR" \
      --local "dockerfile=./$DIR" \
      --opt "build-arg:http_proxy=$APT_PROXY" \
      --output "type=image,name=$ID:latest,compression=estargz,push=true" \
      --import-cache "type=registry,ref=$ID:cache" \
      --export-cache "type=registry,ref=$ID:cache,mode=max,compression=estargz"
  done
' build.sh "$@"

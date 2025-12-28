#!/usr/bin/env bash
set -euC

ROOT=$(dirname "$0")/..
SITE=site
COMPONENTS=()

usage () {
  echo "usage: $0 [-d destination_dir] [-c component]" 1>&2
  exit 1
}

while getopts c:d i; do
  case "$i" in
    c) COMPONENTS+=("$OPTARG") ;;
    d) SITE=$OPTARG ;;
    *) usage ;;
  esac
done
shift $(($OPTIND - 1))
[[ $# -eq 0 ]] || usage

echo "*** Checking namespaces" 1>&2
NS=$(kubectl get namespaces -o name)
if grep '^namespace/gatakko-' <<<"$NS" 1> /dev/null 2>&1; then
  echo "Gatakko is already installed. stop."
  exit 1
fi

echo "*** Creating directory overlay/$SITE" 1>&2
mkdir "overlay/$SITE"

echo "*** Creating overlay/$SITE/kustomization.yaml" 1>&2
{
  echo 'apiVersion: kustomize.config.k8s.io/v1beta1'
  echo 'kind: Kustomization'
  echo 'resources:'
  echo '- ../../manifest'
  if [[ -n "${COMPONENTS[*]}" ]]; then
    echo 'components:'
    for i in "${COMPONENTS[@]}"; do
      echo "- ../../component/$i"
    done
  fi
} > "overlay/$SITE/kustomization.yaml"

echo "*** Applying overlay/$SITE to Kubernetes cluster" 1>&2
kubectl apply -k "overlay/$SITE"

echo "*** Building container images" 1>&2
"$BASH" "$ROOT/dockerfile/build.sh"

echo "*** Waiting for registry to be ready" 1>&2
kubectl wait pod --for=condition=Ready -n gatakko-core -l app=registry
kubectl wait pod --for=condition=Ready -n gatakko-core -l app=apt-proxy

echo "*** Generating secrets" 1>&2
"$BASH" "$ROOT/util/secret/build.sh"

echo "*** Fetching new secrets" 1>&2
"$BASH" "$ROOT/util/secret/fetch.sh" -f \
| (cd "overlay/$SITE" && base64 -d | tar -zxf -)
chmod go-x "overlay/$SITE/.agekey"
{
  echo '- ../../component/without-secret'
  echo '- ./secret'
} >> "overlay/$SITE/kustomization.yaml"
cat <<END > "overlay/$SITE/secret/kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component
generators:
- |-
  apiVersion: gatakko.github.io/v1
  kind: Decrypt
  metadata:
    name: decrypt
    annotations:
      config.kubernetes.io/function: |
        exec:
          path: ../../../component/secret/decrypt.rb
  privateKeyFile: ../.agekey
  directories:
  - gatakko-builder
  - gatakko-core
  - gatakko-user
END

echo "*** Waiting for all pods to be ready" 1>&2
kubectl wait pod --all --for=condition=Ready -n gatakko-core
kubectl wait pod --all --for=condition=Ready -n gatakko-user

if [[ ! " ${COMPONENTS[*]} " =~ [[:space:]]without-ldap[[:space:]] ]]; then
  echo "*** Creating users and groups" 1>&2
  "$BASH" "$ROOT/util/ldap/build.sh"
fi

echo "*** Creating desktop environment images" 1>&2
"$BASH" "$ROOT/util/flavor/build.sh"

echo "*** Waiting for desktop environment images to be ready" 1>&2
POD=$(kubectl get pod -n gatakko-core -l app=git -o name)
while :; do
  STATUS=$(kubectl exec -n gatakko-core "$POD" -c gitolite \
             -- su - git -c "/script/command-job-status -h flavor")
  grep '^Status:' <<<"$STATUS" > /dev/null 2>&1 && break
  sleep 10
done

echo "*** Getting admin account password and SSH private key" 1>&2
"$BASH" "$ROOT/util/secret/get.sh"

echo "*** All done!" 1>&2

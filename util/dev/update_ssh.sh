#!/bin/bash
# For developers' convenience. AT YOUR OWN RISK. 
set -euCx -o pipefail

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

## Generate git's SSH host key
mkdir "$TMP/git"
ssh-keygen -q -t ed25519 -C root@git -P '' -f "$TMP/git/ssh_host_ed25519_key"

echo -n 'git.gatakko-core.svc.cluster.local ' > "$TMP/known_hosts"
sed 's/ *root@git$//' "$TMP/git/ssh_host_ed25519_key.pub" >> "$TMP/known_hosts"

## Generate sshd host keys
mkdir "$TMP/sshd"
ssh-keygen -q -t ecdsa -C root@sshd -P '' -f "$TMP/sshd/ssh_host_ecdsa_key"
ssh-keygen -q -t ed25519 -C root@sshd -P '' -f "$TMP/sshd/ssh_host_ed25519_key"
ssh-keygen -q -t rsa -b 2048 -C root@sshd -P '' -f "$TMP/sshd/ssh_host_rsa_key"

## Generate internal SSH client keys
ssh-keygen -q -t ed25519 -C login -P '' -f "$TMP/login"
ssh-keygen -q -t ed25519 -C admin -P '' -f "$TMP/admin"
ssh-keygen -q -t ed25519 -C webui -P '' -f "$TMP/webui"
ssh-keygen -q -t ed25519 -C sign -P '' -f "$TMP/sign"

## Insert certificates into manifests
update_secret () {
  ruby -ryaml -e '
    manifest = "manifest/#{ARGV.shift}/#{ARGV.shift}.secret.yaml"
    yaml = YAML.load_file(manifest)
    ARGV.each do |filename|
      yaml["stringData"][File.basename(filename)] = File.read(filename)
    end
    parser = YAML::Parser.new(YAML::TreeBuilder.new).parse(YAML.dump(yaml))
    parser.handler.root.grep(YAML::Nodes::Scalar) do |node|
      node.style = YAML::Nodes::Scalar::LITERAL if node.value.include?("\n")
    end
    File.write(manifest, parser.handler.root.to_yaml.sub(/\A---\s*/, ""))
  ' "$@"
}

update_secret gatakko-core admin \
  "$TMP/admin"
update_secret gatakko-core git-host-key \
  "$TMP/git/ssh_host_ed25519_key" \
  "$TMP/git/ssh_host_ed25519_key.pub"
update_secret gatakko-core git \
  "$TMP/admin.pub" \
  "$TMP/login.pub" \
  "$TMP/webui.pub" \
  "$TMP/sign.pub" \
  "$TMP/sign"
update_secret gatakko-core webui-ssh \
  "$TMP/webui" \
  "$TMP/known_hosts"
update_secret gatakko-user opt-session-ssh \
  "$TMP/login" \
  "$TMP/known_hosts"
update_secret gatakko-user sshd-host-keys \
  "$TMP/sshd/ssh_host_ecdsa_key" \
  "$TMP/sshd/ssh_host_ecdsa_key.pub" \
  "$TMP/sshd/ssh_host_ed25519_key" \
  "$TMP/sshd/ssh_host_ed25519_key.pub" \
  "$TMP/sshd/ssh_host_rsa_key" \
  "$TMP/sshd/ssh_host_rsa_key.pub"

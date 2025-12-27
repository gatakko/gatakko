cp -a ../04-sshd-base/* .
sed -i -e '1c\
FROM registry.gatakko-core.svc.cluster.local:5000/gatakko/login
' Dockerfile

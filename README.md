# Gatakko

Gatakko is a Debian-based Linux remote desktop environment system
built on top of Kubernetes.

It was developed as a research project within the Faculty of Engineering
at Niigata University to provide students with desktop environments
tailored for various lectures and exercises in information engineering.

## Getting Started

### Quick Installation

To try Gatakko locally, follow these steps:

1. Set up a Kubernetes cluster using a lightweight distribution such as
   k3s, microk8s, or minikube.

2. Apply Gatakko manifests to the Kubernetes cluster:
   ```sh
   kubectl apply -k overlay/dev
   ```

3. Wait until the `registry` pod in the `gatakko-core` namespace becomes ready.

4. Build container images:
   ```sh
   dockerfile/build.sh
   ```

5. Wait until all pods in the `gatakko-core` and `gatakko-user` namespaces
   are running.

6. Refresh passwords and private keys:
   ```sh
   util/secret/build.sh
   ```

7. Set up default desktop environments:
   ```sh
   util/flavor/build.sh
   ```

8. Create user accounts and groups:
   ```sh
   util/ldap/build.sh
   ```

9. Obtain the `admin` account password:
   ```sh
   util/secret/get.sh
   ```

10. Wait until all pods in the `gatakko-builder` namespace have terminated
    (indicating desktop image build completion).

After completing the setup, the following ports are exposed on each
Kubernetes node:

| Protocol | Port  | Purpose |
|----------|-------|---------|
| TCP      | 30022 | SSH     |
| TCP      | 30389 | RDP     |
| TCP      | 30590 | VNC     |

### Connecting to Remote Desktop Environment

1. Install an RDP or VNC client on your PC.
2. Connect to the Kubernetes node using port `30389` (RDP) or `30590` (VNC).
3. Log in with the username `admin` and the password you obtained earlier.
4. Select the `master` image from the startup menu to start your desktop
   session.

## Administration

The following web interfaces are available within the cluster
for administration:

* LDAP user account management (phpLDAPadmin):
  * URL: `https://phpldapadmin.gatakko-core.svc.cluster.local`
  * Login DN: `cn=admin,dc=cluster,dc=local`
  * Password: `admin` account password
* Desktop image management (webui):
  * URL: `https://webui.gatakko-core.svc.cluster.local`
  * Username: `admin`
  * Password: `admin` account password

# License

BSD-3-Clause

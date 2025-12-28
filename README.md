# Gatakko

Gatakko is a Debian-based Linux remote desktop environment system
built on top of Kubernetes.

It was developed as a research project within the Faculty of Engineering
at Niigata University to provide students with desktop environments
tailored for various lectures and exercises in information engineering.

## Getting Started

### Quick Installation

To quickly set up Gatakko locally, follow these steps:

1. Set up a single-node Kubernetes cluster using a lightweight distribution
   such as k3s, microk8s, or minikube.

2. Run the install script:
   ```sh
   util/install.sh -c single-node -c node-port
   ```

   The `-c` option applies Kustomize components.
   The following components are available:

   | Component | Description |
   |-----------|-------------|
   | `haproxy` | Use HAProxy to offer all services within a single IP address |
   | `http-registry` | Use HTTP to access built-in container image registry |
   | `node-port` | Use NodePort instead of LoadBalancer |
   | `single-node` | Create all PVs with ReadWriteOnce access mode |
   | `without-ldap` | Remove built-in LDAP server |

After the setup completes, `install.sh` will display the `admin` account
password and the SSH private key for `admin`.

The following ports will be exposed on the Kubernetes node:

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

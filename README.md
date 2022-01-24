# Toc

* Create the (Pokus) TLS Certificate and deploy private docker registry
* create the `Kubernetes` Cluster : the tls cert is required to create the cluster (so that the cert signing authority is trusted by `Kubernetes` cluster nodes, and docker pull from `Kubernetes` cluster images from the docker private registry )
* deploy `OpenFAAS` with `Helm`
* develop a cloud function (a `faas` function) and deploy it.

## Create the (Pokus) TLS Certificate and deploy private docker registry

* In an empty folder, run :

```bash
export DOCKHOST_IP_ADDR="192.168.208.7"
# auth/htpasswd (generated with `docker run --entrypoint htpasswd registry:2 -Bbn testuser testpassword`)
# testuser:$2y$05$Bl9siDMe7ieQHLM8e7ifaOklKrHmXymbMqfmqXs7zssj6MMGQW4le
export OCI_ADMIN_USERNAME="ociadmin"
export OCI_ADMIN_PASSWORD="ociadmin123"

export BASIC_AUTH_SECRET=$(docker run --name pokus_htpasswd --rm --entrypoint htpasswd httpd:2 -Bbn ${OCI_ADMIN_USERNAME} ${OCI_ADMIN_PASSWORD})

echo "# --------------------------------------------- #"
echo "    basic auth secret = [${BASIC_AUTH_SECRET}]"
echo "# --------------------------------------------- #"

mkdir -p ./oci-registry/auth/
mkdir -p ./oci-registry/data/
mkdir -p ./oci-registry/letsencrypt/
mkdir -p ./oci-registry/certs/

echo "${BASIC_AUTH_SECRET}" > ./oci-registry/auth/htpasswd



cat << EOF > ./oci-registry/certs/pokus.conf
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
[req_distinguished_name]
C = FR
ST = Auvergne
L = SomeCity
O = pokus
OU = devopspokus
CN = ${DOCKHOST_IP_ADDR}
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = IP:${DOCKHOST_IP_ADDR}
[alt_names]
DNS.1 = ${DOCKHOST_IP_ADDR}
EOF


# openssl req -new -x509 -text -key client.key -out client.cert -keyout ./oci-registry/certs/pokus.key -x509 -days 365 -out ./oci-registry/certs/pokus.cert -config ./oci-registry/certs/pokus.conf

openssl req  -newkey rsa:4096 -nodes -sha256 -keyout ./oci-registry/certs/pokus.key -x509 -days 365 -out ./oci-registry/certs/pokus.crt -config ./oci-registry/certs/pokus.conf

# https://blog.container-solutions.com/adding-self-signed-registry-certs-docker-mac
# https://stackoverflow.com/questions/40822912/where-to-add-client-certificates-for-docker-for-mac
mkdir -p ~/.docker/certs.d/192.168.208.7:5000/
cp -f ./oci-registry/certs/pokus.crt ~/.docker/certs.d/${DOCKHOST_IP_ADDR}:5000/pokus.crt
cp -f ./oci-registry/certs/pokus.key ~/.docker/certs.d/${DOCKHOST_IP_ADDR}:5000/pokus.key
cp -f ./oci-registry/certs/pokus.crt ~/.docker/certs.d/${DOCKHOST_IP_ADDR}:5000/pokus.cert

# -> below is for mac os, see next comments for GNU/Linux Debian
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./oci-registry/certs/pokus.crt
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/.docker/certs.d/${DOCKHOST_IP_ADDR}:5000/pokus.cert

cat << EOF > ./oci-registry/docker-compose.yml
version: '2'

services:

  registry:
    restart: always
    image: registry:2
    ports:
      - 5000:5000
      - 443:5000
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Registry Realm
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/pokus.crt
      REGISTRY_HTTP_TLS_KEY: /certs/pokus.key
      # REGISTRY_HTTP_TLS_LETSENCRYPT_CACHEFILE: /letsencrypt/cache
      # REGISTRY_HTTP_TLS_LETSENCRYPT_EMAIL: your@email.com
    volumes:
      - ./data:/var/lib/registry
      - ./auth:/auth
      - ./certs:/certs
      # - ./letsencrypt:/letsencrypt

EOF


docker-compose -f ./oci-registry/docker-compose.yml up -d
# docker-compose -f ./oci-registry/docker-compose.yml logs -f

# docker-compose -f ./oci-registry/docker-compose.yml down && docker-compose -f ./oci-registry/docker-compose.yml up -d

```
* then :

```bash
export DOCKHOST_IP_ADDR="192.168.208.7"
docker login https://${DOCKHOST_IP_ADDR}:5000
```


* Alright, now let's test the registry :

```bash

export DOCKHOST_IP_ADDR="192.168.208.7"
docker login https://${DOCKHOST_IP_ADDR}:5000

docker pull datarhei/restreamer
docker tag datarhei/restreamer ${DOCKHOST_IP_ADDR}:5000/datarhei/restreamer:2.7.4
docker push ${DOCKHOST_IP_ADDR}:5000/datarhei/restreamer:2.7.4

curl -ik --user ociadmin:ociadmin123 https://${DOCKHOST_IP_ADDR}/v2/_catalog

curl -ik --user \
  -X GET \
  https://${DOCKHOST_IP_ADDR}/v2/datarhei/restreamer/manifests/latest \
  ociadmin:ociadmin123


```

```bash
bash-3.2$ curl -ik --user ociadmin:ociadmin123 https://${DOCKHOST_IP_ADDR}/v2/_catalog
HTTP/2 200
content-type: application/json; charset=utf-8
docker-distribution-api-version: registry/2.0
x-content-type-options: nosniff
content-length: 58
date: Mon, 24 Jan 2022 06:46:47 GMT

{"repositories":["pokus/faas-node16","pokus/restreamer"]}
```
## Create the `Kubernetes` Cluster


```bash
export DOCKHOST_IP_ADDR="192.168.208.7"
export PATH_TO_POKUS_CERT=${HOME}/.docker/certs.d/${DOCKHOST_IP_ADDR}:5000/pokus.cert

# --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + #
# k3d cluster create jblCluster  \
#   --servers 3 \
#   --api-port 0.0.0.0:6550 \
#   --volume ${PATH_TO_POKUS_CERT}:/etc/ssl/certs/pokus.cert \
#   -a 3
# --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + #

k3d cluster create jblCluster  \
  --servers 3 \
  --api-port 0.0.0.0:6550 \
  --volume $PWD/oci-registry/certs/pokus.crt:/etc/ssl/certs/pokus.crt \
  -a 3

```

## create the kubernetes secret for private docker registry


```bash
export K8S_SECRET_NAME="pokus-oci-reg"
# kubectl edit serviceaccount default -n openfaas-fn
# # .... and add this at end of sevice account manifest :
# imagePullSecrets:
# - name: pokus-oci-reg
#
# --> not sure we can do that with helm --set

export OCI_ADMIN_USERNAME="ociadmin"
export OCI_ADMIN_PASSWORD="ociadmin123"
export OCI_ADMIN_EMAIL="ociadmin@pok-us.io"

kubectl create secret docker-registry ${K8S_SECRET_NAME} \
  --docker-username=${OCI_ADMIN_USERNAME} \
  --docker-password=${OCI_ADMIN_PASSWORD} \
  --docker-email=${OCI_ADMIN_EMAIL} \
  --namespace openfaas-fn


```

## Deploy OpenFAAS with `Helm`

```bash
kubectl apply -f https://raw.githubusercontent.com/openfaas/faas-netes/master/namespaces.yml

helm repo add openfaas https://openfaas.github.io/faas-netes/

# To use a LoadBalancer add [--set serviceType=LoadBalancer]
# To use an IngressController add [--set ingress.enabled=true]

# +++ # +++ # +++ # +++ # +++ # +++ # +++ # +++ # +++ # +++ #
#     
# -
helm repo update \
 && helm upgrade openfaas --install openfaas/openfaas \
    --namespace openfaas  \
    --set functionNamespace=openfaas-fn \
    --set generateBasicAuth=true

export OF_PASSWORD=$(kubectl -n openfaas get secret basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode) && \
echo "OpenFaaS admin password: ${OF_PASSWORD}"



```

* Then you have :

```bash

bash-3.2$ kubectl get ns
NAME              STATUS   AGE
default           Active   110m
kube-node-lease   Active   110m
kube-public       Active   110m
kube-system       Active   110m
openfaas          Active   25s
openfaas-fn       Active   25s
bash-3.2$

$ export OF_PASSWORD=$(kubectl -n openfaas get secret basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode) && \
> echo "OpenFaaS admin password: ${OF_PASSWORD}"
OpenFaaS admin password: F3ofU2C9fyU2
bash-3.2$
$ export OF_USERNAME=$(kubectl -n openfaas get secret basic-auth -o jsonpath="{.data.basic-auth-user}" | base64 --decode) && \
> echo "OpenFaaS admin usernama: ${OF_USERNAME}"
OpenFaaS admin password: admin
bash-3.2$
```
* Now you can access the OpenFaas Web Ui by using the `OF_USERNAME` and `OF_PASSWORD` credentials to login by mean of HTTP Basic Auth
* Install openfaaas cli :

```bash

# MacOS and Linux users

# If you run the script as a normal non-root user then the script
# will download the faas-cli binary to the current folder
$ curl -sL https://cli.openfaas.com | sudo sh

# Windows users with (Git Bash)
$ curl -sL https://cli.openfaas.com | sh

# or macos with brew
brew install faas-cli

```

To Verify the open faas installation using FAAS-CLI, you will need two shell sessions :

* In the first shell session, you will launch a `kubectl port-forward` command which will block the input stream :

```bash
export OPENFAAS_URL=http://127.0.0.1:8080
export OPENFAAS_URL=http://0.0.0.0:8080
kubectl port-forward -n openfaas svc/gateway 8080:8080
```

* which gives the following stdout :

```bash
bash-3.2$ export OPENFAAS_URL=http://127.0.0.1:8080
bash-3.2$ export OPENFAAS_URL=http://0.0.0.0:8080
bash-3.2$ kubectl port-forward -n openfaas svc/gateway 8080:8080
Forwarding from 127.0.0.1:8080 -> 8080
Forwarding from [::1]:8080 -> 8080
Handling connection for 8080
Handling connection for 8080
```

* In the second shell session, execute the `faas-cli login` command :

```bash
kubectl get svc -n openfaas gateway-external -o wide

export DOCKHOST_IP_ADDR="192.168.208.7"
export OPENFAAS_URL=http://0.0.0.0:8080
export OPENFAAS_URL=http://${DOCKHOST_IP_ADDR}:8080
export OPENFAAS_URL=http://127.0.0.1:8080
export OF_PASSWORD="qZ9XOHLaMUqg"
faas-cli login --password ${OF_PASSWORD}


curl -ik --user ociadmin:ociadmin123 http://${DOCKHOST_IP_ADDR}:5000/v2/_catalog
# If your login command is successfull, you will
```

* which gives the following stdout :

```bash

bash-3.2$ faas-cli login
Must provide a non-empty password via --password or --password-stdin
bash-3.2$ # faas-cli login --password
bash-3.2$ export OF_PASSWORD="F3ofU2C9fyU2"
bash-3.2$ faas-cli login --password ${OF_PASSWORD}
WARNING! Using --password is insecure, consider using: cat ~/faas_pass.txt | faas-cli login -u user --password-stdin
Calling the OpenFaaS server to validate the credentials...
credentials saved for admin http://127.0.0.1:8080
bash-3.2$ ls -alh ${HOME}/.openfaas
total 8
drwx------    3 jbl  staff    96B 23 jan 04:43 .
drwxr-xr-x+ 105 jbl  staff   3,3K 23 jan 04:43 ..
-rw-------    1 jbl  staff    88B 23 jan 04:43 config.yml
bash-3.2$ ls -alh /Users/jbl/.openfaas/config.yml
-rw-------  1 jbl  staff    88B 23 jan 04:43 /Users/jbl/.openfaas/config.yml
bash-3.2$
bash-3.2$ cat /Users/jbl/.openfaas/config.yml
auths:
- gateway: http://127.0.0.1:8080
  auth: basic
  token: YWRtaW46RjNvZlUyQzlmeVUy
```

## Deploy a FAAS function (just like a Firebase Cloud Function)

Exactly called "create a cloud function", in the OpenFAAS project terminology :

```bash
# Before creating a new function make sure
# you pull in the official OpenFaaS language
# templates from GitHub via the [templates repository](https://github.com/openfaas/templates).
# --- --- ---
# I will use node16
# https://github.com/openfaas/templates/blob/657717e8922a403f757ed4811191220533671539/template/node16/template.yml#L1
# https://github.com/openfaas/templates/blob/657717e8922a403f757ed4811191220533671539/template/node16/package.json#L2
#

faas-cli template pull


# bash-3.2$ faas-cli template pull
# Fetch templates from repository: https://github.com/openfaas/templates.git at
# 2022/01/23 05:55:10 Attempting to expand templates from https://github.com/openfaas/templates.git
# 2022/01/23 05:55:12 Fetched 16 template(s) : [csharp dockerfile go java11 java11-vert-x node node12 node12-debian node14 node16 node17 php7 python python3 python3-debian ruby] from https://github.com/openfaas/templates.git
# bash-3.2$

faas-cli template store list

faas-cli new --list
# bash-3.2$ faas-cli new --list
# Languages available as templates:
# - csharp
# - dockerfile
# - go
# - java11
# - java11-vert-x
# - node
# - node12
# - node12-debian
# - node14
# - node16
# - node17
# - php7
# - python
# - python3
# - python3-debian
# - ruby

# To create a new function named pokus-go-function in Go, type in the following:
# faas-cli new pokus-go-function --lang go

# To create a new function named pokus-go-function in NodeJS  v16 env, type in the following:
faas-cli new pokus-go-function --lang node16

# bash-3.2$ faas-cli new pokus-node16-function --lang node16
# 2022/01/23 06:08:39 No templates found in current directory.
# 2022/01/23 06:08:39 Attempting to expand templates from https://github.com/openfaas/templates.git
# 2022/01/23 06:08:40 Fetched 16 template(s) : [csharp dockerfile go java11 java11-vert-x node node12 node12-debian node14 node16 node17 php7 python python3 python3-debian ruby] from https://github.com/openfaas/templates.git
# Folder: pokus-node16-function created.
#   ___                   _____           ____
#  / _ \ _ __   ___ _ __ |  ___|_ _  __ _/ ___|
# | | | | '_ \ / _ \ '_ \| |_ / _` |/ _` \___ \
# | |_| | |_) |  __/ | | |  _| (_| | (_| |___) |
#  \___/| .__/ \___|_| |_|_|  \__,_|\__,_|____/
#       |_|
#
#
# Function created in folder: pokus-node16-function
# Stack file written: pokus-node16-function.yml
#
# Notes:
# You have created a new function which uses Node.js 16 (LTS) and the OpenFaaS
# of-watchdog which gives greater control over HTTP responses.
#
# npm i --save can be used to add third-party packages like request or cheerio
# npm documentation: https://docs.npmjs.com/
#
# Unit tests are run at build time via "npm run", edit package.json to specify
# how you want to execute them.


```
* the `faas-cli new pokus-go-function --lang node16` command generated the following folder structure :

```bash
├── [  15]  .gitignore
├── [ 128]  pokus-node16-function
│   ├── [ 230]  handler.js
│   └── [ 262]  package.json
├── [ 204]  pokus-node16-function.yml
└── [ 576]  template
    ├── [ 288]  csharp
    ├── [ 128]  dockerfile
    ├── [ 224]  go
    ├── [ 288]  java11
    ├── [ 288]  java11-vert-x
    ├── [ 256]  node
    ├── [ 256]  node12
    ├── [ 256]  node12-debian
    ├── [ 256]  node14
    ├── [ 256]  node16
    ├── [ 256]  node17
    ├── [ 256]  php7
    ├── [ 224]  python
    ├── [ 224]  python3
    ├── [ 224]  python3-debian
    └── [ 224]  ruby

18 directories, 5 files

```
* now build and deploy the cloud function :

```bash
# build
export HERAOHERE=$(pwd)
# docker login https://${DOCKHOST_IP_ADDR}:5000
export DOCKHOST_IP_ADDR="192.168.208.7"
# "OF_TEMPLATE_IMAGE_NAME"  must be same image name as the
# image property in the [pokus-node16-unction.yml]
export OF_TEMPLATE_IMAGE_NAME="${DOCKHOST_IP_ADDR}:5000/pokus/faas-node16:latest"

faas-cli build --build-arg AWESOME=true --image "${OF_TEMPLATE_IMAGE_NAME}" -f pokus-node16-function.yml ${HERAOHERE}/pokus-node16-function/pokus-node16-function/handler.js

docker images

# docker push to private registry
faas-cli push --build-arg AWESOME=true --image "${OF_TEMPLATE_IMAGE_NAME}" -f pokus-node16-function.yml ${HERAOHERE}/pokus-node16-function/pokus-node16-function/handler.js

# test we find the image in registry
curl -L -ik --user ociadmin:ociadmin123 https://${DOCKHOST_IP_ADDR}/v2/pokus/faas-node16/manifests/latest -X GET


faas-cli up --build-arg AWESOME=true --image "${OF_TEMPLATE_IMAGE_NAME}" -f pokus-node16-function.yml ${HERAOHERE}/pokus-node16-function/pokus-node16-function/handler.js
# deploy
# faas-cli deploy --image node16 -f pokus-node16-function.yml ${HERAOHERE}/pokus-node16-function/pokus-node16-function/handler.js

# test invoking (for the moment i have an issue requuest stays hanging...but the container image is successfully pulled from dockerhub)
faas-cli invoke -f pokus-node16-function.yml pokus-node16-function

# now deploy the curl as faas function
faas-cli deploy --image curl --name jbcurl
# --- the one below works
curl -X POST http://127.0.0.1:8080/function/jbcurl \
   -H "Content-Type: application/json" \
   -d 'https://randomuser.me/api/'

```

* Ok, now I had :
  * to setup a private docker registry with self signed tls certificate.
  * to trust the certificate as cert authority, on the dockerhost, so that docker login command can be run. the `${HOME}/.docker/config.json` will be injected into pipelines for the docker login
  * finally, when you deploy the cloud function in openfaas using `faas-cli`, the openfaas will try and docker pull the docker image, from the privatre docker registry. so there we need username password for docker login n being able to


```bash
export K8S_SECRET_NAME="pokus-oci-reg"
# kubectl edit serviceaccount default -n openfaas-fn
# # .... and add this at end of sevice account manifest :
# imagePullSecrets:
# - name: my-private-repo
# --> not sure we can do that with [helm --set]

export OCI_ADMIN_USERNAME="ociadmin"
export OCI_ADMIN_PASSWORD="ociadmin123"
export OCI_ADMIN_EMAIL="ociadmin@pok-us.io"

kubectl create secret docker-registry ${K8S_SECRET_NAME} \
  --docker-username=${OCI_ADMIN_USERNAME} \
  --docker-password=${OCI_ADMIN_PASSWORD} \
  --docker-email=${OCI_ADMIN_EMAIL} \
  --namespace openfaas-fn


```

At this point, the next issue is :

> The self-signed TLS Certificate of the docker registry, is not trusted by the OpenFAAS workers in the kubernetes cluster.

So Ok, our problem is how to, with `k3d`, set the tls cert as trusted "inside everything" : I found https://github.com/rancher/k3d/discussions/687 .

So the idea is that i have to add one option to create the kubernetes cluster, a volume mapping to put the cert in a given system directory :

```bash
export DOCKHOST_IP_ADDR="192.168.208.7"
export PATH_TO_POKUS_CERT=${HOME}/.docker/certs.d/${DOCKHOST_IP_ADDR}:5000/pokus.cert
k3d cluster create jblCluster  \
  --servers 3 \
  --api-port 0.0.0.0:6550 \
  --volume ${PATH_TO_POKUS_CERT}:/etc/ssl/certs/pokus.cert \
  -a 3
# works, tested
```



And now, the last issue i have is that the docker pull from the kubernetes cluster, hitting the pprivate docker registry fails.

Here are the auth logs on the registry's side:

```bash
oci-registry-registry-1  | time="2022-01-24T11:20:53.192727493Z" level=warning msg="error authorizing context: basic authentication challenge for realm "Registry Realm": invalid authorization credential" go.version=go1.11.2 http.request.host="192.168.208.7:5000" http.request.id=17408089-da00-47c7-b0f9-39b757d6dd03 http.request.method=HEAD http.request.remoteaddr="172.19.0.1:59092" http.request.uri="/v2/pokus/faas-node16/manifests/0.0.1" http.request.useragent="containerd/v1.4.4-k3s1" vars.name="pokus/faas-node16" vars.reference=0.0.1
```

And here is the description of the failing pod :

```bash
bash-3.2$ kubectl describe pod/pokus-node16-function-c495795c8-rptp6 -n openfaas-fn
Name:         pokus-node16-function-c495795c8-rptp6
Namespace:    openfaas-fn
Priority:     0
Node:         k3d-jblcluster-agent-0/172.20.0.5
Start Time:   Mon, 24 Jan 2022 10:07:42 +0100
Labels:       faas_function=pokus-node16-function
              pod-template-hash=c495795c8
Annotations:  prometheus.io.scrape: false
Status:       Pending
IP:           10.42.3.8
IPs:
  IP:           10.42.3.8
Controlled By:  ReplicaSet/pokus-node16-function-c495795c8
Containers:
  pokus-node16-function:
    Container ID:   
    Image:          192.168.208.7:5000/pokus/faas-node16:0.0.1
    Image ID:       
    Port:           8080/TCP
    Host Port:      0/TCP
    State:          Waiting
      Reason:       ImagePullBackOff
    Ready:          False
    Restart Count:  0
    Liveness:       http-get http://:8080/_/health delay=2s timeout=1s period=2s #success=1 #failure=3
    Readiness:      http-get http://:8080/_/health delay=2s timeout=1s period=2s #success=1 #failure=3
    Environment:
      fprocess:  node index.js
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from default-token-j7csp (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             False
  ContainersReady   False
  PodScheduled      True
Volumes:
  default-token-j7csp:
    Type:        Secret (a volume populated by a Secret)
    SecretName:  default-token-j7csp
    Optional:    false
QoS Class:       BestEffort
Node-Selectors:  <none>
Tolerations:     node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                 node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type     Reason   Age                    From     Message
  ----     ------   ----                   ----     -------
  Warning  Failed   17m (x438 over 117m)   kubelet  Error: ImagePullBackOff
  Normal   BackOff  2m6s (x505 over 117m)  kubelet  Back-off pulling image "192.168.208.7:5000/pokus/faas-node16:0.0.1"
bash-3.2$ kubectl get secrets -n openfaas-fn
NAME                  TYPE                                  DATA   AGE
default-token-j7csp   kubernetes.io/service-account-token   3      4h40m
pokus-oci-reg         kubernetes.io/dockerconfigjson        1      4h31m
bash-3.2$

```

* Here are the secrets:

```bash
# --
bash-3.2$ kubectl get secrets -n openfaas-fn
NAME                  TYPE                                  DATA   AGE
default-token-j7csp   kubernetes.io/service-account-token   3      4h40m
pokus-oci-reg         kubernetes.io/dockerconfigjson        1      4h31m
```
* now we need :

```bash
# ------ # ------ # ------ # ------ # ------ # ------ # ------ # ------ #
echo -en "------\nPlease enter Docker registry login:\nUsername: "; \
read regusername; \
echo -n "Password: "; \
read -s regpassword; \
echo""; \
echo -n "Auth Token: "; \
echo -n "$regusername:$regpassword" | base64; \
unset regpassword; \
unset regusername;
# ------ # ------ # ------ # ------ # ------ # ------ # ------ # ------ #

export OCI_ADMIN_USERNAME="ociadmin"
export OCI_ADMIN_PASSWORD="ociadmin123"
export OCI_AUTH_TOKEN=$(echo -n "${OCI_ADMIN_PASSWORD}:${OCI_ADMIN_PASSWORD}" | base64)
echo "Auth Token: OCI_AUTH_TOKEN=[${OCI_AUTH_TOKEN}] "
export DOCKHOST_IP_ADDR="192.168.208.7"
cat << EOF > ./.pokus.docker.config.json
{
    "auths": {
        "https://${DOCKHOST_IP_ADDR}:5000/v1/": {
            "auth": "${OCI_AUTH_TOKEN}",
            "email": "openfaas-ops@pok-us.io"
        }
    }
}
EOF

kubectl create secret generic regcred \
    --from-file=.dockerconfigjson=$PWD/.pokus.docker.config.json \
    --type=kubernetes.io/dockerconfigjson

```

## ANNEX A. Notes on "go FAAS-ter at Netflix"


## ANNEX B. REST APIs, GRaphQL APIS, FAAS and Gateways ?

I know well from gravitee what an API Gateway is : it is about managing a lot of REST API / GRaphQL APIs.

Now, when we develop FAAS (Cloud) functions : we quickly endup with dozens/hundreds of functions.

We have to globally, consistently manage those functions (there is something above functions, like there is something above REST API Endpoints)

Example, we probably wanna be able :
* to apply policies differently and across application etc.
* just like with `Envoy` : we know that we do not want implementation of authentication inside each of our microservice (one microservice = one function) -> so could we use Envoy, or the same pattern as Envoy, in a FAAS Gateway context ?
* to manage functions registries :
  * when you have a lot of REST API endpoints, you group them into bags , and one bag is one application or application set (like this is the customer portal, and all its REST API ENdpoint)
  * ok, so i would like a faas gateway to allow me to group FAAS fucntions into such business units,
  * and for each business unit, the gateway fires one HTTP service , which is there for FAAS function discovery. Does service Discovery makes sense int he FAAS context ?
* fuck, crazy idea :
  * every Terraform Provider is relying on the fact that the endpoint is an API, ok.
  * can i use OpenFAAS to implement a cloud provider quickly (like for Virtual Box),
  * and immediately implement the Terraform provider : terraform is not aware that the REST API ENdpoints it is hitting, actually are OpenFaAS function behind



## DEEP STUDY WORK

Ok, so I wanna deeply study on this comparison :
* API Gateways (for REST API/ GRaphQL APIs)
* Istio / Service Mesh : what are differences/commons with API Gateways ?
* FAAS GAteway :
  * what are differences/commons with API Gateways ?
  * what are differences/commons with Istio / Service Mesh ?

* I need business cases to compare the gateways :
  * 2 business cases for using REST API / API Gateways
  *


* the pegbox (terraform VirtualBox provider)
* A Robot to publish a `hugo` post, and then to all

And I want this conclusion :

After business cases study, to compare pros/cons of each solution, here is how i see those different solutions for x-gateways

And i will end with an open question :

> Do we need a unified Gateway concept ?

* Do we need a new project for that ?
* Are there features that we would need, taht we cannot find n any of the existing open source projects ?
...

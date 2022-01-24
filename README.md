

## Create the `Kubernetes` Cluster

```bash

k3d cluster create jblCluster  --servers 3 --api-port 0.0.0.0:6550 -a 3

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

```
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

export OPENFAAS_URL=http://127.0.0.1:8080
export OF_PASSWORD="F3ofU2C9fyU2"
faas-cli login --password ${OF_PASSWORD}

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
export OF_TEMPLATE_IMAGE_NAME="node16"
faas-cli build --build-arg AWESOME=true --image ${OF_TEMPLATE_IMAGE_NAME} -f pokus-node16-function.yml ${HERAOHERE}/pokus-node16-function/pokus-node16-function/handler.js
# deploy
faas-cli deploy --image node16 -f pokus-node16-function.yml ${HERAOHERE}/pokus-node16-function/pokus-node16-function/handler.js

# test invoking (for the moment i have an issue requuest stays hanging...but the container image is successfully pulled from dockerhub)
faas-cli invoke -f pokus-node16-function.yml pokus-node16-function

# now deploy the curl as faas function
faas-cli deploy --image curl --name jbcurl
# ---
curl -X POST http://127.0.0.1:8080/function/jbcurl \
   -H "Content-Type: application/json" \
   -d 'https://randomuser.me/api/'

```

## deploy private docker registry

```bash

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
CN = 192.168.208.7
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = IP:192.168.208.7
[alt_names]
DNS.1 = 192.168.208.7
EOF


# openssl req -new -x509 -text -key client.key -out client.cert -keyout ./oci-registry/certs/pokus.key -x509 -days 365 -out ./oci-registry/certs/pokus.cert -config ./oci-registry/certs/pokus.conf

openssl req  -newkey rsa:4096 -nodes -sha256 -keyout ./oci-registry/certs/pokus.key -x509 -days 365 -out ./oci-registry/certs/pokus.crt -config ./oci-registry/certs/pokus.conf

# https://blog.container-solutions.com/adding-self-signed-registry-certs-docker-mac
# https://stackoverflow.com/questions/40822912/where-to-add-client-certificates-for-docker-for-mac
mkdir -p ~/.docker/certs.d/192.168.208.7:5000/
cp -f ./oci-registry/certs/pokus.crt ~/.docker/certs.d/192.168.208.7:5000/pokus.crt
cp -f ./oci-registry/certs/pokus.key ~/.docker/certs.d/192.168.208.7:5000/pokus.key
cp -f ./oci-registry/certs/pokus.crt ~/.docker/certs.d/192.168.208.7:5000/pokus.cert

# -> below is for mac os, see next comments for GNU/Linux Debian
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./oci-registry/certs/pokus.crt
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/.docker/certs.d/192.168.208.7:5000/pokus.cert

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

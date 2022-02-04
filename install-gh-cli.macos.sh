#!/bin/bash

# ./install-gh-cli.sh
export GH_CLI_VERSION="2.4.0"
curl -LO "https://github.com/cli/cli/releases/download/v${GH_CLI_VERSION}/gh_${GH_CLI_VERSION}_macOS_amd64.tar.gz"
curl -LO "https://github.com/cli/cli/releases/download/v${GH_CLI_VERSION}/gh_${GH_CLI_VERSION}_checksums.txt"
https://github.com/cli/cli/releases/download/v2.4.0/gh_2.4.0_macOS_amd64.tar.gz
ls -alh ./gh_${GH_CLI_VERSION}_macOS_amd64.tar.gz
ls -alh ./gh_${GH_CLI_VERSION}_checksums.txt

cat ./gh_${GH_CLI_VERSION}_checksums.txt | grep "gh_${GH_CLI_VERSION}_macOS_amd64.tar.gz"

mkdir -p ./.pokus.temp.darwin
tar -xvf ./gh_${GH_CLI_VERSION}_macOS_amd64.tar.gz -C ./.pokus.temp.darwin

tree -alh -L 3 ./.pokus.temp.darwin
ls -alh ./.pokus.temp.darwin/gh_${GH_CLI_VERSION}_macOS_amd64

sudo mkdir -p /usr/local/bin/github-cli/${GH_CLI_VERSION}/
sudo cp ./.pokus.temp.darwin/gh_${GH_CLI_VERSION}_macOS_amd64/bin/gh /usr/local/bin/github-cli/${GH_CLI_VERSION}/gh
sudo ln -s /usr/local/bin/github-cli/${GH_CLI_VERSION}/gh /usr/local/bin/ghcli

tree -alh -L 3 /usr/local/bin/github-cli/

ghcli --version

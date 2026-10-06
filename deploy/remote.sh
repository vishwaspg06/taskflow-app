#!/bin/bash
set -euo pipefail
cd /opt/taskflow
release_tag="$1"
[[ "$release_tag" =~ ^[a-zA-Z0-9._-]+$ ]]

aws ecr get-login-password --region ap-south-1 |
  docker login --username AWS --password-stdin \
  323230574799.dkr.ecr.ap-south-1.amazonaws.com

IMAGE_TAG="$release_tag" docker compose pull
IMAGE_TAG="$release_tag" docker compose up -d --wait --wait-timeout 180
curl --fail --silent --show-error http://localhost/ready

sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$release_tag/" .env
echo
echo "Deployed release $release_tag"

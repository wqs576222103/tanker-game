#!/bin/bash
set -e

echo "构建 Server 镜像..."
docker build -t wangqs57/tanker-server:latest ./server

echo "构建 Web 镜像..."
docker build -t wangqs57/tanker-web:latest ./web

echo "推送 Server 镜像..."
docker push wangqs57/tanker-server:latest

echo "推送 Web 镜像..."
docker push wangqs57/tanker-web:latest

echo "✓ 所有操作完成！"
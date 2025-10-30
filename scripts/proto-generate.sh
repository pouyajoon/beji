#!/usr/bin/env bash
set -euo pipefail

# Requires: protoc installed and available in PATH
# Plugin: ts-proto installed as devDependency

PROTO_DIR="proto"
OUT_DIR="src/proto"

mkdir -p "$OUT_DIR"

protoc \
  --plugin=$(pwd)/node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out="$OUT_DIR" \
  --ts_proto_opt=esModuleInterop=true,outputServices=generic-definitions,env=browser \
  --proto_path="$PROTO_DIR" \
  $(git ls-files "${PROTO_DIR}/**/*.proto")

echo "Generated TS from proto into ${OUT_DIR}"



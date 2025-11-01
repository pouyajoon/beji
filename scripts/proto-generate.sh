#!/usr/bin/env bash
set -euo pipefail

# Requires: protoc installed and available in PATH
# Plugins: @bufbuild/protoc-gen-es + @connectrpc/protoc-gen-connect-es

PROTO_DIR="proto"
OUT_DIR="src/proto"

mkdir -p "$OUT_DIR"

echo "Generating Connect services with @bufbuild and @connectrpc..."
protoc \
  --plugin=protoc-gen-es=$(pwd)/node_modules/.bin/protoc-gen-es \
  --plugin=protoc-gen-connect-es=$(pwd)/node_modules/.bin/protoc-gen-connect-es \
  --es_out="$OUT_DIR" \
  --es_opt=target=ts+dts \
  --connect-es_out="$OUT_DIR" \
  --connect-es_opt=target=ts+dts \
  --proto_path="$PROTO_DIR" \
  $(find "$PROTO_DIR" -name "*.proto")

echo "Generated TS from proto into ${OUT_DIR}"

# Fix .js extensions in imports to work with Next.js/Turbopack
echo "Fixing .js extensions in proto imports..."
find "$OUT_DIR" -name "*.ts" -type f | while read -r file; do
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS sed syntax
        sed -i '' 's/from "\([^"]*\)\.js"/from "\1"/g' "$file"
    else
        # Linux sed syntax
        sed -i 's/from "\([^"]*\)\.js"/from "\1"/g' "$file"
    fi
done
echo "Fixed .js extensions in proto imports"



#!/usr/bin/env bash
set -euo pipefail

# Fix .js extensions in proto generated files to work with Next.js/Turbopack
# The generated files import with .js extensions, but we need them to resolve to .ts files

OUT_DIR="src/proto"

echo "Fixing .js extensions in proto imports..."

# Find all TypeScript files in proto directory and remove .js from import statements
find "$OUT_DIR" -name "*.ts" -type f | while read -r file; do
    # Remove .js extension from import statements
    # This fixes imports like: from "../../common/v1/common_pb.js"
    # To: from "../../common/v1/common_pb"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS sed syntax
        sed -i '' 's/from "\([^"]*\)\.js"/from "\1"/g' "$file"
    else
        # Linux sed syntax
        sed -i 's/from "\([^"]*\)\.js"/from "\1"/g' "$file"
    fi
done

echo "Fixed .js extensions in proto imports"


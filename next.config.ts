import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    typedRoutes: false,
    // Silence Next.js 16 Turbopack error when a webpack config exists
    // We still keep the webpack alias below; Turbopack ignores it.
    turbopack: {
        resolveAlias: {
            // Turbopack can resolve .js imports to .ts files
            // This handles proto generated files that import with .js extensions
        },
    },
    // Ensure a single Jotai instance across the app via webpack alias
    webpack: (config) => {
        config.resolve = config.resolve || {};
        config.resolve.alias = config.resolve.alias || {};
        // Allow .js imports to resolve to .ts files (for proto generated code)
        config.resolve.extensionAlias = {
            ".js": [".ts", ".tsx", ".js", ".jsx"],
        };
        Object.assign(config.resolve.alias, {
            jotai: path.resolve(process.cwd(), "node_modules/jotai"),
            "jotai/vanilla": path.resolve(process.cwd(), "node_modules/jotai/vanilla"),
        });
        return config;
    },
};

export default nextConfig;



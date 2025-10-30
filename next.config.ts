import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    typedRoutes: true,
    // Ensure a single Jotai instance across the app via webpack alias
    webpack: (config) => {
        config.resolve = config.resolve || {};
        config.resolve.alias = config.resolve.alias || {};
        Object.assign(config.resolve.alias, {
            jotai: path.resolve(process.cwd(), "node_modules/jotai"),
            "jotai/vanilla": path.resolve(process.cwd(), "node_modules/jotai/vanilla"),
        });
        return config;
    },
};

export default nextConfig;



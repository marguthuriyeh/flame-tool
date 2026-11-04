import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server listens on 0.0.0.0, so a browser on 127.0.0.1 is a
  // different host. Without this, Next blocks the dev assets that hydrate the page.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

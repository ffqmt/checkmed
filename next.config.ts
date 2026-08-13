import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions default to a 1MB request body cap — well under the
    // 15MB upload limit the app itself validates (see MAX_FILE_SIZE_BYTES),
    // so real-world photos of atestados were hitting a platform-level 413
    // before reaching our own validation.
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;

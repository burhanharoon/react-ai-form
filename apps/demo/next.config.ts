import type { NextConfig } from "next"

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@react-ai-form/core",
    "@react-ai-form/react",
    "@react-ai-form/react-hook-form",
  ],
}

export default config

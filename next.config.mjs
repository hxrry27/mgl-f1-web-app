const nextConfig = {
  env: {
    COOKIE_SECRET: process.env.COOKIE_SECRET,
    RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
  },
  experimental: {
    serverComponentsExternalPackages: ['child_process'],
  },
};
export default nextConfig;
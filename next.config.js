const nextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "*": ["public/**/*", ".next/static/**/*"],
  },
};

export default nextConfig;

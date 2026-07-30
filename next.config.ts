import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Hay un package-lock.json suelto por encima de este repo, y sin esto
    // Turbopack lo toma como raíz del workspace y avisa en cada build.
    root: import.meta.dirname,
  },
};

export default nextConfig;

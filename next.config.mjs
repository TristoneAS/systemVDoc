/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard/autorizaciones",
        destination: "/dashboard/mis_solicitudes",
        permanent: true,
      },
      {
        source: "/dashboard/solicitudes/mis",
        destination: "/dashboard/mis_solicitudes",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

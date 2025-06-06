/** @type {import('next').NextConfig} */
const nextConfig = {
  // クロスオリジン警告を解決 (正しい設定方法)
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  
  // 開発時の設定
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
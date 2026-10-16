const connection = {
  host: process.env.UPSTASH_HOST || "living-lizard-199962.upstash.io",
  port: Number(process.env.UPSTASH_PORT || 6379),
  password: process.env.UPSTASH_PASSWORD,
  tls: {},
};

export default connection;

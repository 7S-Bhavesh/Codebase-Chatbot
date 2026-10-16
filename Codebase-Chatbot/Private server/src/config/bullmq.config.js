const connection = {
  host: "living-lizard-199962.upstash.io",
  port: 6379,
  password: process.env.UPSTASH_PASSWORD,
  tls: {},
};

export default connection;

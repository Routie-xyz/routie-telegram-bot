import { createClient } from "redis";

import { REDIS_URL } from "@/src/server/constants";

type TRedisClient = Awaited<ReturnType<typeof createClient>>;
let _client: TRedisClient | null = null;
export const getRedis = async (): Promise<TRedisClient | null> => {
  if (!REDIS_URL) {
    return null;
  }
  if (_client) {
    return _client;
  }
  const client = await createClient({
    url: REDIS_URL,
  })
    .on("error", (err) => console.log("Redis Client Error", err))
    .connect();

  _client = client;
  return client;
};

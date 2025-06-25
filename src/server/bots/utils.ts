import { Bot } from "grammy";

export async function createTgBot({ token }: { token: string }) {
  if (!token) {
    throw new Error(`TG Bot Token is not provided`);
  }
  const bot = new Bot(token);

  await bot.init();

  return bot;
}

export type TTgBot = NonNullable<Awaited<ReturnType<typeof createTgBot>>>;

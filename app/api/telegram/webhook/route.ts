import { NextRequest, NextResponse } from "next/server";

import { createTgBot, setAISybilHandlers } from "@/src/server/bots";
import { TG_BOT_TOKEN, TG_WEBHOOK_SECRET } from "@/src/server/constants";

export const POST = async (req: NextRequest) => {
  const bot = await createTgBot({ token: TG_BOT_TOKEN });

  if (!bot) {
    return NextResponse.json(
      {
        data: {
          ok: false,
          error: "Bot is not initialized",
        },
      },
      { status: 400 }
    );
  }

  const body = await req.json();

  const telegramBotApiSecretToken = req.headers.get(
    "x-telegram-bot-api-secret-token"
  );
  if (!TG_WEBHOOK_SECRET || telegramBotApiSecretToken !== TG_WEBHOOK_SECRET) {
    return NextResponse.json(
      {
        data: {
          ok: false,
          error: "Invalid secret token",
        },
      },
      { status: 401 }
    );
  }
  await bot.init();

  await setAISybilHandlers(bot);

  await bot.handleUpdate(body);

  return NextResponse.json({
    data: {
      ok: true,
    },
  });
};

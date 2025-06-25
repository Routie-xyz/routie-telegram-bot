import { Bot, InlineKeyboard } from "grammy";

import { POLL_REDIS_KEY, POLL_QUESTIONS } from "@/src/server/constants";
import { getRedis } from "@/src/server/db";

const optionsToKeyboard = (options: string[], dataPrefix: string) => {
  return options.reduce((acc, option, index) => {
    const callbackData = `${dataPrefix}_${index}`;
    if (index === options.length - 1) {
      return acc.text(option, callbackData);
    }
    return acc.text(option, callbackData).row();
  }, new InlineKeyboard());
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const setAISybilHandlers = async (bot: Bot) => {
  bot.command("start", async (ctx) => {
    if (!ctx.from) {
      return ctx.reply("Please start the bot in a private chat");
    }

    const keyboard = new InlineKeyboard().text("Apply for beta", "get_access");

    return ctx.api.sendAnimation(
      ctx.from.id,
      "CgACAgIAAxkBAAIB7Whbuf3mL8cJlAKxtvHoTsZJJu3AAAIbdgACezTYSqSe-A8sgpU6NgQ",
      {
        caption:
          "Welcome to Routie — your Web3 growth assistant!\n\n1. How it works\nConnect wallet → Choose project → Enter deposit → Launch route → Track progress or relax — it's all automated.\n\n2. How your data is protected\nWe use Privy, trusted by OpenSea, Farcaster & more. Your data stays encrypted — we never see or store it.\n\n3. How to get a better price on Routie\nBecome an early bird — it’s 70% off during development. Like buying an apartment at the foundation stage — smart.",
        reply_markup: keyboard,
      }
    );
  });

  bot.callbackQuery("get_access", async (ctx) => {
    const redis = await getRedis();
    if (!redis) {
      console.error("Redis is not connected");
      return ctx.answerCallbackQuery("Error :(");
    }

    const existingAnswers = await redis
      .hGet(POLL_REDIS_KEY, String(ctx.from.id))
      .then((res: string | null) => (res ? JSON.parse(res) : []));

    if (existingAnswers.length >= POLL_QUESTIONS.length) {
      await ctx.reply(
        "You have already answered all questions! Thanks for participating."
      );
      return ctx.answerCallbackQuery();
    }

    const {
      callback_query: { message, from },
    } = ctx.update;

    const messageId = message?.message_id;
    if (messageId) {
      await ctx.api.editMessageCaption(from.id, messageId, {
        caption: message?.caption || "",
        reply_markup: undefined,
      });
    }

    const firstPoll = POLL_QUESTIONS[0];
    const keyboard = optionsToKeyboard(firstPoll.options, "poll:0");

    // await sleep(1500);

    await ctx.reply(
      `Answer 2 quick questions to apply for beta and get a first farming route for free:\n\n_${firstPoll.question}_`,
      {
        reply_markup: keyboard,
        parse_mode: "MarkdownV2",
      }
    );

    return ctx.answerCallbackQuery();
  });

  bot.on("callback_query:data", async (ctx) => {
    const { data, message } = ctx.update.callback_query;
    console.log(`callback_query:data`, data);

    const redis = await getRedis();
    if (!message || !redis) {
      return ctx.answerCallbackQuery("Error :(");
    }

    if (!data.startsWith("poll:")) {
      return ctx.answerCallbackQuery();
    }

    const [, pollData] = data.split(":");
    const [pollIndexStr, optionIndexStr] = pollData.split("_");
    const pollIndex = Number(pollIndexStr);
    const optionIndex = Number(optionIndexStr);

    if (
      pollIndex >= POLL_QUESTIONS.length ||
      optionIndex >= POLL_QUESTIONS[pollIndex].options.length
    ) {
      return ctx.answerCallbackQuery("Invalid poll data");
    }

    const currentPoll = POLL_QUESTIONS[pollIndex];
    const selectedOption = currentPoll.options[optionIndex];

    console.log(`poll_answer`, pollIndex, optionIndex, selectedOption);

    // Get current answers from Redis
    const currentAnswers = await redis
      .hGet(POLL_REDIS_KEY, String(ctx.from.id))
      .then((res: string | null) => (res ? JSON.parse(res) : []));

    // Add new answer
    const updatedAnswers = [
      ...currentAnswers,
      [currentPoll.question, selectedOption],
    ];

    // Store updated answers
    await redis.hSet(POLL_REDIS_KEY, {
      [ctx.from.id]: JSON.stringify(updatedAnswers),
    });

    let reply_markup: InlineKeyboard | undefined;
    let text: string = message.text || "";

    // Check if this is the last poll
    const isLastPoll = pollIndex === POLL_QUESTIONS.length - 1;

    if (isLastPoll) {
      // Last poll - show thanks message
      reply_markup = undefined;
      text = `${text} ✅`;

      await ctx.reply(
        "Congrats\\! You'll be one of the first to try true farming automation in action\\.\n\nThe first project to automize — Abstract\n\nWe'll ping you when it's live 🌀",
        {
          parse_mode: "MarkdownV2",
        }
      );
    } else {
      // Not last poll - show next poll
      const nextPollIndex = pollIndex + 1;
      const nextPoll = POLL_QUESTIONS[nextPollIndex];
      reply_markup = optionsToKeyboard(
        nextPoll.options,
        `poll:${nextPollIndex}`
      );
      text = `${text} ✅\n\n_${nextPoll.question}_`;
    }

    await ctx.api.editMessageText(message.chat.id, message.message_id, text, {
      reply_markup,
      parse_mode: "MarkdownV2",
    });
    return ctx.answerCallbackQuery();
  });

  bot.on("message", async (ctx) => {
    console.log(`message`, ctx.update.message);
  });
};

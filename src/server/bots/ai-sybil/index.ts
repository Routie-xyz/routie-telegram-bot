import { Bot, InlineKeyboard } from 'grammy';

import {
    TG_BOT_ANIMATION_URL,
    IS_PROD_SERVER,
    ADMINS,
    EARLY_BIRD_ACCESS_PRICE,
} from '@/src/server/constants';
import { getRedis } from '@/src/server/db';
import { User } from '@/src/server/types';

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
    bot.command('getStats', async (ctx) => {
        if (!ADMINS[ctx.from?.id?.toString() || '']) {
            return ctx.reply('You are not an admin');
        }

        const redis = await getRedis();

        if (!redis) {
            console.error('Redis is not connected');
            return ctx.reply('Error :(');
        }

        const userKeys = await redis.keys(
            `${IS_PROD_SERVER ? 'prod' : 'dev'}_user_*`
        );

        if (userKeys.length === 0) {
            return ctx.reply('No users found');
        }

        const usersRaw = (await redis.mGet(userKeys)) as string[];
        const users = usersRaw
            .filter(Boolean)
            .map((data) => JSON.parse(data)) as User[];

        return ctx.reply(
            `Total users: ${users.length}\nUsers with access: ${
                users.filter((user) => user.isHaveAccess).length
            }\nUsers with early bird access: ${
                users.filter((user) => user.isEarlyBird).length
            }`
        );
    });

    bot.command('start', async (ctx) => {
        if (!ctx.from) {
            return ctx.reply('Please start the bot in a private chat');
        }

        const redis = await getRedis();

        if (!redis) {
            console.error('Redis is not connected');
            return ctx.answerCallbackQuery('Error :(');
        }

        const userKey = `${IS_PROD_SERVER ? 'prod' : 'dev'}_user_${
            ctx.from.id
        }`;

        const userData = await redis.get(userKey);

        if (!userData) {
            await redis.set(
                userKey,
                JSON.stringify({
                    id: ctx.from.id,
                    username: ctx.from.username,
                    firstName: ctx.from.first_name,
                    lastName: ctx.from.last_name,
                    languageCode: ctx.from.language_code,
                })
            );
        }

        const keyboard = new InlineKeyboard().text(
            'Become an early bird',
            'become_an_early_bird'
        );

        await ctx.api.sendAnimation(ctx.from.id, TG_BOT_ANIMATION_URL, {
            caption:
                "Welcome to Routie — your Web3 growth assistant!\n\n1. How it works\nConnect wallet → Choose project → Enter deposit → Launch route → Track progress or relax — it's all automated.\n\n2. How your data is protected\nWe use Privy, trusted by OpenSea, Farcaster & more. Your data stays encrypted — we never see or store it.\n\n3. How to get a better price on Routie\nBecome an early bird — it's 70% off during development. Like buying an apartment at the foundation stage — smart.",
            reply_markup: keyboard,
        });

        const supportKeyboard = new InlineKeyboard().url(
            'Contact us',
            'https://t.me/RoutieSupportBot'
        );

        const supportMessage = await ctx.api.sendMessage(
            ctx.from.id,
            'Contact us if you wanna talk!\n\n@RoutieSupportBot',
            {
                reply_markup: supportKeyboard,
            }
        );

        await ctx.api.pinChatMessage(ctx.from.id, supportMessage.message_id);
    });

    bot.callbackQuery('become_an_early_bird', async (ctx) => {
        const redis = await getRedis();

        if (!redis) {
            console.error('Redis is not connected');
            return ctx.answerCallbackQuery('Error :(');
        }

        const userKey = `${IS_PROD_SERVER ? 'prod' : 'dev'}_user_${
            ctx.from.id
        }`;

        const userData = await redis.get(userKey);

        if (!userData) {
            return ctx.answerCallbackQuery('User not found');
        }

        const user = JSON.parse(userData) as User;

        if (user.isHaveAccess) {
            return ctx.answerCallbackQuery('You already paid for access');
        }

        if (!EARLY_BIRD_ACCESS_PRICE) {
            return ctx.answerCallbackQuery(
                'Early bird access price is not set'
            );
        }

        const invoice = await bot.api.sendInvoice(
            ctx.from.id,
            'Early Bird Access',
            'Buy Early Bird Access',
            JSON.stringify({
                userId: ctx.from.id,
                action: 'buyEarlyBirdAccess',
            }),
            'XTR',
            [{ label: 'Early Bird Access', amount: +EARLY_BIRD_ACCESS_PRICE }]
        );

        await redis.set(
            userKey,
            JSON.stringify({
                ...user,
                invoiceMessageId: invoice.message_id,
            })
        );

        return ctx.answerCallbackQuery();
    });

    bot.on('pre_checkout_query', async (ctx) => {
        const invoicePayload = JSON.parse(
            ctx.update.pre_checkout_query.invoice_payload
        );

        const redis = await getRedis();

        if (!redis) {
            console.error('Redis is not connected');
            await ctx.answerPreCheckoutQuery(false, 'Error :(');
            return;
        }

        const userKey = `${IS_PROD_SERVER ? 'prod' : 'dev'}_user_${
            invoicePayload.userId
        }`;

        const userData = await redis.get(userKey);

        if (!userData) {
            await ctx.answerPreCheckoutQuery(false, 'User not found');
            return;
        }

        const user = JSON.parse(userData) as User;

        await ctx.api.deleteMessage(user.id, user.invoiceMessageId);

        if (invoicePayload.action === 'buyEarlyBirdAccess') {
            if (user.isHaveAccess) {
                await ctx.answerPreCheckoutQuery(
                    false,
                    'You already paid for access'
                );
                return;
            }

            await ctx.answerPreCheckoutQuery(true);
        } else {
            await ctx.answerPreCheckoutQuery(false, 'Invalid invoice payload');
        }
    });

    bot.on('message:successful_payment', async (ctx) => {
        const successfullPayment = ctx.update.message.successful_payment;

        const invoicePayload = JSON.parse(successfullPayment.invoice_payload);

        if (invoicePayload.action === 'buyEarlyBirdAccess') {
            const userKey = `${IS_PROD_SERVER ? 'prod' : 'dev'}_user_${
                invoicePayload.userId
            }`;

            const redis = await getRedis();

            if (!redis) {
                console.error('Redis is not connected');
                return ctx.answerCallbackQuery('Error :(');
            }

            const userData = await redis.get(userKey);

            if (!userData) {
                return ctx.answerCallbackQuery('User not found');
            }

            const user = JSON.parse(userData) as User;

            await redis.set(
                userKey,
                JSON.stringify({
                    ...user,
                    isHaveAccess: true,
                    isEarlyBird: true,
                })
            );

            bot.api.sendMessage(
                ctx.from.id,
                `Early bird access purchased! You'll be one of the first to try true farming automation in action.\n\nWe'll ping you when it's live 🌀`
            );
        }
    });

    // bot.callbackQuery('get_access', async (ctx) => {
    //     const redis = await getRedis();
    //     if (!redis) {
    //         console.error('Redis is not connected');
    //         return ctx.answerCallbackQuery('Error :(');
    //     }

    //     const existingAnswers = await redis
    //         .hGet(POLL_REDIS_KEY, String(ctx.from.id))
    //         .then((res: string | null) => (res ? JSON.parse(res) : []));

    //     if (existingAnswers.length >= POLL_QUESTIONS.length) {
    //         await ctx.reply(
    //             'You have already answered all questions! Thanks for participating.'
    //         );
    //         return ctx.answerCallbackQuery();
    //     }

    //     const {
    //         callback_query: { message, from },
    //     } = ctx.update;

    //     const messageId = message?.message_id;
    //     if (messageId) {
    //         await ctx.api.editMessageCaption(from.id, messageId, {
    //             caption: message?.caption || '',
    //             reply_markup: undefined,
    //         });
    //     }

    //     const firstPoll = POLL_QUESTIONS[0];
    //     const keyboard = optionsToKeyboard(firstPoll.options, 'poll:0');

    //     // await sleep(1500);

    //     await ctx.reply(
    //         `Answer 2 quick questions to apply for beta and get a first farming route for free:\n\n_${firstPoll.question}_`,
    //         {
    //             reply_markup: keyboard,
    //             parse_mode: 'MarkdownV2',
    //         }
    //     );

    //     return ctx.answerCallbackQuery();
    // });

    // bot.on('callback_query:data', async (ctx) => {
    //     const { data, message } = ctx.update.callback_query;
    //     console.log(`callback_query:data`, data);

    //     const redis = await getRedis();
    //     if (!message || !redis) {
    //         return ctx.answerCallbackQuery('Error :(');
    //     }

    //     if (!data.startsWith('poll:')) {
    //         return ctx.answerCallbackQuery();
    //     }

    //     const [, pollData] = data.split(':');
    //     const [pollIndexStr, optionIndexStr] = pollData.split('_');
    //     const pollIndex = Number(pollIndexStr);
    //     const optionIndex = Number(optionIndexStr);

    //     if (
    //         pollIndex >= POLL_QUESTIONS.length ||
    //         optionIndex >= POLL_QUESTIONS[pollIndex].options.length
    //     ) {
    //         return ctx.answerCallbackQuery('Invalid poll data');
    //     }

    //     const currentPoll = POLL_QUESTIONS[pollIndex];
    //     const selectedOption = currentPoll.options[optionIndex];

    //     console.log(`poll_answer`, pollIndex, optionIndex, selectedOption);

    //     // Get current answers from Redis
    //     const currentAnswers = await redis
    //         .hGet(POLL_REDIS_KEY, String(ctx.from.id))
    //         .then((res: string | null) => (res ? JSON.parse(res) : []));

    //     // Add new answer
    //     const updatedAnswers = [
    //         ...currentAnswers,
    //         [currentPoll.question, selectedOption],
    //     ];

    //     // Store updated answers
    //     await redis.hSet(POLL_REDIS_KEY, {
    //         [ctx.from.id]: JSON.stringify(updatedAnswers),
    //     });

    //     let reply_markup: InlineKeyboard | undefined;
    //     let text: string = message.text || '';

    //     // Check if this is the last poll
    //     const isLastPoll = pollIndex === POLL_QUESTIONS.length - 1;

    //     if (isLastPoll) {
    //         // Last poll - show thanks message
    //         reply_markup = undefined;
    //         text = `${text} ✅`;

    //         await ctx.reply(
    //             "Congrats\\! You'll be one of the first to try true farming automation in action\\.\n\nThe first project to automize — Abstract\n\nWe'll ping you when it's live 🌀",
    //             {
    //                 parse_mode: 'MarkdownV2',
    //             }
    //         );
    //     } else {
    //         // Not last poll - show next poll
    //         const nextPollIndex = pollIndex + 1;
    //         const nextPoll = POLL_QUESTIONS[nextPollIndex];
    //         reply_markup = optionsToKeyboard(
    //             nextPoll.options,
    //             `poll:${nextPollIndex}`
    //         );
    //         text = `${text} ✅\n\n_${nextPoll.question}_`;
    //     }

    //     await ctx.api.editMessageText(
    //         message.chat.id,
    //         message.message_id,
    //         text,
    //         {
    //             reply_markup,
    //             parse_mode: 'MarkdownV2',
    //         }
    //     );
    //     return ctx.answerCallbackQuery();
    // });

    // bot.on('message', async (ctx) => {
    //     console.log(`message`, ctx.update.message);
    // });
};

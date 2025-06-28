export const IS_PROD_SERVER =
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

export const REDIS_URL = process.env.REDIS_URL;

export const TG_WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET || '';
export const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';

export const START_MESSAGE = `Welcome to Routie — your Web3 growth assistant!

No more manual farming. It keeps your time safe & sound.

1. <b>How it works</b>
Connect wallet → Choose project → Enter deposit → Launch farming route → Track progress or relax — it's all automated.

2. <b>How your data is protected</b>
We use Privy, trusted by OpenSea, Farcaster & more. Your data stays encrypted — we never see or store it.

3. <b>How to become Paver Durov 🥷</b>

We don't know. But how to become one of 500 Routie's supporters? By getting early access for sybmolic $2: skip the damn surveys and help us building &lt;3

You'll get: 

- 70% off your first route
- a seat at the table: help shape Routie’s future
– unlocking early features
- maybe even a sticker pack

🐣 We need believers. We need you. And if you ever needed an excuse to skip a few grindy nights — maybe you need Routie.`;

export const POLL_REDIS_KEY = `${
    IS_PROD_SERVER ? 'prod' : 'dev'
}_ai_sybil_poll`;

export const EARLY_ACCESS_COUNT_KEY = `${
    IS_PROD_SERVER ? 'prod' : 'dev'
}_early_access_count`;

export const POLL_QUESTIONS = [
    {
        question: 'How do you usually approach airdrop farming?',
        options: [
            'I follow public guides',
            'I come up with my own strategy',
            'A mix of both',
            "I don't farm yet, just exploring",
        ],
    },
    {
        question:
            'How many wallets do you actively use for farming or DeFi tasks?',
        options: ['Just 1', '2-5', '5-10', '10-100', '100+'],
    },
];

export const EARLY_BIRD_ACCESS_PRICE = process.env.EARLY_BIRD_ACCESS_PRICE;

export const ADMINS: Record<string, boolean> = {
    '1313487041': true,
    '1036753723': true,
};

export const EARLY_ACCESS_MAX_COUNT = 500;

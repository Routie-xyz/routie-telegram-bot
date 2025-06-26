export const IS_PROD_SERVER =
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

export const REDIS_URL = process.env.REDIS_URL;

export const TG_WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET || '';
export const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';

export const TG_BOT_ANIMATION_URL =
    process.env.TG_BOT_ANIMATION_URL ||
    'CgACAgIAAxkBAAIB7Whbuf3mL8cJlAKxtvHoTsZJJu3AAAIbdgACezTYSqSe-A8sgpU6NgQ';

export const POLL_REDIS_KEY = `${
    IS_PROD_SERVER ? 'prod' : 'dev'
}_ai_sybil_poll`;

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
};

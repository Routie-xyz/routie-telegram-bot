export type User = {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    languageCode: string;
    isHaveAccess: boolean;
    invoiceMessageId: number;
    startMessageId?: number;
};

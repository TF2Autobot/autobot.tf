import { Embeds, Webhook } from '../types/interfaces/DiscordWebhook';
import IOptions from './IOptions';
import axios, { AxiosError } from 'axios';

type Type = 'server' | 'priceUpdate';

export function setWebhook(type: Type, options: IOptions, content: string, embeds: Embeds[]): Webhook {
    const opt = options.discord[type];
    return {
        username: opt.displayName,
        avatar_url: opt.avatarUrl,
        content: content,
        embeds: embeds
    };
}

export function sendWebhook(url: string, webhook: Webhook): Promise<void> {
    return new Promise((resolve, reject) => {
        axios({
            method: 'POST',
            url: url,
            data: webhook
        })
            .then(() => {
                resolve();
            })
            .catch((err: AxiosError) => {
                reject({ error: err, webhook });
            });
    });
}

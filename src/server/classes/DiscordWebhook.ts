import { Embeds, Webhook, WebhookError } from '../types/interfaces/DiscordWebhook';
import IOptions from './IOptions';

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
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhook)
        })
            .then(res => {
                if (!res.ok) {
                    const error = new Error(`Request failed with status code ${res.status}`) as WebhookError;
                    error.status = res.status;
                    throw error;
                }
                resolve();
            })
            .catch((err: WebhookError) => {
                reject({ error: err, webhook });
            });
    });
}

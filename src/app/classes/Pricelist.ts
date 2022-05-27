import Currencies from '@tf2autobot/tf2-currencies';
import SKU from '@tf2autobot/tf2-sku';
import SchemaTF2 from './SchemaManager';
import { Schema } from '@tf2autobot/tf2-schema';
import IPricer, { Item, GetItemPriceResponse } from '../types/interfaces/IPricer';
import log from '../lib/logger';
import IOptions from './IOptions';
import Server from './Server';
import { setWebhook, sendWebhook } from './DiscordWebhook';
import { Webhook } from '../types/interfaces/DiscordWebhook';

interface Currency {
    keys: number;
    metal: number;
}

export interface Prices {
    buy: Currency;
    sell: Currency;
}

export interface EntryData {
    sku: string;
    name?: string;
    source?: string;
    buy: Currency | null;
    sell: Currency | null;
    time: number | null;
}

class Entry implements EntryData {
    sku: string;

    name?: string;

    source?: string;

    time: number | null;

    buy: Currencies | null;

    sell: Currencies | null;

    constructor(entry: EntryData) {
        this.sku = entry.sku;

        if (entry.name) {
            this.name = entry.name;
        }

        if (entry.source) {
            this.source = entry.source;
        }

        this.time = entry.time;
        this.buy = new Currencies(entry.buy);
        this.sell = new Currencies(entry.sell);
    }

    static fromData(data: EntryData): Entry {
        return new Entry(data);
    }

    getJSON(): EntryData {
        return {
            sku: this.sku,
            buy: this.buy === null ? null : this.buy.toJSON(),
            sell: this.sell === null ? null : this.sell.toJSON(),
            time: this.time
        };
    }
}

export interface PricesObject {
    [id: string]: Entry;
}

export interface PricesDataObject {
    [id: string]: EntryData;
}

export interface KeyPrices {
    buy: Currencies;
    sell: Currencies;
    time: number;
}

export default class Pricelist {
    prices: PricesObject = {};

    private keyPrices: KeyPrices;

    private schema: Schema;

    private readonly boundHandlePriceChange;

    private receivedCount = 0;

    private last1MinsReceivedCount = 0;

    private retryAttempted = 0;

    public isResettingPricelist = false;

    private isGettingPricelist = false;

    private hasAlreadyResetPricelist = false;

    dailyReceivedCount = 0;

    dailyUpdatedCount = 0;

    private resetInterval: NodeJS.Timeout;

    private autoPricerCheckInterval: NodeJS.Timeout;

    constructor(private server: Server, tf2schema: SchemaTF2, private pricer: IPricer, private options: IOptions) {
        this.boundHandlePriceChange = this.handlePriceChange.bind(this);
        this.schema = tf2schema.schema;
    }

    get keyPrice(): number {
        return this.keyPrices.sell.metal;
    }

    init(): Promise<void> {
        return new Promise((resolve, reject) => {
            log.info('Getting pricelist from prices.tf...');

            void this.pricer
                .getPricelist()
                .then(pricelist => {
                    this.setPricelist(pricelist.items);
                    this.setupPricerHealthCheck();

                    this.pricer.bindHandlePriceEvent(this.boundHandlePriceChange);

                    return resolve();
                })
                .catch(err => {
                    return reject(err);
                });
        });
    }

    shutdown(): void {
        clearInterval();
    }

    setPricelist(prices: Item[]): void {
        const count = prices.length;
        for (let i = 0; i < count; i++) {
            const entry = prices[i];

            if (entry.sku === null) {
                continue;
            }

            if (entry.buy === null) {
                entry.buy = new Currencies({
                    keys: 0,
                    metal: 0
                });
            }

            if (entry.sell === null) {
                entry.sell = new Currencies({
                    keys: 0,
                    metal: 0
                });
            }

            const newEntry = {
                sku: entry.sku,
                buy: new Currencies(entry.buy),
                sell: new Currencies(entry.sell),
                time: entry.time
            };

            this.prices[entry.sku] = Entry.fromData(newEntry);

            if (entry.sku === '5021;6') {
                this.keyPrices = {
                    buy: entry.buy,
                    sell: entry.sell,
                    time: entry.time
                };
            }
        }
    }

    private handlePriceChange(data: GetItemPriceResponse) {
        if (!data.sku) return;

        this.receivedCount++;

        if (data.buy !== null) {
            this.dailyReceivedCount++;
            const sku = data.sku;

            let oldPrices: {
                buy: Currencies;
                sell: Currencies;
            } = null;

            const newPrices = {
                buy: new Currencies(data.buy),
                sell: new Currencies(data.sell)
            };

            if (this.prices[sku]) {
                oldPrices = {
                    buy: this.prices[sku].buy,
                    sell: this.prices[sku].sell
                };

                // update data in pricelist (memory)
                if (sku === '5021;6') {
                    this.keyPrices = {
                        buy: new Currencies({
                            keys: 0,
                            metal: data.buy.metal
                        }),
                        sell: new Currencies({
                            keys: 0,
                            metal: data.sell.metal
                        }),
                        time: data.time ?? this.keyPrices.time
                    };
                    this.prices[sku].buy = this.keyPrices.buy;
                    this.prices[sku].sell = this.keyPrices.sell;
                } else {
                    this.prices[sku].buy = newPrices.buy;
                    this.prices[sku].sell = newPrices.sell;
                }
                this.prices[sku].time = data.time ?? this.prices[sku].time;
            } else {
                // Register new item
                const newEntry = {
                    sku: sku,
                    buy: newPrices.buy,
                    sell: newPrices.sell,
                    time: data.time
                };
                this.prices[sku] = this.prices[sku] = Entry.fromData(newEntry);
                oldPrices = {
                    buy: this.prices[sku].buy,
                    sell: this.prices[sku].sell
                };
            }

            let buyChangesValue = null;
            let sellChangesValue = null;

            let oldBuyValue = 0;
            let newBuyValue = 0;
            let oldSellValue = 0;
            let newSellValue = 0;

            if (data.sku === '5021;6') {
                oldBuyValue = oldPrices.buy.toValue();
                newBuyValue = newPrices.buy.toValue();
                oldSellValue = oldPrices.sell.toValue();
                newSellValue = newPrices.sell.toValue();
            } else {
                oldBuyValue = oldPrices.buy.toValue(this.keyPrice);
                newBuyValue = newPrices.buy.toValue(this.keyPrice);
                oldSellValue = oldPrices.sell.toValue(this.keyPrice);
                newSellValue = newPrices.sell.toValue(this.keyPrice);
            }

            buyChangesValue = Math.round(newBuyValue - oldBuyValue);
            sellChangesValue = Math.round(newSellValue - oldSellValue);

            if (buyChangesValue === 0 && sellChangesValue === 0) {
                // Ignore
                return;
            }

            if (sku === '5021;6') {
                this.server.discordWebhook.sendWebhookKeyUpdate(sku, newPrices, data.time);
            } else {
                this.server.discordWebhook.sendWebhookPriceUpdate(
                    sku,
                    newPrices,
                    data.time,
                    buyChangesValue,
                    sellChangesValue
                );
            }

            this.dailyUpdatedCount++;
        }
    }

    getPricesArray(onlyExist?: boolean): EntryData[] {
        const toArray: Entry[] = [];
        const skus = Object.keys(this.prices);

        for (let i = 0; i < skus.length; i++) {
            const sku = skus[i];
            if (!Object.prototype.hasOwnProperty.call(this.prices, sku)) {
                continue;
            }

            if (onlyExist && !this.schema.checkExistence(SKU.fromString(sku))) {
                continue;
            }

            const item = this.prices[sku];
            toArray.push(
                new Entry({
                    sku: sku,
                    name: this.schema.getName(SKU.fromString(sku), false),
                    source: 'bptf',
                    time: item.time,
                    buy: item.buy,
                    sell: item.sell
                })
            );
        }

        return toArray;
    }

    private resetPricelist() {
        this.isResettingPricelist = true;
        const skus = Object.keys(this.prices);

        for (let i = 0; i < skus.length; i++) {
            const sku = skus[i];
            if (!Object.prototype.hasOwnProperty.call(this.prices, sku)) {
                continue;
            }

            delete this.prices[sku];
        }
    }

    private setupPricerHealthCheck() {
        this.autoPricerCheckInterval = setInterval(() => {
            if (this.receivedCount - this.last1MinsReceivedCount === 0) {
                this.retryAttempted++;
                log.warn(
                    `[${this.retryAttempted}] No price changes in the last 1 minutes, retrying to connect to pricer websocket server...`
                );

                if (this.hasAlreadyResetPricelist === false && this.isGettingPricelist === false) {
                    this.isGettingPricelist = true;
                    this.pricer
                        .getPricelist()
                        .then(pricelist => {
                            // reset prices
                            this.resetPricelist();
                            this.setPricelist(pricelist.items);
                            this.isResettingPricelist = false;
                            this.isGettingPricelist = false;
                            this.hasAlreadyResetPricelist = true;

                            if (!this.pricer.isPricerConnecting()) {
                                this.pricer.connect();
                            }

                            setTimeout(() => {
                                this.hasAlreadyResetPricelist = false;
                            }, 5 * 60 * 1000);
                        })
                        .catch(err => {
                            log.error('Error on getting pricelist (on reset pricelist):', err);
                        });
                }
            } else {
                this.last1MinsReceivedCount = this.receivedCount;
                this.retryAttempted = 0;
            }
        }, 1 * 60 * 1000);
    }

    initDailyCount(): void {
        // set interval to check current time every 1 second.
        this.resetInterval = setInterval(() => {
            const now = new Date().toUTCString();

            if (now.includes(' 00:00:0')) {
                clearInterval(this.resetInterval);

                const webhook = setWebhook('priceUpdate', this.options, '', [
                    {
                        author: {
                            name: 'Daily Count Record',
                            url: '',
                            icon_url: ''
                        },
                        footer: {
                            text: `${now} • v${process.env.SERVER_VERSION}`
                        },
                        title: '',
                        fields: [
                            {
                                name: 'Data received',
                                value: this.dailyReceivedCount.toString()
                            },
                            {
                                name: 'Price updated',
                                value: this.dailyUpdatedCount.toString()
                            },
                            {
                                name: 'Total items',
                                value: Object.keys(this.prices).length.toString()
                            }
                        ],
                        color: '14051524'
                    }
                ]);

                this.sendDailyCount(webhook);

                // Reset counter
                this.dailyReceivedCount = 0;
                this.dailyUpdatedCount = 0;

                setTimeout(() => {
                    // after 10 seconds, we initiate this again.
                    this.initDailyCount();
                }, 10000);
            }
        }, 1000);
    }

    private sendDailyCount(webhook: Webhook): void {
        this.options.discord.priceUpdate.urls.forEach((url, i) => {
            sendWebhook(url, webhook)
                .then(() => log.info(`Sent daily record to Discord (${i})`))
                .catch(err => {
                    this.handleSendDailyCountError(err, webhook, i);
                });
        });
    }

    private resendDailyCount(webhook: Webhook, urlIndex: number): void {
        sendWebhook(this.options.discord.priceUpdate.urls[urlIndex], webhook)
            .then(() => log.info(`Resent daily record to Discord (${urlIndex})`))
            .catch(err => {
                this.handleSendDailyCountError(err, webhook, urlIndex);
            });
    }

    private handleSendDailyCountError(err: any, webhook: Webhook, urlIndex: number): void {
        /*eslint-disable */
        if (err.text) {
            const errContent = JSON.parse(err.text);
            if (errContent?.message === 'The resource is being rate limited.') {
                setTimeout(() => {
                    // retry to send after the retry value + 10 seconds
                    this.resendDailyCount(webhook, urlIndex);
                }, errContent.retry_after + 10000);
            }
        }
        /*eslint-enable */
    }
}

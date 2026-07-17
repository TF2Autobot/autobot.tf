import Currencies from '@tf2autobot/tf2-currencies';

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

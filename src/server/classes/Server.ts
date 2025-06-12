import log from '../lib/logger';
import IOptions from './IOptions';
import IPricer from '../types/interfaces/IPricer';
// import Pricelist from './Pricelist';
import SchemaManagerTF2 from './SchemaManager';
import ServerManager from './ServerManager';
import ExpressManager from './Express/ExpressManager';
// import DiscordWebhook from './DiscordWebhook';
import getCasestfCratesList from '../lib/tools/getCasestfCrateList';
import { EntryData, PricesDataObject } from './Pricelist';
import genPaths from '../resources/paths';
import { readFile } from '../lib/files';

export default class Server {
    // public pricelist: Pricelist;

    public expressManager: ExpressManager;

    // public discordWebhook: DiscordWebhook;

    public ready = false;

    public casestfCrateList: string[];

    public casestfCratesInterval: NodeJS.Timeout;

    public cachedPricelist: PricesDataObject;

    constructor(
        private readonly serverManager: ServerManager,
        public readonly pricer: IPricer,
        public readonly schemaManagerTF2: SchemaManagerTF2,
        public options: IOptions
    ) {
        this.expressManager = new ExpressManager(this);
        // this.discordWebhook = new DiscordWebhook(this, this.schemaManagerTF2.schema);
        // this.pricelist = new Pricelist(this, this.schemaManagerTF2, this.pricer, this.options);
    }

    async start(): Promise<void> {
        this.casestfCrateList = await getCasestfCratesList();
        this.getCasestfCratesInterval();
        await this.loadCachedPricelist();

        // Disable pricelist and prices.tf websocket for now
        return new Promise((resolve, reject) => {
            log.debug('Setting up server...');
            this.expressManager
                .init()
                .then(() => {
                    this.setReady = true;
                    resolve();
                })
                .catch(err => {
                    if (err) {
                        return reject(err);
                    }

                    if (this.serverManager.isStopping) {
                        // Shutdown is requested, break out of the startup process
                        return resolve();
                    }
                });
        });
    }

    set setReady(isReady: boolean) {
        this.ready = isReady;
    }

    get isReady(): boolean {
        return this.ready;
    }

    private loadCachedPricelist(): Promise<void> {
        return new Promise((resolve, reject) => {
            const path = genPaths();
            readFile(path.files.pricelist, true)
                .then((data: CachedPricelist) => {
                    this.cachedPricelist = data.items.reduce((obj, i) => {
                        obj[i.sku] = i;
                        return obj;
                    }, {});
                    return resolve();
                })
                .catch(err => {
                    return reject(err);
                });
        });
    }

    private getCasestfCratesInterval(): void {
        this.casestfCratesInterval = setInterval(() => {
            void getCasestfCratesList().then(crateList => {
                if (crateList.length > 0) {
                    this.casestfCrateList = crateList;
                }
            });
            // Check every 12 hours
        }, 12 * 60 * 60 * 1000);
    }
}

interface CachedPricelist {
    success: boolean;
    items: EntryData[];
}

import log from '../lib/logger';
import IOptions from './IOptions';
import SchemaManagerTF2 from './SchemaManager';
import ServerManager from './ServerManager';
import ExpressManager from './Express/ExpressManager';
import genPaths from '../resources/paths';
import { readFile } from '../lib/files';
import { EntryData, PricesDataObject } from '../types/interfaces/Pricelist';

export default class Server {
    public expressManager: ExpressManager;

    public ready = false;

    public cachedPricelist: PricesDataObject;

    constructor(
        private readonly serverManager: ServerManager,
        public readonly schemaManagerTF2: SchemaManagerTF2,
        public options: IOptions
    ) {
        this.expressManager = new ExpressManager(this);
    }

    async start(): Promise<void> {
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
}

interface CachedPricelist {
    success: boolean;
    items: EntryData[];
}

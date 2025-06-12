import log from '../../../lib/logger';
import express, { Router } from 'express';
import SKU from '@tf2autobot/tf2-sku';
import testSKU from '../utils/testSKU';
import Server from '../../Server';
import { Schema } from '@tf2autobot/tf2-schema';
import { rateLimiterUsingThirdParty } from '../Middlewares/rateLimiter';

export default class Json {
    private schema: Schema;

    constructor(private server: Server) {
        this.schema = this.server.schemaManagerTF2.schema;
    }

    init(): Router {
        // should do something at GET /json (/) ?

        const router = express.Router();

        /*
         * Get schema for TF2 items
         * Example: https://autobot.tf/json/schema
         *
         * on success, return Schema
         */
        router.get('/schema', (req, res) => {
            log.info(`Got GET /json/schema request`);
            res.json(this.schema);
        });

        /*
         * Get an pricelist in PricesObject
         * Example: https://autobot.tf/json/pricelist-array
         *
         * on success, return:
         * { success: true, items: PricesObject }
         */
        router.get('/pricelist', (req, res) => {
            log.info(`Got GET /json/pricelist request`);
            res.status(503).json({
                message: 'This endpoint is no longer available as prices.tf service ended.'
            });
        });

        /*
         * Get an pricelist in Entry[]
         * Example: https://autobot.tf/json/pricelist-array
         *
         * on success, return:
         * { success: true, items: Entry[] }
         */
        router.get('/pricelist-array', rateLimiterUsingThirdParty, (req, res) => {
            log.info(`Got GET /json/pricelist-array${req.query?.onlyExist === 'true' ? ' (onlyExist)' : ''} request`);
            res.status(503).json({
                message: 'This endpoint is no longer available as prices.tf service ended.'
            });
        });

        /*
         * Get an item
         * Example: https://autobot.tf/json/items/5021;6
         *
         * on success, return:
         * { success: true, sku: string; name: string; time: number; buy: Currencies; sell: Currencies }
         */
        router.get('/items/:sku', (req, res) => {
            res.status(503).json({
                message: 'This endpoint is no longer available as prices.tf service ended.'
            });
        });

        // Utilities (No longer available)

        router.get('/utils/getSku', (req, res) => {
            res.status(503).json({
                message:
                    'This endpoint is no longer available. Instead, please use https://schema.autobot.tf/getSku/fromName/{name}. Visit https://schema.autobot.tf for more.'
            });
        });

        router.get('/utils/getName', (req, res) => {
            res.status(503).json({
                message:
                    'This endpoint is no longer available. Instead, please use https://schema.autobot.tf/getName/fromSku/{sku}. Visit https://schema.autobot.tf for more.'
            });
        });

        router.get('/utils/getSkuBulk', (req, res) => {
            res.status(503).json({
                message:
                    'This endpoint is no longer available. Instead, please use https://schema.autobot.tf/getSku/fromNameBulk. Visit https://schema.autobot.tf for more.'
            });
        });

        router.get('/utils/getNameBulk', (req, res) => {
            res.status(503).json({
                message:
                    'This endpoint is no longer available. Instead, please use https://schema.autobot.tf/getName/fromSkuBulk. Visit https://schema.autobot.tf for more.'
            });
        });

        return router;
    }
}

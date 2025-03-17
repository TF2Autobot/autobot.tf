import { Prices } from 'src/server/classes/Pricelist';
import log from '../logger';
import PricesTfApi from '../pricer/pricestf/prices-tf-api';

export default async function getCasestfPriceList(): Promise<CasesTFPrices> {
    try {
        log.info('Getting prices from cases.tf...');
        const response = await PricesTfApi.apiRequest(
            'GET',
            '/backend',
            { action: 'getprices' },
            null,
            null,
            'https://backend.cases.tf'
        );
        
        // eslint-disable-next-line
        // @ts-ignore
        return response ?? {};
    } catch (e) {
        log.error(`Error fetching pricelist from cases.tf: ${String(e)}`);
        return {};
    }
}

export interface CasesTFPrices {
    [sku: string]: Prices
}
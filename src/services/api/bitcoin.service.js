import { DbService } from '../storage/db.service';

export class BitcoinService {
    static BASE_URL = 'https://api.coingecko.com/api/v3';
    static CACHE_TTL = {
        PRICE: 5 * 60 * 1000,         
        HOURLY: 60 * 60 * 1000,       
        DAILY: 24 * 60 * 60 * 1000,   
    };

    static async fetchHistoricalData(interval) {
        const cacheKey = `historical_${interval}`;
        
        const cachedData = await DbService.get(DbService.STORES.HISTORICAL_DATA, cacheKey);
        const now = Date.now();

        if (cachedData && cachedData.timestamp) {
            const age = now - cachedData.timestamp;
            if (interval <= 3600 && age < this.CACHE_TTL.PRICE) return cachedData.data;
            if (interval <= 86400 && age < this.CACHE_TTL.HOURLY) return cachedData.data;
            if (age < this.CACHE_TTL.DAILY) return cachedData.data;
        }

        try {
            const days = Math.ceil(interval / 86400);
            const url = `${this.BASE_URL}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`;
            
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (cachedData?.data) {
                    return cachedData.data;
                }
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            
            const historicalData = data.prices.map(([timestamp, price]) => ({
                timestamp,
                price,
                volume: data.total_volumes.find(v => v[0] === timestamp)?.[1] || 0
            }));

            await DbService.set(DbService.STORES.HISTORICAL_DATA, {
                key: cacheKey,
                timestamp: now,
                data: historicalData
            });

            return historicalData;
        } catch (error) {
            console.warn('API fetch failed, using cached data if available');
            if (cachedData?.data) {
                return cachedData.data;
            }
            throw new Error(`Failed to fetch Bitcoin data: ${error.message}`);
        }
    }

    static async fetchLatestPrice() {
        const cacheKey = 'latest_price';
        const cachedPrice = await DbService.get(DbService.STORES.PRICE_CACHE, cacheKey);
        const now = Date.now();

        if (cachedPrice && (now - cachedPrice.timestamp) < this.CACHE_TTL.PRICE) {
            return cachedPrice.data;
        }

        try {
            const url = `${this.BASE_URL}/simple/price?ids=bitcoin&vs_currencies=usd`;
            const response = await fetch(url);

            if (!response.ok) {
                if (cachedPrice?.data) return cachedPrice.data;
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const price = {
                timestamp: now,
                price: data.bitcoin.usd
            };

            await DbService.set(DbService.STORES.PRICE_CACHE, {
                key: cacheKey,
                timestamp: now,
                data: price
            });

            return price;
        } catch (error) {
            if (cachedPrice?.data) return cachedPrice.data;
            throw new Error(`Failed to fetch latest price: ${error.message}`);
        }
    }
}

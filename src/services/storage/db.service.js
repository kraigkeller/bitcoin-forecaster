class DbService {
    static DB_NAME = 'bitcoin_forecaster';
    static DB_VERSION = 1;
    
    static STORES = {
        HISTORICAL_DATA: 'historical_data',
        PRICE_CACHE: 'price_cache',
        SETTINGS: 'settings',
        ANALYSIS: 'analysis',
        FORECASTS: 'forecasts'
    };
    
    static async initDb() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.STORES.HISTORICAL_DATA)) {
                    const historyStore = db.createObjectStore(this.STORES.HISTORICAL_DATA, { 
                        keyPath: 'id', autoIncrement: true 
                    });
                    historyStore.createIndex('timestamp', 'timestamp');
                    historyStore.createIndex('interval_timestamp', ['interval', 'timestamp']);
                }
                
                if (!db.objectStoreNames.contains(this.STORES.PRICE_CACHE)) {
                    const priceStore = db.createObjectStore(this.STORES.PRICE_CACHE, { 
                        keyPath: 'id', autoIncrement: true 
                    });
                    priceStore.createIndex('timestamp', 'timestamp');
                }

                if (!db.objectStoreNames.contains(this.STORES.SETTINGS)) {
                    db.createObjectStore(this.STORES.SETTINGS, { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains(this.STORES.ANALYSIS)) {
                    const analysisStore = db.createObjectStore(this.STORES.ANALYSIS, { 
                        keyPath: 'id', autoIncrement: true 
                    });
                    analysisStore.createIndex('type_timestamp', ['type', 'timestamp']);
                }

                if (!db.objectStoreNames.contains(this.STORES.FORECASTS)) {
                    const forecastStore = db.createObjectStore(this.STORES.FORECASTS, { 
                        keyPath: 'id', autoIncrement: true 
                    });
                    forecastStore.createIndex('strategy_timestamp', ['strategy', 'timestamp']);
                }
            };
        });
    }

    static async getDb() {
        if (!this._db) {
            this._db = await this.initDb();
        }
        return this._db;
    }

    static async getAllInRange(storeName, indexName, start, end) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = indexName ? store.index(indexName) : store;
            const range = IDBKeyRange.bound(start, end);
            const request = index.getAll(range);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    static async get(storeName, key) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    static async set(storeName, value) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            try {
                const valueWithTimestamp = {
                    ...value,
                    timestamp: value.timestamp || Date.now()
                };
                
                const plainValue = JSON.parse(JSON.stringify(valueWithTimestamp));
                
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(plainValue);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            } catch (error) {
                console.error('Serialization error:', error);
                reject(new Error(`Data serialization failed: ${error.message}`));
            }
        });
    }

    static async batchSet(storeName, values) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            try {
                const cleanValues = values.map(value => 
                    JSON.parse(JSON.stringify({
                        ...value,
                        value: typeof value.value === 'object' ? 
                            JSON.parse(JSON.stringify(value.value)) : 
                            value.value
                    }))
                );
                
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                
                let completed = 0;
                cleanValues.forEach(value => {
                    const request = store.put(value);
                    request.onsuccess = () => {
                        completed++;
                        if (completed === cleanValues.length) {
                            resolve();
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Batch serialization error:', error);
                reject(new Error('Batch data serialization failed'));
            }
        });
    }

    static async clear(storeName) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    static async deleteOlderThan(storeName, timestamp) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                
                const request = store.getAllKeys();
                
                request.onerror = () => reject(request.error);
                request.onsuccess = async () => {
                    const keys = request.result;
                    const deletePromises = keys
                        .filter(async key => {
                            const record = await this.get(storeName, key);
                            return record?.timestamp && record.timestamp < timestamp;
                        })
                        .map(key => 
                            new Promise((res, rej) => {
                                const delRequest = store.delete(key);
                                delRequest.onerror = () => rej(delRequest.error);
                                delRequest.onsuccess = () => res();
                            })
                        );
                    
                    try {
                        await Promise.all(deletePromises);
                        resolve();
                    } catch (error) {
                        console.warn(`Cleanup error in ${storeName}:`, error);
                        resolve();
                    }
                };
            } catch (error) {
                console.warn(`Cleanup skipped for ${storeName}:`, error);
                resolve();
            }
        });
    }

    static async query(storeName, indexName, range) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = indexName ? store.index(indexName) : store;
            const request = range ? index.getAll(range) : index.getAll();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
}

export { DbService };

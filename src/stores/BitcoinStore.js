import { makeAutoObservable, runInAction } from 'mobx';
import { BitcoinService } from '../services/api/bitcoin.service';
import TechnicalAnalysis from '../services/analysis/technical.service';
import { TradingStrategies } from '../services/trading/strategies.service';
import { standardDeviation } from '../utils/math.utils';
import seedrandom from 'seedrandom';
import { DbService } from '../services/storage/db.service';

class BitcoinStore {
    currentPrice = null;
    priceHistory = [];
    simulatedPrices = [];
    loading = false;
    error = null;
    settings = {
        historicalInterval: 86400,
        forecastInterval: 86400,
        tradingStrategy: 'trend',
    };
    historicalPatterns = {
        dailyVolatility: 0.03,
        bullishTrend: 0.015,
        bearishTrend: -0.01,
        cycleLength: 365,
        supportLevels: [],
        resistanceLevels: []
    };
    technicalIndicators = {
        macd: null,
        rsi: null,
        bollingerBands: null,
        patterns: [],
        volatility: null
    };
    cachedData = new Map(); 
    lastUpdate = null;

    strategies = TradingStrategies;

    constructor() {
        makeAutoObservable(this);
        this.initializeFromCache();
        this.startAutoRefresh();
    }

    async initializeFromCache() {
        try {
            const settings = await DbService.get(DbService.STORES.SETTINGS, 'user_settings');
            if (settings?.value) {
                runInAction(() => {
                    this.settings = { ...this.settings, ...settings.value };
                });
            }

            const patterns = await DbService.get(DbService.STORES.ANALYSIS, ['patterns', Date.now()]);
            if (patterns?.value) {
                runInAction(() => {
                    this.historicalPatterns = { ...this.historicalPatterns, ...patterns.value };
                });
            }

            const interval = this.settings.historicalInterval;
            const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const cachedPrices = await DbService.getAllInRange(
                DbService.STORES.HISTORICAL_DATA,
                'timestamp',
                weekAgo,
                Date.now()
            );

            if (cachedPrices?.length) {
                runInAction(() => {
                    this.priceHistory = cachedPrices;
                    this.currentPrice = cachedPrices[cachedPrices.length - 1].price;
                    this.calculateHistoricalPatterns(cachedPrices);
                });
            } else {
                await this.fetchBitcoinData();
            }

            const indicators = await DbService.get(DbService.STORES.ANALYSIS, ['indicators', Date.now()]);
            if (indicators?.value) {
                runInAction(() => {
                    this.technicalIndicators = { ...this.technicalIndicators, ...indicators.value };
                });
            }

            this.cleanupOldData();
        } catch (error) {
            console.error('Cache initialization error:', error);
            this.fetchBitcoinData();
        }
    }

    async cleanupOldData() {
        const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        await Promise.all([
            DbService.deleteOlderThan(DbService.STORES.HISTORICAL_DATA, monthAgo),
            DbService.deleteOlderThan(DbService.STORES.PRICE_CACHE, monthAgo),
            DbService.deleteOlderThan(DbService.STORES.ANALYSIS, monthAgo),
            DbService.deleteOlderThan(DbService.STORES.FORECASTS, monthAgo),
        ]);
    }

    startAutoRefresh() {
        setInterval(() => this.refreshCurrentPrice(), 60000);
    }

    async refreshCurrentPrice() {
        try {
            const latestData = await BitcoinService.fetchLatestPrice();
            const minInterval = this.getMinimumInterval();

            if (minInterval < 86400) {
                const detailedData = await BitcoinService.fetchHistoricalData(minInterval);
                if (detailedData.length > 0) {
                    latestData.price = detailedData[detailedData.length - 1].price;
                }
            }

            runInAction(() => {
                this.currentPrice = latestData.price;
                this.lastUpdate = Date.now();
                
                if (this.shouldAppendToHistory(latestData)) {
                    this.appendToHistory(latestData);
                    this.updateAnalytics();
                }
            });
        } catch (err) {
            console.error('Failed to refresh price:', err);
        }
    }

    shouldAppendToHistory(newData) {
        if (!this.priceHistory.length) return true;
        const lastEntry = this.priceHistory[this.priceHistory.length - 1];
        const timeDiff = newData.timestamp - lastEntry.timestamp;
        return timeDiff >= this.getMinimumInterval();
    }

    getMinimumInterval() {
        const timeRange = this.settings.historicalInterval;
        if (timeRange <= 3600) return 60;
        if (timeRange <= 7200) return 300;
        if (timeRange <= 86400) return 900;
        if (timeRange <= 604800) return 3600;
        if (timeRange <= 2592000) return 86400;
        return 86400;
    }

    appendToHistory(newData) {
        this.priceHistory = [...this.priceHistory, {
            ...newData,
            isHistorical: true
        }];
        
        this.priceHistory = this.resampleData(this.priceHistory, this.getMinimumInterval());
    }

    resampleData(data, interval) {
        const groups = new Map();
        data.forEach(point => {
            const groupKey = Math.floor(point.timestamp / interval) * interval;
            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    timestamp: groupKey,
                    price: point.price,
                    high: point.price,
                    low: point.price,
                    open: point.price,
                    close: point.price,
                    volume: point.volume || 0
                });
            } else {
                const group = groups.get(groupKey);
                group.high = Math.max(group.high, point.price);
                group.low = Math.min(group.low, point.price);
                group.close = point.price;
                group.volume += point.volume || 0;
            }
        });

        return Array.from(groups.values());
    }

    async fetchBitcoinData() {
        const interval = this.settings.historicalInterval;
        
        try {
            this.loading = true;
            this.error = null;

            const historicalData = await BitcoinService.fetchHistoricalData(
                Math.max(this.getMinimumInterval(), interval)
            );
            
            if (!historicalData?.length) {
                throw new Error('No historical data received');
            }

            await DbService.set(DbService.STORES.HISTORICAL_DATA, {
                interval,
                data: historicalData,
                timestamp: Date.now()
            });

            runInAction(() => {
                this.priceHistory = historicalData;
                this.currentPrice = historicalData[historicalData.length - 1].price;
                this.calculateHistoricalPatterns(historicalData);
                this.updateForecast();
                this.error = null;
            });
        } catch (err) {
            console.error('Bitcoin data fetch error:', err);
            
            const cachedData = await DbService.get('historical_data', interval);
            
            runInAction(() => {
                this.error = err.message;
                if (cachedData?.data) {
                    this.priceHistory = cachedData.data;
                    this.currentPrice = cachedData.data[cachedData.data.length - 1].price;
                    this.calculateHistoricalPatterns(cachedData.data);
                } else {
                    const simulatedData = this.generateRealisticHistoryData(Math.ceil(interval / 86400));
                    this.priceHistory = simulatedData;
                    this.currentPrice = simulatedData[simulatedData.length - 1].price;
                    this.calculateHistoricalPatterns(simulatedData);
                }
                this.updateForecast();
            });
        } finally {
            runInAction(() => {
                this.loading = false;
            });
        }
    }

    async updateSetting(key, value) {
        runInAction(() => {
            this.settings[key] = value;
        });

        const settingsData = {
            key: 'user_settings',
            value: {
                historicalInterval: this.settings.historicalInterval,
                forecastInterval: this.settings.forecastInterval,
                tradingStrategy: this.settings.tradingStrategy
            },
            timestamp: Date.now()
        };

        try {
            await DbService.set(DbService.STORES.SETTINGS, settingsData);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }

        if (key === 'historicalInterval') {
            await this.fetchBitcoinData();
        } else if (key === 'forecastInterval' || key === 'tradingStrategy') {
            await this.updateForecast();
        }
    }

    async calculateHistoricalPatterns(priceData) {
        if (!priceData.length) return;

        const prices = priceData.map(d => d.price);
        const volumes = priceData.map(d => d.volume || 0);

        const macd = TechnicalAnalysis.calculateMACD(priceData);
        const rsi = TechnicalAnalysis.calculateRSI(prices);
        const bollingerBands = TechnicalAnalysis.calculateBollingerBands(priceData);
        const volatility = TechnicalAnalysis.analyzeVolatility(priceData);
        const patterns = TechnicalAnalysis.detectAdvancedPatterns(prices);
        const volumeAnalysis = TechnicalAnalysis.analyzeVolume(prices, volumes);
        const supportResistance = TechnicalAnalysis.findSupportResistanceLevels(priceData);
        const elliottWaves = TechnicalAnalysis.findElliottWaves(prices);
        const fibLevels = TechnicalAnalysis.calculateFibonacciLevels(Math.max(...prices), Math.min(...prices));

        runInAction(() => {
            this.technicalIndicators = {
                macd,
                rsi,
                bollingerBands,
                volatility,
                patterns: patterns.patterns,
                fibonacci: patterns.fibonacci,
                elliottWaves,
                volumeAnalysis,
                supportResistance,
                fibonacciLevels: fibLevels
            };

            this.historicalPatterns = {
                dailyVolatility: volatility.current,
                bullishTrend: this.calculateBullishTrend(macd, rsi, bollingerBands),
                bearishTrend: this.calculateBearishTrend(macd, rsi, bollingerBands),
                cycleLength: this.detectCycleLength(prices),
                supportLevels: supportResistance.filter(level => level.type === 'support'),
                resistanceLevels: supportResistance.filter(level => level.type === 'resistance')
            };
        });

        await this.updateAnalytics();
        this.updateForecast();
    }

    calculateBullishTrend(macd, rsi, bands) {
        const macdStrength = macd.histogram.slice(-5).filter(h => h > 0).length / 5;
        const rsiStrength = rsi.slice(-5).filter(r => r > 50).length / 5;
        const priceAboveMiddle = this.currentPrice > bands[bands.length - 1]?.middle ? 1 : 0;
        return (macdStrength + rsiStrength + priceAboveMiddle) / 3 * 0.05;
    }

    calculateBearishTrend(macd, rsi, bands) {
        const macdStrength = macd.histogram.slice(-5).filter(h => h < 0).length / 5;
        const rsiStrength = rsi.slice(-5).filter(r => r < 50).length / 5;
        const priceBelowMiddle = this.currentPrice < bands[bands.length - 1]?.middle ? 1 : 0;
        return -1 * (macdStrength + rsiStrength + priceBelowMiddle) / 3 * 0.02;
    }

    detectCycleLength(prices) {
        return 365;
    }

    generateRealisticHistoryData(days) {
        const data = [];
        let price = this.currentPrice || 45000;
        const now = Date.now();
        let trend = this.historicalPatterns.bullishTrend;
        let lastCycleChange = 0;

        for (let i = days; i >= 0; i--) {
            if (i % this.historicalPatterns.cycleLength === 0) {
                trend = lastCycleChange > 0 ? 
                    this.historicalPatterns.bearishTrend : 
                    this.historicalPatterns.bullishTrend;
                lastCycleChange = trend;
            }

            const volatility = (Math.random() - 0.5) * this.historicalPatterns.dailyVolatility;
            const trendImpact = trend * (1 + Math.random() * 0.5);
            const priceChange = price * (volatility + trendImpact);
            const newPrice = price + priceChange;

            price = this.calculatePriceWithLevels(newPrice);

            data.push({
                timestamp: now - i * 24 * 60 * 60 * 1000,
                price: Math.max(1000, price),
                isHistorical: true
            });
        }

        return data;
    }

    calculatePriceWithLevels(price) {
        const nearestSupport = this.historicalPatterns.supportLevels
            .find(level => price < level);
        const nearestResistance = this.historicalPatterns.resistanceLevels
            .find(level => price > level);

        if (nearestSupport && Math.random() > 0.7) {
            return nearestSupport * (1 + Math.random() * 0.02);
        } 
        if (nearestResistance && Math.random() > 0.7) {
            return nearestResistance * (1 - Math.random() * 0.02);
        }
        return price;
    }

    calculateTechnicalAdjustment(fibLevels, elliottWaves, price) {
        let adjustment = 0.001;

        if (fibLevels?.length) {
            const nearestFib = fibLevels.reduce((prev, curr) => 
                Math.abs(curr.price - price) < Math.abs(prev.price - price) ? curr : prev
            );
            adjustment += (nearestFib.price - price) / price * 0.05;
        }

        if (elliottWaves?.length === 5) {
            const lastWave = elliottWaves[4];
            adjustment += lastWave.direction === 'up' ? 0.01 : -0.005;
        }

        return adjustment;
    }

    calculateTrendAdjustment(macd) {
        if (!macd?.histogram?.length) {
            return 0.001;
        }

        const recentMACD = macd.histogram.slice(-5);
        const trendStrength = recentMACD.reduce((sum, val) => sum + (val || 0), 0) / recentMACD.length;
        return trendStrength > 0 ? trendStrength * 0.02 : trendStrength * 0.01;
    }

    predictBitcoinPrice(price, day, randomSeed = null) {
        if (randomSeed !== null) seedrandom(randomSeed + day);

        const { macd, rsi, bollingerBands, volatility } = this.technicalIndicators;

        const recentHistory = this.priceHistory.slice(-5);
        const marketMomentum = recentHistory.length > 1 ? 
            (recentHistory[recentHistory.length - 1].price - recentHistory[0].price) / 
            recentHistory[0].price : 0;

        const baseVolatility = volatility?.current || 0.02;
        const randomComponent = ((Math.random() * 2 - 1) * baseVolatility) * 0.5;
        const trendComponent = marketMomentum * Math.exp(-day * 0.05) * 0.3;
        
        let technicalComponent = 0;
        if (rsi && rsi.length > 0) {
            const currentRsi = rsi[rsi.length - 1];
            if (currentRsi < 30) technicalComponent += 0.01;
            else if (currentRsi > 70) technicalComponent -= 0.01;
        }

        const macdEffect = macd?.histogram ? 
            Math.max(-0.01, Math.min(0.01, macd.histogram[macd.histogram.length - 1] * 0.05)) : 0;

        let meanReversionComponent = 0;
        if (bollingerBands?.length > 0) {
            const currentBand = bollingerBands[bollingerBands.length - 1];
            const deviation = (currentBand.middle - price) / price;
            meanReversionComponent = deviation * 0.1;
        }

        const growthBias = 0.0005;
        const totalChange = randomComponent + trendComponent + technicalComponent + 
                          macdEffect + meanReversionComponent + growthBias;

        const maxDailyUp = 0.15;
        const maxDailyDown = -0.12;
        const limitedChange = Math.max(Math.min(totalChange, maxDailyUp), maxDailyDown);

        const newPrice = price * (1 + limitedChange);
        return this.calculatePriceWithLevels(newPrice);
    }

    simulateBitcoinPrices(initialPrice, numDays, randomSeed = null) {
        const prices = [initialPrice];
        let price = initialPrice;

        for (let i = 0; i < numDays; i++) {
            price = this.predictBitcoinPrice(price, i, randomSeed);
            price = this.calculatePriceWithLevels(price);
            prices.push(price);
        }

        return prices;
    }

    analyzeHistoricalPatterns() {
        const chunks = [];
        for (let i = 0; i < this.priceHistory.length - 30; i += 30) {
            const chunk = this.priceHistory.slice(i, i + 30);
            const chunkStart = chunk[0].price;
            const chunkEnd = chunk[chunk.length - 1].price;
            const volatility = chunk.reduce((acc, curr, idx, arr) => {
                if (idx === 0) return acc;
                const dailyChange = Math.abs((curr.price - arr[idx - 1].price) / arr[idx - 1].price);
                return acc + dailyChange;
            }, 0) / (chunk.length - 1);
            
            chunks.push({
                trend: (chunkEnd - chunkStart) / chunkStart,
                volatility,
                avgPrice: chunk.reduce((acc, curr) => acc + curr.price, 0) / chunk.length
            });
        }

        return {
            avgTrend: chunks.reduce((acc, chunk) => acc + chunk.trend, 0) / chunks.length,
            avgVolatility: chunks.reduce((acc, chunk) => acc + chunk.volatility, 0) / chunks.length,
            priceRanges: chunks.map(chunk => chunk.avgPrice)
        };
    }

    calculateStandardDeviation(arr) {
        const mean = arr.reduce((a, b) => a + b) / arr.length;
        const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
        return Math.sqrt(variance);
    }

    async updateForecast() {
        if (!this.currentPrice || this.settings.forecastInterval === 0) {
            this.simulatedPrices = [];
            return;
        }

        const lastHistoricalPrice = this.priceHistory[this.priceHistory.length - 1]?.price || this.currentPrice;
        const prices = this.simulateBitcoinPrices(
            lastHistoricalPrice,
            Math.ceil(this.settings.forecastInterval / 86400),
            42
        );

        const now = Date.now();
        const interval = 86400000;
        this.simulatedPrices = prices.map((price, index) => ({
            timestamp: now + index * interval,
            price,
            isHistorical: false
        }));

        try {
            await DbService.set(DbService.STORES.FORECASTS, {
                strategy: this.settings.tradingStrategy,
                timestamp: Date.now(),
                value: Array.from(this.simulatedPrices)
            });
        } catch (error) {
            console.warn('Failed to save forecast:', error);
        }
    }

    get chartData() {
        const historicalData = this.priceHistory.map(d => ({
            ...d,
            isHistorical: true
        }));
        
        const forecastData = this.simulatedPrices.map(d => ({
            ...d,
            isHistorical: false
        }));

        return [...historicalData, ...forecastData];
    }

    get tradingSignal() {
        if (!this.chartData.length) return '';
        return this.calculateTradingSignal(this.chartData);
    }

    calculateTradingSignal(data) {
        return this.strategies[this.settings.tradingStrategy]?.calculate(data) || 'HOLD';
    }

    async updateAnalytics() {
        try {
            const serializedPatterns = {
                dailyVolatility: this.historicalPatterns.dailyVolatility,
                bullishTrend: this.historicalPatterns.bullishTrend,
                bearishTrend: this.historicalPatterns.bearishTrend,
                cycleLength: this.historicalPatterns.cycleLength,
                supportLevels: [...this.historicalPatterns.supportLevels],
                resistanceLevels: [...this.historicalPatterns.resistanceLevels]
            };

            const serializedIndicators = {
                macd: this.technicalIndicators.macd ? {
                    histogram: [...this.technicalIndicators.macd.histogram]
                } : null,
                rsi: this.technicalIndicators.rsi ? [...this.technicalIndicators.rsi] : null,
                volatility: this.technicalIndicators.volatility ? {
                    current: this.technicalIndicators.volatility.current,
                    trend: { ...this.technicalIndicators.volatility.trend }
                } : null
            };

            await DbService.set(DbService.STORES.ANALYSIS, {
                type: 'patterns',
                timestamp: Date.now(),
                value: serializedPatterns
            });

            await DbService.set(DbService.STORES.ANALYSIS, {
                type: 'indicators',
                timestamp: Date.now(),
                value: serializedIndicators
            });

            await this.updateForecast();
        } catch (error) {
            console.error('Failed to save analytics:', error);
        }
    }

    calculateBaseChange(price, bands, rsi) {
        if (!bands || !price) return 0.001;

        let baseChange = 0;
        
        if (rsi < 30) {
            baseChange += 0.005 * (1 - (rsi / 30));
        } else if (rsi > 70) {
            baseChange -= 0.002 * ((rsi - 70) / 30);
        }
        
        if (bands.middle) {
            const deviation = (bands.middle - price) / price;
            baseChange += deviation * 0.03;
        }

        return baseChange + 0.001;
    }

    calculateVolatilityAdjustment(volatility) {
        if (!volatility?.current) return 0.0005;

        const baseVolatility = volatility.current;
        const randomFactor = (Math.random() + Math.random() + Math.random()) / 3 - 0.3;
        return baseVolatility * randomFactor * 0.3;
    }

    calculateVolumeImpact(volumeAnalysis) {
        if (!volumeAnalysis) return 0.0005;
        const { isAccumulation, isDistribution, volumeTrend } = volumeAnalysis;
        
        if (isAccumulation) return 0.004;
        if (isDistribution) return -0.002;
        return volumeTrend?.trend === 'increasing' ? 0.002 : -0.001;
    }
}

if (!Math.std) {
    Math.std = function(arr) {
        const mean = arr.reduce((a, b) => a + b) / arr.length;
        const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
        return Math.sqrt(variance);
    };
}

export const bitcoinStore = new BitcoinStore();

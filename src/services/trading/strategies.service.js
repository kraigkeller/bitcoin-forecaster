import { standardDeviation } from '../../utils/math.utils';

if (!Math.std) {
    Math.std = function(arr) {
        const mean = arr.reduce((a, b) => a + b) / arr.length;
        const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
        return Math.sqrt(variance);
    };
}

const calculateMovingAverage = (data, period) => {
    const prices = data.slice(-period).map(d => d.price);
    return prices.reduce((a, b) => a + b, 0) / prices.length;
};

export const TradingStrategies = {
    arbitrage: {
        name: 'Arbitrage',
        description: 'Exploits price differences across different timeframes',
        calculate: (data) => {
            const shortTerm = data.slice(-5);
            const longTerm = data.slice(-20);
            const shortAvg = shortTerm.reduce((acc, val) => acc + val.price, 0) / shortTerm.length;
            const longAvg = longTerm.reduce((acc, val) => acc + val.price, 0) / longTerm.length;
            const diff = (shortAvg - longAvg) / longAvg;

            if (Math.abs(diff) > 0.05) return diff > 0 ? 'SELL' : 'BUY';
            return 'STAY';
        }
    },

    meanReversion: {
        name: 'Mean Reversion',
        description: 'Assumes prices will return to their historical average',
        calculate: (data) => {
            const prices = data.map(d => d.price);
            const mean = prices.reduce((a, b) => a + b) / prices.length;
            const lastPrice = prices[prices.length - 1];
            const deviation = (lastPrice - mean) / mean;

            if (deviation > 0.1) return 'SELL';
            if (deviation < -0.1) return 'BUY';
            return 'RIDE';
        }
    },

    trend: {
        name: 'Trend Following',
        description: 'Follows established price trends',
        calculate: (data) => {
            const last20Days = data.slice(-20);
            const priceChange = (last20Days[last20Days.length - 1].price - last20Days[0].price) / last20Days[0].price;

            if (priceChange > 0.1) return 'BUY';
            if (priceChange < -0.1) return 'SELL';
            return 'RIDE';
        }
    },

    hft: {
        name: 'High-Frequency Trading',
        description: 'Rapid trading based on short-term price movements',
        calculate: (data) => {
            const last10Prices = data.slice(-10).map(d => d.price);
            const volatility = Math.std(last10Prices);
            const momentum = (last10Prices[last10Prices.length - 1] - last10Prices[0]) / last10Prices[0];
            
            if (volatility > 0.02 && momentum > 0) return 'BUY';
            if (volatility > 0.02 && momentum < 0) return 'SELL';
            return 'STAY';
        }
    },

    vwap: {
        name: 'Volume-Weighted Average Price',
        description: 'Uses price and volume data for decision making',
        calculate: (data) => {
            const vwap = data.reduce((acc, val) => acc + val.price, 0) / data.length;
            const lastPrice = data[data.length - 1].price;
            
            if (lastPrice < vwap * 0.95) return 'BUY';
            if (lastPrice > vwap * 1.05) return 'SELL';
            return 'STAY';
        }
    },

    indexRebalancing: {
        name: 'Index Fund Rebalancing',
        description: 'Periodic portfolio rebalancing strategy',
        calculate: (data) => {
            const targetPrice = 45000;
            const currentPrice = data[data.length - 1].price;
            const deviation = Math.abs((currentPrice - targetPrice) / targetPrice);
            
            if (deviation > 0.1) return 'RIDE';
            return 'STAY';
        }
    },

    twap: {
        name: 'Time-Weighted Average Price',
        description: 'Executes trades based on time-weighted price averages',
        calculate: (data) => {
            const periods = [5, 10, 20];
            const averages = periods.map(period => {
                const slice = data.slice(-period);
                return slice.reduce((acc, val) => acc + val.price, 0) / period;
            });

            if (averages[0] > averages[1] && averages[1] > averages[2]) return 'BUY';
            if (averages[0] < averages[1] && averages[1] < averages[2]) return 'SELL';
            return 'STAY';
        }
    }
};

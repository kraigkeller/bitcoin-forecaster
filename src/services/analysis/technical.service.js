class TechnicalAnalysis {
    static calculateSMA(data, period) {
        const sma = [];
        for (let i = period - 1; i < data.length; i++) {
            const avg = data.slice(i - period + 1, i + 1).reduce((sum, price) => sum + price, 0) / period;
            sma.push(avg);
        }
        return sma;
    }

    static calculateEMA(data, period) {
        const k = 2 / (period + 1);
        let ema = [data[0]];
        
        for (let i = 1; i < data.length; i++) {
            ema.push(data[i] * k + ema[i - 1] * (1 - k));
        }
        return ema;
    }

    static calculateMACD(data) {
        if (!data?.length) {
            return { macd: [], signal: [], histogram: [] };
        }
        const prices = data.map(d => d.price);
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macd = ema12.map((v, i) => v - ema26[i]);
        const signal = this.calculateEMA(macd, 9);
        const histogram = macd.map((v, i) => v - signal[i]);

        return { macd, signal, histogram };
    }

    static calculateRSI(data, period = 14) {
        if (!data?.length) {
            return [50];
        }
        const changes = data.slice(1).map((value, index) => value - data[index]);
        const gains = changes.map(change => change > 0 ? change : 0);
        const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);

        let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain) / period;
        let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss) / period;

        const rsi = [100 - (100 / (1 + avgGain / avgLoss))];

        for (let i = period; i < data.length - 1; i++) {
            avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
            avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
            rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
        }

        return rsi;
    }

    static calculateBollingerBands(data, period = 20, multiplier = 2) {
        if (!data?.length) {
            return [{ upper: 0, middle: 0, lower: 0 }];
        }
        const prices = data.map(d => d.price);
        const sma = this.calculateSMA(prices, period);
        const bands = sma.map((middle, i) => {
            const slice = prices.slice(i - period + 1, i + 1);
            const std = Math.sqrt(slice.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period);
            return {
                upper: middle + (multiplier * std),
                middle,
                lower: middle - (multiplier * std)
            };
        });
        return bands;
    }

    static findSupportResistanceLevels(data, lookback = 50) {
        if (!data?.length) {
            return [];
        }
        const prices = data.map(d => d.price);
        const pivots = [];
        
        for (let i = 2; i < prices.length - 2; i++) {
            const window = prices.slice(i - 2, i + 3);
            if (this.isPivotHigh(window)) {
                pivots.push({ price: prices[i], type: 'resistance' });
            } else if (this.isPivotLow(window)) {
                pivots.push({ price: prices[i], type: 'support' });
            }
        }

        return this.clusterLevels(pivots);
    }

    static isPivotHigh(window) {
        return window[2] > window[0] && 
               window[2] > window[1] && 
               window[2] > window[3] && 
               window[2] > window[4];
    }

    static isPivotLow(window) {
        return window[2] < window[0] && 
               window[2] < window[1] && 
               window[2] < window[3] && 
               window[2] < window[4];
    }

    static clusterLevels(pivots, tolerance = 0.02) {
        const clusters = [];
        pivots.forEach(pivot => {
            const existingCluster = clusters.find(cluster => 
                Math.abs((cluster.price - pivot.price) / cluster.price) < tolerance
            );
            
            if (existingCluster) {
                existingCluster.strength++;
                existingCluster.price = (existingCluster.price + pivot.price) / 2;
            } else {
                clusters.push({ ...pivot, strength: 1 });
            }
        });

        return clusters.sort((a, b) => b.strength - a.strength);
    }

    static analyzeVolatility(data, window = 20) {
        if (!data?.length) {
            return {
                current: 0,
                historical: [],
                trend: { direction: 'stable', magnitude: 0 }
            };
        }

        const prices = data.map(d => d.price);
        const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
        const volatility = Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length) * Math.sqrt(252);
        
        const historicalVol = [];
        for (let i = window; i < returns.length; i++) {
            const slice = returns.slice(i - window, i);
            const vol = Math.sqrt(slice.reduce((sum, ret) => sum + ret * ret, 0) / window) * Math.sqrt(252);
            historicalVol.push(vol);
        }

        return {
            current: volatility || 0,
            historical: historicalVol,
            trend: this.calculateVolatilityTrend(historicalVol)
        };
    }

    static calculateVolatilityTrend(volatilities) {
        if (!volatilities?.length) {
            return { direction: 'stable', magnitude: 0 };
        }

        const recentVol = volatilities.slice(-5).reduce((a, b) => a + b, 0) / Math.min(volatilities.length, 5);
        const oldVol = volatilities.slice(-10, -5).reduce((a, b) => a + b, 0) / Math.min(Math.max(0, volatilities.length - 5), 5);

        return {
            direction: recentVol > oldVol ? 'increasing' : 'decreasing',
            magnitude: oldVol ? Math.abs(recentVol - oldVol) / oldVol : 0
        };
    }

    static detectPattern(prices) {
        const patterns = [];
        
        if (this.isHeadAndShoulders(prices)) {
            patterns.push('Head and Shoulders');
        }
        if (this.isDoubleTop(prices)) {
            patterns.push('Double Top');
        }
        if (this.isDoubleBottom(prices)) {
            patterns.push('Double Bottom');
        }
        if (this.isBullishFlag(prices)) {
            patterns.push('Bullish Flag');
        }
        if (this.isBearishFlag(prices)) {
            patterns.push('Bearish Flag');
        }

        return patterns;
    }

    static isHeadAndShoulders(prices) {
        if (prices.length < 20) return false;
        
        const peaks = this.findPeaks(prices, 5);
        if (peaks.length < 3) return false;

        for (let i = 0; i < peaks.length - 2; i++) {
            const [left, head, right] = peaks.slice(i, i + 3);
            if (head.value > left.value && head.value > right.value) {
                const shoulderDiff = Math.abs(left.value - right.value) / left.value;
                if (shoulderDiff < 0.1) {
                    return true;
                }
            }
        }
        return false;
    }

    static isDoubleTop(prices) {
        if (prices.length < 15) return false;
        
        const peaks = this.findPeaks(prices, 5);
        if (peaks.length < 2) return false;

        for (let i = 0; i < peaks.length - 1; i++) {
            const peak1 = peaks[i];
            const peak2 = peaks[i + 1];
            const peakDiff = Math.abs(peak1.value - peak2.value) / peak1.value;
            if (peakDiff < 0.02) {
                const timeDiff = peak2.index - peak1.index;
                if (timeDiff >= 5 && timeDiff <= 30) {
                    return true;
                }
            }
        }
        return false;
    }

    static isDoubleBottom(prices) {
        if (prices.length < 15) return false;
        
        const troughs = this.findTroughs(prices, 5);
        if (troughs.length < 2) return false;

        for (let i = 0; i < troughs.length - 1; i++) {
            const trough1 = troughs[i];
            const trough2 = troughs[i + 1];
            
            const troughDiff = Math.abs(trough1.value - trough2.value) / trough1.value;
            if (troughDiff < 0.02) {
                const timeDiff = trough2.index - trough1.index;
                if (timeDiff >= 5 && timeDiff <= 30) {
                    return true;
                }
            }
        }
        return false;
    }

    static isBullishFlag(prices) {
        if (prices.length < 10) return false;

        const uptrend = this.calculateTrend(prices.slice(0, 5));
        const consolidation = this.calculateTrend(prices.slice(5));

        return (
            uptrend > 0.02 && 
            Math.abs(consolidation) < 0.01 &&
            this.calculateVolatility(prices.slice(5)) < this.calculateVolatility(prices.slice(0, 5))
        );
    }

    static isBearishFlag(prices) {
        if (prices.length < 10) return false;

        const downtrend = this.calculateTrend(prices.slice(0, 5));
        const consolidation = this.calculateTrend(prices.slice(5));

        return (
            downtrend < -0.02 && 
            Math.abs(consolidation) < 0.01 && 
            this.calculateVolatility(prices.slice(5)) < this.calculateVolatility(prices.slice(0, 5))
        );
    }

    static findPeaks(prices, window = 2) {
        const peaks = [];
        for (let i = window; i < prices.length - window; i++) {
            const slice = prices.slice(i - window, i + window + 1);
            if (this.isPeak(slice)) {
                peaks.push({ value: prices[i], index: i });
            }
        }
        return peaks;
    }

    static findTroughs(prices, window = 2) {
        const troughs = [];
        for (let i = window; i < prices.length - window; i++) {
            const slice = prices.slice(i - window, i + window + 1);
            if (this.isTrough(slice)) {
                troughs.push({ value: prices[i], index: i });
            }
        }
        return troughs;
    }

    static isPeak(values) {
        const mid = Math.floor(values.length / 2);
        return values[mid] === Math.max(...values);
    }

    static isTrough(values) {
        const mid = Math.floor(values.length / 2);
        return values[mid] === Math.min(...values);
    }

    static calculateTrend(prices) {
        if (prices.length < 2) return 0;
        return (prices[prices.length - 1] - prices[0]) / prices[0];
    }

    static calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
        return Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
    }

    static FIBONACCI_LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786];

    static calculateFibonacciLevels(high, low) {
        return this.FIBONACCI_LEVELS.map(level => ({
            level,
            price: high - (high - low) * level
        }));
    }

    static findElliottWaves(prices, window = 20) {
        if (prices.length < window) return null;

        const waves = [];
        let currentWave = 1;
        let lastDirection = null;
        let lastExtreme = prices[0];

        for (let i = 1; i < prices.length; i++) {
            const direction = prices[i] > prices[i-1] ? 'up' : 'down';
            
            if (direction !== lastDirection && waves.length < 5) {
                waves.push({
                    wave: currentWave,
                    start: lastExtreme,
                    end: prices[i-1],
                    direction: lastDirection
                });
                currentWave++;
                lastExtreme = prices[i-1];
            }
            
            lastDirection = direction;
        }

        return waves.length === 5 ? waves : null;
    }

    static detectAdvancedPatterns(prices) {
        const patterns = [];
        const highLow = this.getHighLow(prices);
        
        if (this.isTrianglePattern(prices)) patterns.push('Triangle');
        if (this.isWedgePattern(prices)) patterns.push('Wedge');
        if (this.isChannelPattern(prices)) patterns.push('Channel');
        if (this.isCupAndHandle(prices)) patterns.push('Cup and Handle');
        if (this.isInverseHeadAndShoulders(prices)) patterns.push('Inverse H&S');
        if (this.isRoundingBottom(prices)) patterns.push('Rounding Bottom');
        
        return {
            patterns,
            fibonacci: this.calculateFibonacciLevels(highLow.high, highLow.low),
            elliottWaves: this.findElliottWaves(prices)
        };
    }

    static analyzeVolume(prices, volumes) {
        if (!prices.length || !volumes.length) return null;

        const avgVolume = volumes.reduce((a, b) => a + b) / volumes.length;
        const volumeSpikes = volumes.map((vol, i) => ({
            index: i,
            spike: vol / avgVolume
        })).filter(spike => spike.spike > 2);

        const volumeTrend = this.calculateVolumeTrend(volumes);
        const priceVolumeCorrelation = this.calculatePriceVolumeCorrelation(prices, volumes);

        return {
            averageVolume: avgVolume,
            volumeSpikes,
            volumeTrend,
            priceVolumeCorrelation,
            isAccumulation: this.isAccumulationPhase(prices, volumes),
            isDistribution: this.isDistributionPhase(prices, volumes)
        };
    }

    static getHighLow(prices) {
        return {
            high: Math.max(...prices),
            low: Math.min(...prices)
        };
    }

    static isTrianglePattern(prices) {
        const highs = this.findPeaks(prices);
        const lows = this.findTroughs(prices);
        
        if (highs.length < 3 || lows.length < 3) return false;

        const highSlope = this.calculateSlope(highs);
        const lowSlope = this.calculateSlope(lows);

        return Math.abs(highSlope) < 0.1 && Math.abs(lowSlope) < 0.1 && 
               Math.sign(highSlope) !== Math.sign(lowSlope);
    }

    static calculatePriceVolumeCorrelation(prices, volumes) {
        const priceReturns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
        const volumeChanges = volumes.slice(1).map((v, i) => (v - volumes[i]) / volumes[i]);
        
        return this.calculateCorrelation(priceReturns, volumeChanges);
    }

    static calculateCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        const meanX = x.reduce((a, b) => a + b) / n;
        const meanY = y.reduce((a, b) => a + b) / n;
        
        const covXY = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0) / n;
        const varX = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0) / n;
        const varY = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0) / n;
        
        return covXY / Math.sqrt(varX * varY);
    }

    static calculateVolumeTrend(volumes, period = 20) {
        const sma = this.calculateSMA(volumes, period);
        return {
            trend: sma[sma.length - 1] > sma[0] ? 'increasing' : 'decreasing',
            magnitude: Math.abs(sma[sma.length - 1] - sma[0]) / sma[0]
        };
    }

    static isAccumulationPhase(prices, volumes, period = 20) {
        const priceChange = (prices[prices.length - 1] - prices[0]) / prices[0];
        const volumeTrend = this.calculateVolumeTrend(volumes, period);
        return priceChange > -0.05 && priceChange < 0.05 && volumeTrend.trend === 'increasing';
    }

    static isDistributionPhase(prices, volumes, period = 20) {
        const priceChange = (prices[prices.length - 1] - prices[0]) / prices[0];
        const volumeTrend = this.calculateVolumeTrend(volumes, period);
        return priceChange > -0.05 && priceChange < 0.05 && volumeTrend.trend === 'decreasing';
    }

    static calculateSlope(points) {
        const n = points.length;
        const sumX = points.reduce((sum, p) => sum + p.index, 0);
        const sumY = points.reduce((sum, p) => sum + p.value, 0);
        const sumXY = points.reduce((sum, p) => sum + p.index * p.value, 0);
        const sumX2 = points.reduce((sum, p) => sum + p.index * p.index, 0);

        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    static isWedgePattern(prices) {
        const highs = this.findPeaks(prices);
        const lows = this.findTroughs(prices);
        
        if (highs.length < 3 || lows.length < 3) return false;

        const highSlope = this.calculateSlope(highs);
        const lowSlope = this.calculateSlope(lows);

        return Math.abs(highSlope) > 0.1 && Math.abs(lowSlope) > 0.1 && 
               Math.sign(highSlope) === Math.sign(lowSlope);
    }

    static isChannelPattern(prices) {
        const highs = this.findPeaks(prices);
        const lows = this.findTroughs(prices);
        
        if (highs.length < 3 || lows.length < 3) return false;

        const highSlope = this.calculateSlope(highs);
        const lowSlope = this.calculateSlope(lows);

        return Math.abs(highSlope) < 0.1 && Math.abs(lowSlope) < 0.1 && 
               Math.sign(highSlope) === Math.sign(lowSlope);
    }

    static isCupAndHandle(prices) {
        if (prices.length < 20) return false;

        const highLow = this.getHighLow(prices);
        const cupDepth = (highLow.high - highLow.low) / highLow.high;

        if (cupDepth < 0.1 || cupDepth > 0.5) return false;

        const handle = prices.slice(-Math.floor(prices.length / 3));
        const handleDepth = (Math.max(...handle) - Math.min(...handle)) / Math.max(...handle);

        return handleDepth < 0.1;
    }

    static isInverseHeadAndShoulders(prices) {
        if (prices.length < 20) return false;
        
        const troughs = this.findTroughs(prices, 5);
        if (troughs.length < 3) return false;

        for (let i = 0; i < troughs.length - 2; i++) {
            const [left, head, right] = troughs.slice(i, i + 3);
            
            if (head.value < left.value && head.value < right.value) {
                const shoulderDiff = Math.abs(left.value - right.value) / left.value;
                if (shoulderDiff < 0.1) {
                    return true;
                }
            }
        }
        return false;
    }

    static isRoundingBottom(prices) {
        if (prices.length < 20) return false;

        const highLow = this.getHighLow(prices);
        const mid = Math.floor(prices.length / 2);
        const left = prices.slice(0, mid);
        const right = prices.slice(mid);

        const leftSlope = this.calculateSlope(left.map((value, index) => ({ value, index })));
        const rightSlope = this.calculateSlope(right.map((value, index) => ({ value, index })));

        return leftSlope < 0 && rightSlope > 0;
    }
}

export default TechnicalAnalysis;

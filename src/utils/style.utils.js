export const COLORS = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#eab308',
    neutral: '#94A3B8'
};

export const getVolatilityColor = (volatility) => {
    const vol = volatility * 100;
    if (vol < 2) return 'success.main';
    if (vol < 5) return 'warning.main';
    return 'error.main';
};

export const getVolatilityScale = (volatility) => {
    const vol = volatility * 100;
    if (vol < 2) return 1.0;
    if (vol < 5) return 1.1;
    return 1.2;
};

export const getPriceColor = (currentValue, previousValue) => {
    if (!previousValue) return COLORS.neutral;
    return currentValue >= previousValue ? COLORS.success : COLORS.error;
};

export const getTradingSignalColor = (signal) => {
    switch (signal) {
        case 'BUY': return COLORS.success;
        case 'SELL': return COLORS.error;
        case 'RIDE': return COLORS.warning;
        default: return COLORS.neutral;
    }
};

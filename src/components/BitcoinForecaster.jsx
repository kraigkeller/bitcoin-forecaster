import React from 'react';
import { observer } from 'mobx-react-lite';
import { bitcoinStore } from '../stores/BitcoinStore';
import {
    TextField,
    Button,
    Typography,
    Container,
    Paper,
    Box,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Tooltip,
    Fade,
    Grow,
    Skeleton,
    Alert,
    Slide,
} from '@mui/material';
import {
    InfoOutlined,
    TrendingUp,
    ShowChart,
    Timeline,
    TrendingFlat,
    TrendingDown,
    Speed as VolatilityIcon,
    SwapVert as FluctuationIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { TimeRangeControls } from './TimeRangeControls/TimeRangeControls';
import { PortfolioTracker } from './PortfolioTracker/PortfolioTracker';

const BitcoinForecaster = observer(() => {
    React.useEffect(() => {
        bitcoinStore.fetchBitcoinData();
    }, []);

    const getVolatilityColor = (volatility) => {
        const vol = volatility * 100;
        if (vol < 2) return 'success.main';
        if (vol < 5) return 'warning.main'; 
        return 'error.main'; 
    };

    const getVolatilityScale = (volatility) => {
        const vol = volatility * 100;
        if (vol < 2) return 1.0;
        if (vol < 5) return 1.1;
        return 1.2;
    };

    const getPriceColor = (currentValue, previousValue) => {
        if (!previousValue) return 'text.secondary';
        return currentValue >= previousValue ? 'success.main' : 'error.main';
    };

    const getTradingSignalColor = (signal) => {
        switch (signal) {
            case 'BUY': return 'success.main';
            case 'SELL': return 'error.main';
            case 'RIDE': return 'warning.main';
            case 'STAY': return 'primary.main';
            default: return 'text.secondary';
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatPrice = (price) => {
        if (price === null || price === undefined) return '---';
        return price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const renderChart = () => (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart 
                data={bitcoinStore.chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
                <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="rgba(161, 161, 170, 0.08)"
                />
                <XAxis 
                    dataKey="timestamp"
                    tickFormatter={formatDate}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="rgba(161, 161, 170, 0.6)"
                    tick={{ 
                        fill: 'rgba(161, 161, 170, 0.8)',
                        fontFamily: 'JetBrains Mono',
                        fontSize: 12
                    }} 
                />
                <YAxis 
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    stroke="rgba(161, 161, 170, 0.6)"
                    tick={{ 
                        fill: 'rgba(161, 161, 170, 0.8)',
                        fontFamily: 'JetBrains Mono',
                        fontSize: 12
                    }}
                />
                <RechartsTooltip 
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Price']}
                    labelFormatter={formatDate}
                    contentStyle={{
                        backgroundColor: 'rgba(24, 24, 27, 0.95)',
                        border: '1px solid rgba(41, 41, 45, 0.6)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontFamily: 'JetBrains Mono'
                    }} 
                />
                <Line
                    type="monotone"
                    dataKey="price"
                    stroke="rgba(161, 161, 170, 0.8)"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ 
                        r: 4, 
                        fill: 'rgba(161, 161, 170, 0.9)',
                        stroke: 'rgba(255, 255, 255, 0.8)',
                        strokeWidth: 1
                    }} 
                    name="Bitcoin Price"
                    animationDuration={2000}
                    strokeDasharray={(d) => d.isHistorical ? "0" : "2 4"}
                />
            </LineChart>
        </ResponsiveContainer>
    );

    const renderPatternInfo = () => (
        <Box sx={{ 
            mb: 2,
            p: 2,
            backgroundColor: 'background.default',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
        }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Historical Analysis
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VolatilityIcon sx={{ 
                        color: getVolatilityColor(bitcoinStore.historicalPatterns.dailyVolatility),
                        transform: `scale(${getVolatilityScale(bitcoinStore.historicalPatterns.dailyVolatility)})`,
                        transition: 'all 0.3s ease'
                    }} />
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            color: getVolatilityColor(bitcoinStore.historicalPatterns.dailyVolatility),
                            transition: 'color 0.3s ease'
                        }}
                    >
                        Volatility: {(bitcoinStore.historicalPatterns.dailyVolatility * 100).toFixed(2)}%
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp sx={{ 
                        color: 'success.main',
                        transform: 'scale(1.2)'
                    }} />
                    <Typography variant="body2" color="success.main">
                        Bull: +{(bitcoinStore.historicalPatterns.bullishTrend * 100).toFixed(2)}%
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDown sx={{ 
                        color: 'error.main',
                        transform: 'scale(1.2)'
                    }} />
                    <Typography variant="body2" color="error.main">
                        Bear: {(bitcoinStore.historicalPatterns.bearishTrend * 100).toFixed(2)}%
                    </Typography>
                </Box>
            </Box>
        </Box>
    );

    if (bitcoinStore.loading) {
        return (
            <Container maxWidth="md">
                <Fade in={true}>
                    <Paper elevation={3} sx={{ padding: 3, marginTop: 4 }}>
                        <Skeleton variant="text" width="60%" height={60} />
                        <Skeleton variant="text" width="40%" height={40} sx={{ mt: 2 }} />
                        <Skeleton variant="rectangular" height={56} sx={{ mt: 3 }} />
                        <Skeleton variant="rectangular" height={56} sx={{ mt: 2 }} />
                        <Skeleton variant="rectangular" height={56} sx={{ mt: 2 }} />
                        <Skeleton variant="rectangular" height={56} sx={{ mt: 2 }} />
                        <Skeleton variant="rectangular" height={400} sx={{ mt: 4 }} />
                    </Paper>
                </Fade>
            </Container>
        );
    }

    if (bitcoinStore.error) {
        return (
            <Container maxWidth="md">
                <Slide direction="down" in={true}>
                    <Alert severity="error" sx={{ mt: 4 }}>
                        {bitcoinStore.error}
                    </Alert>
                </Slide>
            </Container>
        );
    }

    return (
        <Container maxWidth="md">
            <Fade in={true}>
                <Paper elevation={3} sx={{ 
                    padding: 3, 
                    marginTop: 4,
                    backgroundColor: 'background.paper',
                    borderColor: 'divider',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <ShowChart />
                        <Typography variant="h4" component="h1">
                            Bitcoin Forecaster
                        </Typography>
                    </Box>

                    {bitcoinStore.currentPrice !== null && (
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mb: 3,
                            color: getPriceColor(bitcoinStore.currentPrice, bitcoinStore.priceHistory[bitcoinStore.priceHistory.length - 2]?.price),
                            fontFamily: 'JetBrains Mono'
                        }}>
                            <TrendingUp />
                            <Typography variant="stats">
                                Current Price: ${formatPrice(bitcoinStore.currentPrice)}
                            </Typography>
                        </Box>
                    )}

                    {bitcoinStore.tradingSignal && (
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            my: 3,
                            py: 2,
                            borderRadius: 2,
                            backgroundColor: 'background.default',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}>
                            <Typography 
                                variant="h2" 
                                sx={{ 
                                    fontFamily: 'JetBrains Mono',
                                    fontWeight: 600,
                                    color: getTradingSignalColor(bitcoinStore.tradingSignal),
                                    letterSpacing: '0.1em',
                                    textShadow: '0 0 10px rgba(0,0,0,0.3)'
                                }}
                            >
                                {bitcoinStore.tradingSignal}
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ mb: 4 }}>
                        <TimeRangeControls 
                            type="historical"
                            label="Historical Data Range"
                            selectedInterval={bitcoinStore.settings.historicalInterval}
                            onRangeChange={(range) => bitcoinStore.updateSetting('historicalInterval', range.value)}
                        />

                        {renderPatternInfo()}

                        <TimeRangeControls 
                            type="forecast"
                            label={`Forecast Range ${bitcoinStore.loading ? '(Updating...)' : ''}`}
                            selectedInterval={bitcoinStore.settings.forecastInterval}
                            onRangeChange={(range) => bitcoinStore.updateSetting('forecastInterval', range.value)}
                        />
                    </Box>

                    <FormControl fullWidth margin="normal">
                        <InputLabel id="strategy-label">Trading Strategy</InputLabel>
                        <Select
                            labelId="strategy-label"
                            value={bitcoinStore.settings.tradingStrategy || 'trend'}
                            label="Trading Strategy"
                            onChange={(e) => bitcoinStore.updateSetting('tradingStrategy', e.target.value)}
                        >
                            {Object.entries(bitcoinStore.strategies).map(([key, strategy]) => (
                                <MenuItem key={key} value={key}>
                                    <Box>
                                        <Typography>{strategy.name}</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            {strategy.description}
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {bitcoinStore.chartData.length > 0 && (
                        <Fade in={true}>
                            <Box sx={{ height: 400, mt: 4 }}>
                                {renderChart()}
                            </Box>
                        </Fade>
                    )}
                    {bitcoinStore.currentPrice && (
                        <PortfolioTracker
                            currentPrice={bitcoinStore.currentPrice}
                            predictedPrices={bitcoinStore.simulatedPrices}
                            chartData={bitcoinStore.chartData}
                        />
                    )}
                </Paper>
            </Fade>
        </Container>
    );
});

export default BitcoinForecaster;
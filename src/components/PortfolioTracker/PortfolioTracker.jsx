import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Paper, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

export function PortfolioTracker({ currentPrice, predictedPrices, chartData }) {
    const theme = useTheme();
    const [btcAmount, setBtcAmount] = useState(1);
    const [currentValue, setCurrentValue] = useState(0);
    const [predictedValue, setPredictedValue] = useState(0);
    const [difference, setDifference] = useState(0);
    const [percentChange, setPercentChange] = useState(0);

    useEffect(() => {
        if (currentPrice && btcAmount) {
            const current = currentPrice * btcAmount;
            setCurrentValue(current);

            const finalPrediction = predictedPrices?.length > 0 
                ? predictedPrices[predictedPrices.length - 1].price
                : currentPrice;

            const predicted = finalPrediction * btcAmount;
            setPredictedValue(predicted);

            const diff = predicted - current;
            setDifference(diff);
            setPercentChange((diff / current) * 100);
        }
    }, [currentPrice, btcAmount, predictedPrices]);

    const handleAmountChange = (event) => {
        const value = parseFloat(event.target.value) || 0;
        setBtcAmount(value);
    };

    return (
        <Paper sx={{ 
            mt: 4, 
            p: 3, 
            backgroundColor: 'background.default',
            border: `1px solid ${theme.palette.divider}`,
            borderColor: 'divider'
        }}>
            <Typography 
                variant="h6" 
                gutterBottom
                sx={{ opacity: theme.opacity.primary }}
            >
                Portfolio Tracker
            </Typography>
            
            <TextField
                label="BTC Amount"
                type="number"
                value={btcAmount}
                onChange={handleAmountChange}
                fullWidth
                margin="normal"
                inputProps={{ 
                    step: 0.1,
                    min: 0,
                    style: { fontFamily: 'JetBrains Mono' }
                }}
            />

            <Box sx={{ mt: 2 }}>
                <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ opacity: theme.opacity.secondary }}
                >
                    Current Value: ${currentValue.toLocaleString(undefined, {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3
                    })}
                </Typography>
                
                <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ opacity: theme.opacity.secondary }}
                >
                    Predicted Value: ${predictedValue.toLocaleString(undefined, {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3
                    })}
                </Typography>

                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mt: 1,
                    color: difference >= 0 ? 'success.main' : 'error.main',
                    opacity: theme.opacity.highlight
                }}>
                    {difference >= 0 ? <TrendingUp /> : <TrendingDown />}
                    <Typography sx={{ fontFamily: 'JetBrains Mono' }}>
                        {difference >= 0 ? '▲' : '▼'} $
                        {Math.abs(difference).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                        <span style={{ opacity: theme.opacity.tertiary }}>
                            ({Math.abs(percentChange).toFixed(2)}%)
                        </span>
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
}

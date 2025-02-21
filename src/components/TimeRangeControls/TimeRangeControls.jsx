import * as React from 'react';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const timeRanges = {
    historical: [
        { label: '1m', value: 60, tooltip: '1 minute' },
        { label: '5m', value: 300, tooltip: '5 minutes' },
        { label: '15m', value: 900, tooltip: '15 minutes' },
        { label: '30m', value: 1800, tooltip: '30 minutes' },
        { label: '1h', value: 3600, tooltip: '1 hour' },
        { label: '4h', value: 14400, tooltip: '4 hours' },
        { label: '1D', value: 86400, tooltip: '1 day' },
        { label: '1W', value: 604800, tooltip: '1 week' },
        { label: '1M', value: 2592000, tooltip: '1 month' },
        { label: '3M', value: 7776000, tooltip: '3 months' },
        { label: '6M', value: 15552000, tooltip: '6 months' },
        { label: '1Y', value: 31536000, tooltip: '1 year' },
        { label: 'All', value: -1, tooltip: 'All available data' }
    ],
    forecast: [
        { label: '0h', value: 0, tooltip: 'No forecast' },
        { label: '1m', value: 60, tooltip: 'Next minute' },
        { label: '5m', value: 300, tooltip: 'Next 5 minutes' },
        { label: '15m', value: 900, tooltip: 'Next 15 minutes' },
        { label: '30m', value: 1800, tooltip: 'Next 30 minutes' },
        { label: '1h', value: 3600, tooltip: 'Next hour' },
        { label: '4h', value: 14400, tooltip: 'Next 4 hours' },
        { label: '1D', value: 86400, tooltip: 'Next day' },
        { label: '1W', value: 604800, tooltip: 'Next week' },
        { label: '1M', value: 2592000, tooltip: 'Next month' },
        { label: '3M', value: 7776000, tooltip: 'Next 3 months' },
        { label: '6M', value: 15552000, tooltip: 'Next 6 months' },
        { label: '1Y', value: 31536000, tooltip: 'Next year' }
    ]
};

export function TimeRangeControls({ 
    type = 'historical',
    selectedInterval,
    onRangeChange,
    label
}) {
    const ranges = timeRanges[type];

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 1,
            mb: 2
        }}>
            {label && (
                <Typography variant="subtitle2" color="text.secondary" sx={{ ml: 1 }}>
                    {label}
                </Typography>
            )}
            <ButtonGroup 
                variant="outlined" 
                sx={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    '& .MuiButton-root': {
                        minWidth: '45px',
                        margin: '-1px 0 0 -1px',
                        borderRadius: 0,
                        '&:first-of-type': {
                            borderTopLeftRadius: '4px',
                            borderBottomLeftRadius: '4px',
                        },
                        '&:last-of-type': {
                            borderTopRightRadius: '4px',
                            borderBottomRightRadius: '4px',
                        }
                    }
                }}
            >
                {ranges.map((range) => (
                    <Button
                        key={range.value}
                        onClick={() => onRangeChange(range)}
                        variant={selectedInterval === range.value ? 'contained' : 'outlined'}
                        sx={{
                            px: 1,
                            py: 0.5,
                            fontFamily: 'JetBrains Mono',
                            fontSize: '0.875rem',
                            zIndex: selectedInterval === range.value ? 1 : 'auto',
                        }}
                    >
                        {range.label}
                    </Button>
                ))}
            </ButtonGroup>
        </Box>
    );
}

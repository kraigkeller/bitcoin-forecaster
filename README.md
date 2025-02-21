# Bitcoin Price Forecaster

This is a basic crypto UI that shows bitcoin prices and like a good fortune teller tells you the future and what to do on any future time interval, you can change the prediction strategy and see theoretically how much you would gain/loss on the specific time interval. These are just predictions and should be treated as such.

## Features

- Real-time Bitcoin price tracking
- Technical analysis indicators (MACD, RSI, Bollinger Bands)
- Advanced price forecasting algorithms
- Historical pattern recognition
- Trading signals generation
- Portfolio tracking
- Dark/Light theme support
- Responsive design

## Tech Stack

- React
- MUI (Material-UI)
- MobX
- Recharts
- Vite
- IndexedDB

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/kraigkeller/bitcoin-forecaster.git
cd bitcoin-forecaster
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_COINGECKO_API_KEY=your_api_key_here  # Optional
```

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Project Structure

```
coin/
├── src/
│   ├── components/          # React components
│   ├── services/           # API and data services
│   ├── stores/             # MobX stores
│   ├── utils/             # Helper functions
│   └── App.jsx            # Root component
├── public/                # Static assets
└── index.html            # Entry point
```

## Data Sources

- CoinGecko API for real-time and historical data
- Local caching using IndexedDB

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Acknowledgments

- CoinGecko API
- React and MUI

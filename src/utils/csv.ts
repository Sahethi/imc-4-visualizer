import { ActivityLogRow, Algorithm, Trade } from '../models.ts';

export class CsvParseError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export function parseCsvTrades(content: string): Trade[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length === 0) {
    throw new CsvParseError('CSV file is empty.');
  }

  const header = lines[0].toLowerCase();
  const startIndex = header.includes('timestamp') ? 1 : 0;

  if (lines.length <= startIndex) {
    throw new CsvParseError('CSV file contains no data rows.');
  }

  const trades: Trade[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    const cols = line.split(';');
    if (cols.length < 7) continue;

    const timestamp = Number(cols[0]);
    const buyer = cols[1].trim();
    const seller = cols[2].trim();
    const symbol = cols[3].trim();
    const price = Number(cols[5]);
    const quantity = Number(cols[6]);

    if (isNaN(timestamp) || isNaN(price) || isNaN(quantity) || !symbol) continue;

    trades.push({ symbol, price, quantity, buyer, seller, timestamp });
  }

  if (trades.length === 0) {
    throw new CsvParseError('No valid trade rows found in CSV file.');
  }

  return trades;
}

export function algorithmFromTrades(trades: Trade[], day = 0): Algorithm {
  const grouped = new Map<string, { timestamp: number; symbol: string; priceQtyPairs: [number, number][] }>();

  for (const trade of trades) {
    const key = `${trade.timestamp}:${trade.symbol}`;
    if (!grouped.has(key)) {
      grouped.set(key, { timestamp: trade.timestamp, symbol: trade.symbol, priceQtyPairs: [] });
    }
    grouped.get(key)!.priceQtyPairs.push([trade.price, trade.quantity]);
  }

  const activityLogs: ActivityLogRow[] = [];

  for (const { timestamp, symbol, priceQtyPairs } of grouped.values()) {
    const totalQty = priceQtyPairs.reduce((sum, [, qty]) => sum + qty, 0);
    const midPrice =
      totalQty > 0
        ? priceQtyPairs.reduce((sum, [p, q]) => sum + p * q, 0) / totalQty
        : priceQtyPairs.reduce((sum, [p]) => sum + p, 0) / priceQtyPairs.length;

    activityLogs.push({
      day,
      timestamp,
      product: symbol,
      bidPrices: [],
      bidVolumes: [],
      askPrices: [],
      askVolumes: [],
      midPrice,
      profitLoss: 0,
    });
  }

  activityLogs.sort((a, b) => a.timestamp - b.timestamp || a.product.localeCompare(b.product));

  return {
    activityLogs,
    data: [],
    tradeHistory: trades,
  };
}

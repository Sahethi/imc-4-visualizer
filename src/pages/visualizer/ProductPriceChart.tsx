import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { Order, ProsperitySymbol, Trade } from '../../models.ts';
import { useStore } from '../../store.ts';
import { getAskColor, getBidColor } from '../../utils/colors.ts';
import { Chart } from './Chart.tsx';

export interface ProductPriceChartProps {
  symbol: ProsperitySymbol;
}

export function ProductPriceChart({ symbol }: ProductPriceChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;

  const series: Highcharts.SeriesOptionsType[] = [
    {
      type: 'line',
      name: 'Bid 3',
      color: getBidColor(0.5),
      marker: { symbol: 'square' },
      data: [],
    },
    {
      type: 'line',
      name: 'Bid 2',
      color: getBidColor(0.75),
      marker: { symbol: 'circle' },
      data: [],
    },
    {
      type: 'line',
      name: 'Bid 1',
      color: getBidColor(1.0),
      marker: { symbol: 'triangle' },
      data: [],
    },
    {
      type: 'line',
      name: 'Mid price',
      color: 'gray',
      dashStyle: 'Dash',
      marker: { symbol: 'diamond' },
      data: [],
    },
    {
      type: 'line',
      name: 'Ask 1',
      color: getAskColor(1.0),
      marker: { symbol: 'triangle-down' },
      data: [],
    },
    {
      type: 'line',
      name: 'Ask 2',
      color: getAskColor(0.75),
      marker: { symbol: 'circle' },
      data: [],
    },
    {
      type: 'line',
      name: 'Ask 3',
      color: getAskColor(0.5),
      marker: { symbol: 'square' },
      data: [],
    },
    {
      type: 'line',
      name: 'Buy order submitted',
      color: getBidColor(1.0),
      marker: { enabled: false },
      data: [],
      lineWidth: 1,
      yAxis: 0,
      dataGrouping: { enabled: false },
      showInLegend: false,
      connectNulls: false,
    },
    {
      type: 'line',
      name: 'Sell order submitted',
      color: getAskColor(1.0),
      marker: { enabled: false },
      data: [],
      lineWidth: 1,
      yAxis: 0,
      dataGrouping: { enabled: false },
      showInLegend: false,
      connectNulls: false,
    },
    {
      type: 'scatter',
      name: 'Bought',
      color: '#1f8f4b',
      marker: { symbol: 'triangle', radius: 6, lineColor: '#000000', lineWidth: 1 },
      data: [],
      lineWidth: 0,
      yAxis: 0,
      dataGrouping: { enabled: false },
    },
    {
      type: 'scatter',
      name: 'Sold',
      color: '#b03a2e',
      marker: { symbol: 'triangle-down', radius: 6, lineColor: '#000000', lineWidth: 1 },
      data: [],
      lineWidth: 0,
      yAxis: 0,
      dataGrouping: { enabled: false },
    },
  ];

  function getOrderSide(order: Order): 'Buy' | 'Sell' {
    return order.quantity > 0 ? 'Buy' : 'Sell';
  }

  function getFillSide(trade: Trade): 'Buy' | 'Sell' | null {
    if (trade.buyer === 'SUBMISSION') {
      return 'Buy';
    }

    if (trade.seller === 'SUBMISSION') {
      return 'Sell';
    }

    return null;
  }

  for (const row of algorithm.activityLogs) {
    if (row.product !== symbol) {
      continue;
    }

    const hasOrderBookLevels = row.bidPrices.length > 0 || row.askPrices.length > 0;
    if (!hasOrderBookLevels && row.midPrice === 0) {
      continue;
    }

    for (let i = 0; i < row.bidPrices.length; i++) {
      (series[2 - i] as any).data.push([row.timestamp, row.bidPrices[i]]);
    }

    (series[3] as any).data.push([row.timestamp, row.midPrice]);

    for (let i = 0; i < row.askPrices.length; i++) {
      (series[i + 4] as any).data.push([row.timestamp, row.askPrices[i]]);
    }
  }

  const seenOwnTrades = new Set<string>();

  for (const row of algorithm.data) {
    const timestamp = row.state.timestamp;

    const buyOrderPrices: number[] = [];
    const sellOrderPrices: number[] = [];

    for (const order of row.orders[symbol] ?? []) {
      const side = getOrderSide(order);
      if (side === 'Buy') {
        buyOrderPrices.push(order.price);
      } else {
        sellOrderPrices.push(order.price);
      }
    }

    buyOrderPrices.sort((a, b) => a - b);
    sellOrderPrices.sort((a, b) => a - b);

    for (const price of buyOrderPrices) {
      (series[7] as any).data.push([timestamp, price]);
    }

    if (buyOrderPrices.length > 0) {
      (series[7] as any).data.push([timestamp, null]);
    }

    for (const price of sellOrderPrices) {
      (series[8] as any).data.push([timestamp, price]);
    }

    if (sellOrderPrices.length > 0) {
      (series[8] as any).data.push([timestamp, null]);
    }

    for (const trade of row.state.ownTrades[symbol] ?? []) {
      const side = getFillSide(trade);
      if (side === null) {
        continue;
      }

      const tradeKey = `${trade.symbol}:${trade.price}:${trade.quantity}:${trade.buyer}:${trade.seller}:${trade.timestamp}`;
      if (seenOwnTrades.has(tradeKey)) {
        continue;
      }

      seenOwnTrades.add(tradeKey);

      if (side === 'Buy') {
        (series[9] as any).data.push([trade.timestamp, trade.price]);
      } else {
        (series[10] as any).data.push([trade.timestamp, trade.price]);
      }
    }
  }

  return <Chart title={`${symbol} - Price`} series={series} />;
}

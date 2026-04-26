import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { getAskColor, getBidColor } from '../../utils/colors.ts';
import { Chart } from './Chart.tsx';

export interface SpreadChartProps {
  symbol: ProsperitySymbol;
}

export function SpreadChart({ symbol }: SpreadChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;

  const series: Highcharts.SeriesOptionsType[] = [
    {
      type: 'arearange',
      name: 'Spread band',
      color: 'rgba(150, 150, 150, 0.15)',
      fillColor: 'rgba(150, 150, 150, 0.15)',
      lineWidth: 0,
      enableMouseTracking: false,
      data: [],
      yAxis: 0,
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Best bid',
      color: getBidColor(1.0),
      lineWidth: 1.5,
      marker: { enabled: false },
      data: [],
      yAxis: 0,
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Best ask',
      color: getAskColor(1.0),
      lineWidth: 1.5,
      marker: { enabled: false },
      data: [],
      yAxis: 0,
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Spread (ask - bid)',
      color: '#f39c12',
      lineWidth: 1.5,
      marker: { enabled: false },
      data: [],
      yAxis: 1,
      dashStyle: 'ShortDash',
      dataGrouping: { enabled: false },
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
      tooltip: {
        pointFormatter(this: Highcharts.Point) {
          return `<span style="color:${this.color}">●</span> Bought (<b>${(this as any).custom}</b>): <b>${this.y}</b><br/>`;
        },
      },
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
      tooltip: {
        pointFormatter(this: Highcharts.Point) {
          return `<span style="color:${this.color}">●</span> Sold (<b>${(this as any).custom}</b>): <b>${this.y}</b><br/>`;
        },
      },
    },
  ];

  const bidAskByTimestamp = new Map<number, { bestBid: number | null; bestAsk: number | null }>();

  for (const row of algorithm.activityLogs) {
    if (row.product !== symbol) {
      continue;
    }

    const bid1 = row.bidPrices[0];
    const ask1 = row.askPrices[0];

    bidAskByTimestamp.set(row.timestamp, {
      bestBid: bid1 ?? null,
      bestAsk: ask1 ?? null,
    });

    if (bid1 !== undefined && ask1 !== undefined) {
      (series[0] as any).data.push([row.timestamp, bid1, ask1]);
      (series[1] as any).data.push([row.timestamp, bid1]);
      (series[2] as any).data.push([row.timestamp, ask1]);
      (series[3] as any).data.push([row.timestamp, ask1 - bid1]);
    } else if (bid1 !== undefined) {
      (series[1] as any).data.push([row.timestamp, bid1]);
    } else if (ask1 !== undefined) {
      (series[2] as any).data.push([row.timestamp, ask1]);
    }
  }

  function getFillSide(buyer: string, seller: string): 'Buy' | 'Sell' | null {
    if (buyer === 'SUBMISSION') {
      return 'Buy';
    }

    if (seller === 'SUBMISSION') {
      return 'Sell';
    }

    return null;
  }

  function isTaker(side: 'Buy' | 'Sell', price: number, timestamp: number): boolean {
    const book = bidAskByTimestamp.get(timestamp);
    if (!book) {
      return true;
    }

    if (side === 'Buy') {
      return book.bestAsk !== null && price >= book.bestAsk;
    }

    return book.bestBid !== null && price <= book.bestBid;
  }

  const seenOwnTrades = new Set<string>();

  for (const row of algorithm.data) {
    for (const trade of row.state.ownTrades[symbol] ?? []) {
      const side = getFillSide(trade.buyer, trade.seller);
      if (side === null) {
        continue;
      }

      const tradeKey = `${trade.symbol}:${trade.price}:${trade.quantity}:${trade.buyer}:${trade.seller}:${trade.timestamp}`;
      if (seenOwnTrades.has(tradeKey)) {
        continue;
      }

      seenOwnTrades.add(tradeKey);

      const role = isTaker(side, trade.price, trade.timestamp) ? 'taker' : 'maker';
      const point = { x: trade.timestamp, y: trade.price, custom: role };

      if (side === 'Buy') {
        (series[4] as any).data.push(point);
      } else {
        (series[5] as any).data.push(point);
      }
    }
  }

  const options: Highcharts.Options = {
    yAxis: [
      {
        title: { text: 'Price' },
        opposite: false,
        allowDecimals: false,
      },
      {
        title: { text: 'Spread' },
        opposite: true,
        allowDecimals: false,
        min: 0,
      },
    ],
  };

  return <Chart title={`${symbol} - Order Book Spread`} series={series} options={options} />;
}

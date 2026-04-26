import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

export interface PositionChartProps {
  symbols: string[];
}

export function PositionChart({ symbols }: PositionChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;

  const data: Record<string, [number, number][]> = {};
  for (const symbol of symbols) {
    data[symbol] = [];
  }

  if (algorithm.data.length > 0) {
    for (const row of algorithm.data) {
      for (const symbol of symbols) {
        const position = row.state.position[symbol] || 0;
        data[symbol].push([row.state.timestamp, position]);
      }
    }
  } else if (algorithm.tradeHistory && algorithm.tradeHistory.length > 0) {
    const running: Record<string, number> = {};
    const ownTrades = [...algorithm.tradeHistory]
      .filter(t => t.buyer === 'SUBMISSION' || t.buyer === '' || t.seller === 'SUBMISSION' || t.seller === '')
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const trade of ownTrades) {
      const sym = trade.symbol;
      if (!symbols.includes(sym)) continue;
      const isBuy = trade.buyer === 'SUBMISSION' || trade.buyer === '';
      running[sym] = (running[sym] ?? 0) + (isBuy ? trade.quantity : -trade.quantity);
      data[sym].push([trade.timestamp, running[sym]]);
    }

    for (const sym of symbols) {
      data[sym].sort((a, b) => a[0] - b[0]);
    }
  }

  const series: Highcharts.SeriesOptionsType[] = symbols.map((symbol, i) => ({
    type: 'line',
    name: symbol,
    data: data[symbol],
    colorIndex: i + 1,
    dataGrouping: { enabled: false },
  }));

  return (
    <Chart
      title="Positions"
      options={{ yAxis: { title: { text: 'Position' } } }}
      series={series}
    />
  );
}

import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

export interface VolumeChartProps {
  symbol?: ProsperitySymbol;
  symbols?: ProsperitySymbol[];
}

export function VolumeChart({ symbol, symbols }: VolumeChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const activeSymbols = [...new Set(symbols?.length ? symbols : symbol ? [symbol] : [])];

  const series: Highcharts.SeriesOptionsType[] = [];

  activeSymbols.forEach((activeSymbol, symbolIndex) => {
    const symbolSeries: Highcharts.SeriesOptionsType[] = [
      { type: 'column', name: `${activeSymbol} Bid 3`, colorIndex: symbolIndex * 6 + 0, data: [], dataGrouping: { enabled: false } },
      { type: 'column', name: `${activeSymbol} Bid 2`, colorIndex: symbolIndex * 6 + 1, data: [], dataGrouping: { enabled: false } },
      { type: 'column', name: `${activeSymbol} Bid 1`, colorIndex: symbolIndex * 6 + 2, data: [], dataGrouping: { enabled: false } },
      { type: 'column', name: `${activeSymbol} Ask 1`, colorIndex: symbolIndex * 6 + 3, data: [], dataGrouping: { enabled: false } },
      { type: 'column', name: `${activeSymbol} Ask 2`, colorIndex: symbolIndex * 6 + 4, data: [], dataGrouping: { enabled: false } },
      { type: 'column', name: `${activeSymbol} Ask 3`, colorIndex: symbolIndex * 6 + 5, data: [], dataGrouping: { enabled: false } },
    ];

    for (const row of algorithm.activityLogs) {
      if (row.product !== activeSymbol) {
        continue;
      }

      for (let i = 0; i < row.bidVolumes.length; i++) {
        (symbolSeries[2 - i] as any).data.push([row.timestamp, row.bidVolumes[i]]);
      }

      for (let i = 0; i < row.askVolumes.length; i++) {
        (symbolSeries[i + 3] as any).data.push([row.timestamp, row.askVolumes[i]]);
      }
    }

    series.push(...symbolSeries);
  });

  const title = activeSymbols.length > 1 ? 'Volume overlay' : `${activeSymbols[0] ?? symbol ?? 'Symbol'} - Volume`;

  return <Chart title={title} options={{ yAxis: { title: { text: 'Volume' } } }} series={series} />;
}

import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

export interface ProductPriceOverlayChartProps {
  symbols: ProsperitySymbol[];
}

export function ProductPriceOverlayChart({ symbols }: ProductPriceOverlayChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const activeSymbols = [...new Set(symbols)].filter(Boolean);

  const series: Highcharts.SeriesOptionsType[] = activeSymbols.map((symbol, index) => ({
    type: 'line',
    name: symbol,
    colorIndex: index + 1,
    marker: { enabled: false },
    lineWidth: 2,
    data: algorithm.activityLogs
      .filter(row => row.product === symbol && row.midPrice !== 0)
      .map(row => [row.timestamp, row.midPrice]),
  }));

  return (
    <Chart
      title="Price overlay"
      series={series}
      options={{
        yAxis: {
          title: { text: 'Price' },
          opposite: false,
          allowDecimals: false,
        },
      }}
    />
  );
}

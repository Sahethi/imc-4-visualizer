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
    },
    {
      type: 'line',
      name: 'Best bid',
      color: getBidColor(1.0),
      lineWidth: 1.5,
      marker: { enabled: false },
      data: [],
      yAxis: 0,
    },
    {
      type: 'line',
      name: 'Best ask',
      color: getAskColor(1.0),
      lineWidth: 1.5,
      marker: { enabled: false },
      data: [],
      yAxis: 0,
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
    },
  ];

  for (const row of algorithm.activityLogs) {
    if (row.product !== symbol) {
      continue;
    }

    const bid1 = row.bidPrices[0];
    const ask1 = row.askPrices[0];

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

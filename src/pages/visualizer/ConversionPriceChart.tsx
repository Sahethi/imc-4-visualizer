import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

export interface ConversionPriceChartProps {
  symbol?: ProsperitySymbol;
  symbols?: ProsperitySymbol[];
}

export function ConversionPriceChart({ symbol, symbols }: ConversionPriceChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const activeSymbols = [...new Set(symbols?.length ? symbols : symbol ? [symbol] : [])];

  const series: Highcharts.SeriesOptionsType[] = [];

  activeSymbols.forEach((activeSymbol, index) => {
    const bidPriceData: [number, number][] = [];
    const askPriceData: [number, number][] = [];

    for (const row of algorithm.data) {
      const observation = row.state.observations.conversionObservations[activeSymbol];
      if (observation === undefined) {
        continue;
      }

      bidPriceData.push([row.state.timestamp, observation.bidPrice]);
      askPriceData.push([row.state.timestamp, observation.askPrice]);
    }

    series.push(
      {
        type: 'line',
        name: `${activeSymbol} Bid`,
        colorIndex: index * 2,
        marker: { symbol: 'triangle' },
        data: bidPriceData,
      },
      {
        type: 'line',
        name: `${activeSymbol} Ask`,
        colorIndex: index * 2 + 1,
        marker: { symbol: 'triangle-down' },
        data: askPriceData,
      },
    );
  });

  const options: Highcharts.Options = {
    yAxis: {
      title: { text: 'Price' },
      opposite: true,
      allowDecimals: true,
    },
  };

  const title =
    activeSymbols.length > 1
      ? 'Conversion price overlay'
      : `${activeSymbols[0] ?? symbol ?? 'Symbol'} - Conversion price`;

  return <Chart title={title} options={options} series={series} />;
}

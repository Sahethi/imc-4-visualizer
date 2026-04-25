import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

export interface PlainValueObservationChartProps {
  symbol?: ProsperitySymbol;
  symbols?: ProsperitySymbol[];
}

export function PlainValueObservationChart({ symbol, symbols }: PlainValueObservationChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const activeSymbols = [...new Set(symbols?.length ? symbols : symbol ? [symbol] : [])];

  const series: Highcharts.SeriesOptionsType[] = activeSymbols.map((activeSymbol, index) => {
    const values: [number, number][] = [];

    for (const row of algorithm.data) {
      const observation = row.state.observations.plainValueObservations[activeSymbol];
      if (observation === undefined) {
        continue;
      }

      values.push([row.state.timestamp, observation]);
    }

    return { type: 'line', name: activeSymbol, colorIndex: index, data: values };
  });

  const options: Highcharts.Options = {
    yAxis: {
      title: { text: 'Value' },
      allowDecimals: true,
    },
  };

  const title =
    activeSymbols.length > 1
      ? 'Plain value observation overlay'
      : `${activeSymbols[0] ?? symbol ?? 'Symbol'} - Plain value observation`;

  return <Chart title={title} options={options} series={series} />;
}

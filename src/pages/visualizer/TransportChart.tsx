import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

export interface TransportChartProps {
  symbol?: ProsperitySymbol;
  symbols?: ProsperitySymbol[];
}

export function TransportChart({ symbol, symbols }: TransportChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const activeSymbols = [...new Set(symbols?.length ? symbols : symbol ? [symbol] : [])];

  const series: Highcharts.SeriesOptionsType[] = [];

  activeSymbols.forEach((activeSymbol, index) => {
    const transportFeesData: [number, number][] = [];
    const importTariffData: [number, number][] = [];
    const exportTariffData: [number, number][] = [];

    for (const row of algorithm.data) {
      const observation = row.state.observations.conversionObservations[activeSymbol];
      if (observation === undefined) {
        continue;
      }

      transportFeesData.push([row.state.timestamp, observation.transportFees]);
      importTariffData.push([row.state.timestamp, observation.importTariff]);
      exportTariffData.push([row.state.timestamp, observation.exportTariff]);
    }

    series.push(
      { type: 'line', name: `${activeSymbol} Transport fees`, colorIndex: index * 3, data: transportFeesData, dataGrouping: { enabled: false } },
      {
        type: 'line',
        name: `${activeSymbol} Import tariff`,
        colorIndex: index * 3 + 1,
        marker: { symbol: 'triangle' },
        data: importTariffData,
        dataGrouping: { enabled: false },
      },
      {
        type: 'line',
        name: `${activeSymbol} Export tariff`,
        colorIndex: index * 3 + 2,
        marker: { symbol: 'triangle-down' },
        data: exportTariffData,
        dataGrouping: { enabled: false },
      },
    );
  });

  const title =
    activeSymbols.length > 1 ? 'Transport overlay' : `${activeSymbols[0] ?? symbol ?? 'Symbol'} - Transport`;

  return <Chart title={title} options={{ yAxis: { title: { text: 'Fees / tariff' } } }} series={series} />;
}

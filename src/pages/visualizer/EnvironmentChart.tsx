import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

export interface EnvironmentChartProps {
  symbol: ProsperitySymbol;
}

export function EnvironmentChart({ symbol }: EnvironmentChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;

  const sunlightData = [];
  const humidityData = [];

  for (const row of algorithm.data) {
    const observation = row.state.observations.conversionObservations[symbol];
    if (observation === undefined) {
      continue;
    }

    sunlightData.push([row.state.timestamp, observation.sunlight]);
    humidityData.push([row.state.timestamp, observation.humidity]);
  }

  const series: Highcharts.SeriesOptionsType[] = [
    { type: 'line', name: 'Sunlight', marker: { symbol: 'square' }, yAxis: 0, data: sunlightData, dataGrouping: { enabled: false } },
    { type: 'line', name: 'Humidity', marker: { symbol: 'circle' }, yAxis: 1, data: humidityData, dataGrouping: { enabled: false } },
  ];

  const options: Highcharts.Options = {
    yAxis: [{ title: { text: 'Sunlight' } }, { title: { text: 'Humidity' }, opposite: true }],
  };

  return <Chart title={`${symbol} - Environment`} options={options} series={series} />;
}

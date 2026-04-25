import Highcharts from 'highcharts/highstock';
import HighchartsAccessibility from 'highcharts/modules/accessibility';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsMore from 'highcharts/highcharts-more';
import HighchartsOfflineExporting from 'highcharts/modules/offline-exporting';
import HighchartsHighContrastDarkTheme from 'highcharts/themes/high-contrast-dark';
import HighchartsReact from 'highcharts-react-official';
import merge from 'lodash/merge';
import { ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@mantine/core';
import { useActualColorScheme } from '../../hooks/use-actual-color-scheme.ts';
import { formatNumber } from '../../utils/format.ts';
import { VisualizerCard } from './VisualizerCard.tsx';

HighchartsAccessibility(Highcharts);
HighchartsExporting(Highcharts);
HighchartsMore(Highcharts);
HighchartsOfflineExporting(Highcharts);

// Highcharts themes are distributed as Highcharts extensions
// The normal way to use them is to apply these extensions to the global Highcharts object
// However, themes work by overriding the default options, with no way to rollback
// To make theme switching work, we merge theme options into the local chart options instead
// This way we don't override the global defaults and can change themes without refreshing
// This function is a little workaround to be able to get the options a theme overrides
function getThemeOptions(theme: (highcharts: typeof Highcharts) => void): Highcharts.Options {
  const highchartsMock = {
    addEvent: () => {},
    removeEvent: () => {},
    fireEvent: () => {},
    _modules: {
      'Core/Globals.js': {
        theme: null,
        win: typeof window !== 'undefined' ? window : { dispatchEvent: () => {} },
      },
      'Core/Defaults.js': {
        setOptions: () => {
          // Do nothing
        },
      },
    },
  };

  try {
    theme(highchartsMock as any);
  } catch {
    // Theme mock may be incomplete for newer Highcharts versions; fall back gracefully
  }

  return (highchartsMock._modules['Core/Globals.js'].theme ?? {}) as Highcharts.Options;
}

interface ChartProps {
  title: string;
  options?: Highcharts.Options;
  series: Highcharts.SeriesOptionsType[];
  min?: number;
  max?: number;
  controls?: ReactNode;
  tooltipHeaderFormatter?: (x: number) => string;
}

export function Chart({ title, options, series, min, max, controls, tooltipHeaderFormatter }: ChartProps): ReactNode {
  const colorScheme = useActualColorScheme();
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const tooltipHeaderFormatterRef = useRef(tooltipHeaderFormatter);
  useEffect(() => {
    tooltipHeaderFormatterRef.current = tooltipHeaderFormatter;
  }, [tooltipHeaderFormatter]);

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener('mousedown', stop, true);
    el.addEventListener('pointerdown', stop, true);
    return () => {
      el.removeEventListener('mousedown', stop, true);
      el.removeEventListener('pointerdown', stop, true);
    };
  }, [isFullscreen]);

  const fullOptions = useMemo((): Highcharts.Options => {
    const themeOptions = colorScheme === 'light' ? {} : getThemeOptions(HighchartsHighContrastDarkTheme);

    const chartOptions: Highcharts.Options = {
      chart: {
        animation: false,
        height: isFullscreen ? undefined : 550,
        marginBottom: isFullscreen ? undefined : 110,
        zooming: {
          type: 'x',
        },
        panning: {
          enabled: true,
          type: 'x',
        },
        panKey: 'shift',
        numberFormatter: formatNumber,
        events: {
          load() {
            Highcharts.addEvent(this.tooltip, 'headerFormatter', (e: any) => {
              if (e.isFooter) {
                return true;
              }

              let x = e.labelConfig.point.x;

              if (e.labelConfig.point.dataGroup) {
                const xData = e.labelConfig.series.xData;
                const lastTimestamp = xData[xData.length - 1];
                if (x + 100 * e.labelConfig.point.dataGroup.length >= lastTimestamp) {
                  x = lastTimestamp;
                }
              }

              const fmt = tooltipHeaderFormatterRef.current;
              e.text = fmt ? fmt(x) : `Timestamp ${formatNumber(x)}<br/>`;
              return false;
            });

            const chart = this;
            Highcharts.addEvent(chart, 'fullscreenOpen', function () {
              chart.update({ tooltip: { outside: false } }, false);
            });
            Highcharts.addEvent(chart, 'fullscreenClose', function () {
              chart.update({ tooltip: { outside: true } }, false);
            });
          },
        },
      },
      title: {
        text: title,
      },
      credits: {
        href: 'javascript:window.open("https://www.highcharts.com/?credits", "_blank")',
      },
      plotOptions: {
        series: {
          dataGrouping: {
            approximation(this: any, values: number[]): number {
              const endIndex = this.dataGroupInfo.start + this.dataGroupInfo.length;
              if (endIndex < this.xData.length) {
                return values[0];
              } else {
                return values[values.length - 1];
              }
            },
            anchor: 'start',
            firstAnchor: 'firstPoint',
            lastAnchor: 'lastPoint',
            units: [['second', [1, 2, 5, 10]]],
          },
        },
      },
      xAxis: {
        type: 'datetime',
        title: {
          text: 'Timestamp',
        },
        crosshair: {
          width: 1,
        },
        labels: {
          formatter: params => formatNumber(params.value as number),
        },
      },
      yAxis: {
        opposite: false,
        allowDecimals: false,
        min,
        max,
      },
      tooltip: {
        split: false,
        shared: true,
        outside: true,
      },
      legend: {
        enabled: true,
        verticalAlign: 'bottom',
        layout: 'horizontal',
        align: 'center',
        margin: 8,
      },
      rangeSelector: {
        enabled: false,
      },
      navigator: {
        enabled: false,
      },
      scrollbar: {
        enabled: false,
      },
      series,
      ...options,
    };

    return merge(themeOptions, chartOptions);
  }, [colorScheme, title, options, series, min, max, isFullscreen]);

  const controlsPortalTarget = chartRef.current?.container.current ?? null;

  return (
    <VisualizerCard p={0}>
      {controls && !isFullscreen && <Box px="md" pt="sm">{controls}</Box>}
      <HighchartsReact ref={chartRef} highcharts={Highcharts} constructorType={'stockChart'} options={fullOptions} />
      {controls && isFullscreen && controlsPortalTarget && createPortal(
        <div
          ref={overlayRef}
          style={{
            position: 'absolute',
            top: 48,
            left: 8,
            zIndex: 9999,
            pointerEvents: 'all',
            background: 'var(--mantine-color-body)',
            borderRadius: 'var(--mantine-radius-sm)',
            border: '1px solid var(--mantine-color-default-border)',
            padding: '4px 12px',
          }}
        >
          {controls}
        </div>,
        controlsPortalTarget,
      )}
    </VisualizerCard>
  );
}

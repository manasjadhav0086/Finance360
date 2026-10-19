import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { formatNumber } from '../../utils/formatters';
import { enhanceChartLegendOrdering, sortSeriesByContribution } from '../../utils/chartUtils';
import { getCategoryColor, ENTERPRISE_SERIES_PALETTE, THEME_TOKENS } from '../../utils/theme';

const EChart = ({
  option,
  config,
  height = '100%',
  className = '',
  title = '',
  headerTitle = '',
  subtitle = '',
  icon: HeaderIcon = null,
  iconBg = 'bg-blue-50 text-blue-600',
  exportFilename = '',
}) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Extract source data if config is provided
  const source = useMemo(() => config?.data || config?.config || config || null, [config]);

  const getExportFilename = () => {
    if (exportFilename) return String(exportFilename).trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    if (title) return String(title).trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    if (headerTitle) return String(headerTitle).trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    if (typeof option?.title?.text === 'string' && option.title.text) {
      return option.title.text.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    }
    if (Array.isArray(option?.title) && option.title[0]?.text) {
      return String(option.title[0].text).trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    }
    if (option?.chartTitle) {
      return String(option.chartTitle).trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    }
    if (config?.title) {
      return String(config.title).trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    }
    const parentCard = chartRef.current?.closest('.bg-white, [class*="rounded"]');
    const cardHeading = parentCard?.querySelector('.text-sm.font-bold, .font-bold, h1, h2, h3')?.textContent;
    if (cardHeading) {
      return cardHeading.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    }
    return 'Chart_Export';
  };

  const handleDownload = () => {
    if (!chartInstance.current) return;
    try {
      const filename = getExportFilename();
      const url = chartInstance.current.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        excludeComponents: ['toolbox'],
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('[EChart] Download failed:', e);
    }
  };

  const handleReset = () => {
    if (!chartInstance.current) return;
    try {
      chartInstance.current.dispatchAction({ type: 'restore' });
    } catch (e) {
      console.error('[EChart] Reset failed:', e);
    }
  };

  // Handle direct option prop
  useEffect(() => {
    if (!chartRef.current || !option) return;

    const baseTooltip = option.tooltip ? {
      appendTo: 'body',
      appendToBody: true,
      ...option.tooltip,
      extraCssText: `${option.tooltip.extraCssText || ''} z-index: 9999999; pointer-events: none;`,
    } : {
      appendTo: 'body',
      appendToBody: true,
    };

    const finalOption = enhanceChartLegendOrdering({
      ...option,
      tooltip: baseTooltip,
      toolbox: headerTitle ? { show: false } : (option.toolbox || {
        show: true,
        right: 22,
        top: 2,
        itemSize: 13,
        itemGap: 12,
        iconStyle: {
          borderColor: '#94A3B8',
          borderWidth: 1.2,
        },
        emphasis: {
          iconStyle: {
            borderColor: '#2563EB',
          },
        },
        feature: {
          saveAsImage: {
            show: true,
            title: 'Download',
            name: getExportFilename(),
            backgroundColor: '#FFFFFF',
            type: 'png',
            pixelRatio: 2,
            excludeComponents: ['toolbox'],
          },
          restore: {
            show: true,
            title: 'Reset',
          },
        },
      }),
    });

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    try {
      chartInstance.current.setOption(finalOption, { notMerge: true });

      chartInstance.current.off('mouseover');
      chartInstance.current.off('mousemove');
      chartInstance.current.off('mouseout');
      chartInstance.current.off('globalout');
      chartInstance.current.off('legendselectchanged');
      chartInstance.current.off('restore');

      chartInstance.current.on('mouseover', (params) => {
        if (params?.componentType === 'series' && params.seriesName) {
          window.__echartsHoveredSeries = params.seriesName;
        }
      });
      chartInstance.current.on('mousemove', (params) => {
        if (params?.componentType === 'series' && params.seriesName) {
          window.__echartsHoveredSeries = params.seriesName;
        }
      });
      chartInstance.current.on('mouseout', (params) => {
        if (params?.componentType === 'series') {
          window.__echartsHoveredSeries = null;
        }
      });
      chartInstance.current.on('globalout', () => {
        window.__echartsHoveredSeries = null;
      });

      chartInstance.current.on('legendselectchanged', (event) => {
        const selectedMap = event.selected || {};
        const currentOption = chartInstance.current.getOption();
        if (!currentOption || !currentOption.series) return;

        const totalSeriesIdx = currentOption.series.findIndex((s) => s.name === 'Total');
        if (totalSeriesIdx >= 0) {
          const categoriesLen = currentOption.xAxis?.[0]?.data?.length || 0;
          const newTotals = new Array(categoriesLen).fill(0);

          currentOption.series.forEach((s) => {
            if (s.name !== 'Total' && s.stack === 's1' && selectedMap[s.name] !== false) {
              const sData = Array.isArray(s.data) ? s.data : [];
              sData.forEach((val, idx) => {
                newTotals[idx] += Number(val || 0);
              });
            }
          });

          chartInstance.current.setOption({
            series: [
              {
                name: 'Total',
                label: {
                  formatter: (params) => {
                    const tot = newTotals[params.dataIndex];
                    return tot > 0 ? Math.round(tot).toLocaleString('en-IN') : '';
                  },
                },
              },
            ],
          });
        }
      });

      chartInstance.current.on('restore', () => {
        window.__echartsHoveredSeries = null;
        const currentOption = chartInstance.current.getOption();
        if (!currentOption || !currentOption.series) return;

        const totalSeriesIdx = currentOption.series.findIndex((s) => s.name === 'Total');
        if (totalSeriesIdx >= 0) {
          const categoriesLen = currentOption.xAxis?.[0]?.data?.length || 0;
          const fullTotals = new Array(categoriesLen).fill(0);

          currentOption.series.forEach((s) => {
            if (s.name !== 'Total' && s.stack === 's1') {
              const sData = Array.isArray(s.data) ? s.data : [];
              sData.forEach((val, idx) => {
                fullTotals[idx] += Number(val || 0);
              });
            }
          });

          chartInstance.current.setOption({
            series: [
              {
                name: 'Total',
                label: {
                  formatter: (params) => {
                    const tot = fullTotals[params.dataIndex];
                    return tot > 0 ? Math.round(tot).toLocaleString('en-IN') : '';
                  },
                },
              },
            ],
          });
        }
      });
    } catch (err) {
      console.error('[EChart] setOption failed:', err);
    }

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && chartRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (chartInstance.current && chartRef.current && chartRef.current.clientWidth > 0) {
          chartInstance.current.resize();
        }
      });
      resizeObserver.observe(chartRef.current);
    }

    const handleResize = () => {
      try {
        if (chartInstance.current && chartRef.current && chartRef.current.clientWidth > 0) {
          chartInstance.current.resize();
        }
      } catch (e) { }
    };

    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [option]);

  // Handle config prop (with rich donut center computation and tooltip formatting)
  useEffect(() => {
    if (option || !source || !chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    let rawType = source.chart?.type || source.type;
    const titleText = (source.title?.text || '').toLowerCase();

    if (!rawType || rawType === 'bar' || rawType === 'line' || rawType === 'column') {
      if (titleText.includes('pie')) rawType = 'pie';
      else if (titleText.includes('donut')) rawType = 'donut';
    }

    const type = (rawType || 'bar').toLowerCase();
    const colors = ENTERPRISE_SERIES_PALETTE;

    const isMobile = window.innerWidth < 1024;
    const isPieOrDonut = ['pie', 'donut'].includes(type);

    let series = [];
    let totalSum = 0;

    if (isPieOrDonut) {
      let extractedData = [];

      if (Array.isArray(source.series)) {
        const firstSeries = source.series[0];
        if (typeof firstSeries === 'object' && firstSeries !== null) {
          if (Array.isArray(firstSeries.data) && firstSeries.data.length > 0 && typeof firstSeries.data[0] === 'object' && 'name' in firstSeries.data[0]) {
            extractedData = firstSeries.data;
          } else if ('name' in firstSeries && 'value' in firstSeries) {
            extractedData = source.series;
          }
        }
      }

      if (extractedData.length === 0) {
        const labels = source.labels || source.xAxis?.categories || source.xaxis?.categories || [];
        let values = [];

        if (Array.isArray(source.series)) {
          if (typeof source.series[0] === 'object' && source.series[0] !== null && 'data' in source.series[0]) {
            values = source.series[0].data;
          } else {
            values = source.series;
          }
        }

        extractedData = labels.map((name, i) => ({
          name: String(name),
          value: Number(values[i]) || 0,
        }));
      }

      const finalData = extractedData
        .map((item, idx) => ({
          name: String(item.name || 'Unknown'),
          value: Number(item.value) || 0,
          itemStyle: {
            color: getCategoryColor(String(item.name || ''), idx),
            borderColor: '#FFFFFF',
            borderWidth: 2,
          },
        }))
        .sort((a, b) => b.value - a.value);

      totalSum = finalData.reduce((sum, v) => sum + v.value, 0);
      const chartCenter = isMobile ? ['50%', '42%'] : ['50%', '48%'];

      series = [
        {
          name: source.title?.text || '',
          type: 'pie',
          radius: type === 'donut' ? ['45%', '60%'] : '55%',
          center: chartCenter,
          avoidLabelOverlap: true,
          minShowLabelAngle: 3.6,
          labelLayout: {
            hideOverlap: true,
            moveOverlap: 'shiftY',
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}',
            fontSize: 11,
            color: '#475569',
            fontFamily: 'Inter, sans-serif',
          },
          labelLine: {
            show: true,
            length: 15,
            length2: 12,
            smooth: true,
            lineStyle: {
              color: '#94a3b8',
              width: 1,
            },
          },
          emphasis: {
            scale: true,
            scaleSize: 6,
          },
          data: finalData,
        },
      ];
    } else {
      const rawSeriesData = Array.isArray(source.series) ? source.series : [];
      const seriesData = sortSeriesByContribution(rawSeriesData);
      series = seriesData.map((s, sIdx) => {
        const sColor = getCategoryColor(s.name, sIdx);
        return {
          ...s,
          name: s.name,
          type: type === 'area' ? 'line' : type,
          areaStyle: type === 'area' ? { opacity: 0.1 } : undefined,
          smooth: false,
          symbolSize: 6,
          data: Array.isArray(s.data)
            ? s.data.map((val) => (typeof val === 'string' ? Number(val.replace(/,/g, '')) : val) || 0)
            : [],
          itemStyle: {
            color: sColor,
            borderRadius: 0,
            ...s.itemStyle,
          },
          lineStyle: {
            color: sColor,
            width: 2.2,
            ...s.lineStyle,
          },
          label: {
            ...s.label,
            formatter: (params) => {
              let val = params.value;
              if (Array.isArray(val)) val = val[1];
              if (val != null && !isNaN(Number(val))) {
                return Number(val).toLocaleString('en-US');
              }
              return val;
            },
          },
        };
      });
    }

    const titleOptions = [
      {
        text: source.title?.text || '',
        left: 'left',
        textStyle: {
          fontSize: isMobile ? 13 : 14,
          fontWeight: 600,
          color: '#0F172A',
          fontFamily: 'Inter, sans-serif',
        },
      },
    ];

    const toolboxFeatures = {
      saveAsImage: {
        show: true,
        title: 'Download',
        name: getExportFilename(),
        backgroundColor: '#FFFFFF',
        type: 'png',
        pixelRatio: 2,
        excludeComponents: ['toolbox'],
      },
      restore: { show: true, title: 'Reset' },
    };

    if (!isPieOrDonut) {
      toolboxFeatures.magicType = {
        show: true,
        type: ['line', 'bar'],
        title: { line: 'Line Chart', bar: 'Bar Chart' },
      };
    }

    const donutGraphic = [
      {
        id: 'donut-total-value',
        type: 'text',
        left: 'center',
        top: isMobile ? '38%' : '44%',
        style: {
          text: formatNumber(totalSum, true),
          textAlign: 'center',
          fill: '#0f172a',
          fontSize: isMobile ? 22 : 26,
          fontWeight: 700,
          fontFamily: 'Inter, sans-serif',
        },
      },
      {
        id: 'donut-total-label',
        type: 'text',
        left: 'center',
        top: isMobile ? '46%' : '52%',
        style: {
          text: 'TOTAL',
          textAlign: 'center',
          fill: '#64748b',
          fontSize: isMobile ? 10 : 11,
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
        },
      },
    ];

    const generatedOption = {
      color: colors,
      title: titleOptions,
      toolbox: {
        show: !headerTitle,
        feature: toolboxFeatures,
        right: 22,
        top: isMobile ? 35 : 2,
        itemSize: 14,
        iconStyle: { borderColor: '#94a3b8' },
      },
      tooltip: {
        appendTo: 'body',
        appendToBody: true,
        trigger: isPieOrDonut ? 'item' : 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: [8, 12],
        textStyle: {
          color: '#0f172a',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
        },
        extraCssText: 'box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); border-radius: 6px; z-index: 9999999; pointer-events: none;',
        formatter: (params) => {
          try {
            if (Array.isArray(params)) {
              let res = `<div style="font-weight: 600; color: #0f172a; font-size: 12px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">${params[0].axisValue}</div>`;
              res += `<div style="display: flex; flex-direction: column; gap: 4px;">`;
              params.forEach((p) => {
                if (p.value === null || p.value === undefined || p.seriesName === 'Total') return;
                res += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 11.5px;">
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: ${p.color};"></span>
                            <span style="color: #475569; font-weight: 400;">${p.seriesName}</span>
                          </div>
                          <span style="font-weight: 600; color: #0f172a; font-family: ui-monospace, monospace;">${formatNumber(p.value, false)}</span>
                        </div>`;
              });
              res += `</div>`;
              return res;
            } else {
              return `
                <div style="font-weight: 600; color: #0f172a; font-size: 12px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">
                  ${params.name}
                </div>
                <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px;">
                  <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: ${params.color};"></span>
                  <span style="font-weight: 600; color: #0f172a; font-family: ui-monospace, monospace;">
                    ${formatNumber(params.value, false)} (${params.percent}%)
                  </span>
                </div>
              `;
            }
          } catch (e) {
            return '';
          }
        },
      },
      legend: {
        show: true,
        type: 'scroll',
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        icon: 'circle',
        itemGap: isMobile ? 12 : 20,
        textStyle: {
          color: '#64748b',
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
        },
        padding: [8, 0, 0, 0],
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: isPieOrDonut ? '10%' : '15%',
        top: isMobile ? '30%' : '20%',
        containLabel: true,
      },
      xAxis: isPieOrDonut
        ? undefined
        : {
          type: 'category',
          data: source.xAxis?.categories || source.xaxis?.categories || [],
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisLabel: {
            color: '#64748b',
            fontSize: 10,
            interval: 0,
            rotate: (source.xAxis?.categories?.length || source.xaxis?.categories?.length || 0) > 8 ? 25 : 0,
          },
          axisPointer: { show: true, type: 'shadow' },
        },
      yAxis: isPieOrDonut
        ? undefined
        : {
          type: 'value',
          axisLine: { show: false },
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLabel: {
            color: '#64748b',
            fontSize: 11,
            formatter: (v) => formatNumber(v, true),
          },
        },
      graphic: type === 'donut' ? donutGraphic : [],
      series,
    };

    try {
      chartInstance.current.setOption(generatedOption, { notMerge: true });

      chartInstance.current.off('legendselectchanged');
      chartInstance.current.off('restore');

      const updateDonutCenterText = (selectedMap) => {
        const currentChart = chartInstance.current;
        if (!currentChart || type !== 'donut' || !series[0]?.data) return;

        let visibleTotal = 0;
        series[0].data.forEach((item) => {
          if (!selectedMap || selectedMap[item.name] !== false) {
            visibleTotal += item.value || 0;
          }
        });

        const isMobileNow = window.innerWidth < 1024;
        currentChart.setOption({
          graphic: [
            {
              id: 'donut-total-value',
              style: {
                text: formatNumber(visibleTotal, true),
                fontSize: isMobileNow ? 22 : 26,
              },
              top: isMobileNow ? '38%' : '44%',
            },
            {
              id: 'donut-total-label',
              top: isMobileNow ? '46%' : '52%',
              style: { fontSize: isMobileNow ? 10 : 11 },
            },
          ],
        });
      };

      chartInstance.current.on('legendselectchanged', (event) => {
        updateDonutCenterText(event.selected);
      });

      chartInstance.current.on('restore', () => {
        updateDonutCenterText(null);
      });
    } catch (err) {
      console.error('[EChart] generated setOption failed:', err);
    }

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && chartRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (chartInstance.current && chartRef.current && chartRef.current.clientWidth > 0) {
          chartInstance.current.resize();
        }
      });
      resizeObserver.observe(chartRef.current);
    }

    const handleResize = () => {
      try {
        if (chartInstance.current && chartRef.current && chartRef.current.clientWidth > 0) {
          chartInstance.current.resize();
        }
      } catch (e) { }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [option, source]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div className={`w-full h-full min-w-0 min-h-0 flex flex-col relative ${className}`}>
      {headerTitle && (
        <div className="flex items-center justify-between gap-2 mb-3 px-3 sm:px-4 py-2 sm:py-2.5 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 rounded-t-xl bg-gradient-to-r from-[#102A54] via-[#184480] to-[#1E56A0] text-white shadow-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0 pr-1">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] shadow-xs shrink-0" />
            <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
              <span className="text-xs sm:text-[13.5px] font-bold text-white tracking-tight break-words leading-snug">{headerTitle}</span>
              {subtitle && <span className="text-[10px] sm:text-[11px] text-blue-100/85 font-medium line-clamp-1 sm:truncate">{subtitle}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-blue-200">
            <div className="relative group">
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 rounded-md text-blue-100 hover:text-white hover:bg-white/15 transition-colors flex items-center justify-center cursor-pointer"
                title="Download PNG"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
            </div>

            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  if (chartRef.current) {
                    if (!document.fullscreenElement) {
                      chartRef.current.closest('.bg-white')?.requestFullscreen?.();
                    } else {
                      document.exitFullscreen?.();
                    }
                  }
                }}
                className="p-1.5 rounded-md text-blue-100 hover:text-white hover:bg-white/15 transition-colors flex items-center justify-center cursor-pointer"
                title="Expand"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </button>
            </div>

            <div className="relative group">
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-md text-blue-100 hover:text-white hover:bg-white/15 transition-colors flex items-center justify-center cursor-pointer"
                title="Reset View"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        ref={chartRef}
        style={{ width: '100%', height: headerTitle ? undefined : height }}
        className={`w-full min-w-0 ${headerTitle ? 'flex-1 min-h-[300px]' : ''}`}
      />
    </div>
  );
};

export default EChart;

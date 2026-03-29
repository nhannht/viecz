/* eslint-disable @typescript-eslint/no-explicit-any */

const COLORS = {
  fg: '#191C1D',
  bg: '#FCFCF9',
  muted: '#5E6C70',
  primary: '#32B8C6',
  secondary: '#21808D',
  accent: '#3B82F6',
  danger: '#E57373',
  success: '#66BB6A',
  warning: '#FFB74D',
};

const BASE: Partial<any> = {
  backgroundColor: 'transparent',
  textStyle: { fontFamily: 'Inter, sans-serif', color: COLORS.fg },
};

/** Section 3 — Student income vs living cost bar chart */
export const INCOME_VS_COST_CHART: any = {
  ...BASE,
  tooltip: { trigger: 'axis' },
  legend: { data: ['Thu nhập part-time', 'Chi phí sinh hoạt'], bottom: 0, textStyle: { color: COLORS.muted } },
  grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
  xAxis: {
    type: 'category',
    data: ['Lương tối thiểu\n(25.5k/giờ)', 'Part-time\ntrung bình', 'Chi phí\nsinh hoạt'],
    axisLabel: { color: COLORS.muted, fontSize: 11 },
    axisLine: { lineStyle: { color: COLORS.muted } },
  },
  yAxis: {
    type: 'value',
    name: 'VND/tháng',
    nameTextStyle: { color: COLORS.muted, fontSize: 11 },
    axisLabel: {
      color: COLORS.muted,
      fontSize: 11,
      formatter: (v: number) => (v / 1000000).toFixed(1) + 'tr',
    },
    splitLine: { lineStyle: { color: '#e0e0e0', type: 'dashed' } },
  },
  series: [
    {
      name: 'Thu nhập part-time',
      type: 'bar',
      data: [
        { value: 1020000, itemStyle: { color: COLORS.primary } },
        { value: 1800000, itemStyle: { color: COLORS.secondary } },
        null,
      ],
      barWidth: '35%',
      label: { show: true, position: 'top', fontSize: 10, color: COLORS.fg, formatter: (p: { value: number }) => (p.value / 1000000).toFixed(1) + 'tr' },
    },
    {
      name: 'Chi phí sinh hoạt',
      type: 'bar',
      data: [null, null, { value: 5000000, itemStyle: { color: COLORS.danger } }],
      barWidth: '35%',
      label: { show: true, position: 'top', fontSize: 10, color: COLORS.fg, formatter: () => '5.0tr' },
    },
  ],
};

/** Section 5 — Market sizing funnel */
export const TAM_SAM_SOM_CHART: any = {
  ...BASE,
  tooltip: { trigger: 'item', formatter: '{b}' },
  series: [
    {
      type: 'funnel',
      left: '10%',
      width: '80%',
      top: 10,
      bottom: 10,
      sort: 'descending',
      gap: 6,
      label: { show: true, position: 'inside', fontSize: 13, color: COLORS.fg, fontWeight: 'bold' },
      labelLine: { show: false },
      data: [
        { value: 2150000, name: 'Tổng thị trường — 2,15 triệu SV cả nước', itemStyle: { color: '#B2EBF2' } },
        { value: 500000, name: 'Thị trường khả dụng — 500.000 SV TP.HCM', itemStyle: { color: '#4DD0E1' } },
        { value: 500, name: 'Mục tiêu — Pilot ĐHKHTN (200–500 SV)', itemStyle: { color: COLORS.secondary } },
      ],
    },
  ],
};

/** Section 5 — Competitor radar chart */
export const COMPETITOR_RADAR_CHART: any = {
  ...BASE,
  tooltip: {},
  legend: {
    data: ['Zalo/FB', 'Grab', 'TaskRabbit', 'GoGetter', 'Viecz'],
    bottom: 0,
    textStyle: { color: COLORS.muted, fontSize: 10 },
  },
  radar: {
    indicator: [
      { name: 'Vị trí\nthời gian thực', max: 5 },
      { name: 'Escrow\nthanh toán', max: 5 },
      { name: 'Micro-task\nđa dạng', max: 5 },
      { name: 'Nhắm\nsinh viên', max: 5 },
      { name: 'Phí\nthấp', max: 5 },
      { name: 'Hoạt động\ntại VN', max: 5 },
    ],
    shape: 'polygon',
    splitArea: { areaStyle: { color: ['rgba(50,184,198,0.02)', 'rgba(50,184,198,0.05)'] } },
    axisName: { color: COLORS.muted, fontSize: 10 },
    splitLine: { lineStyle: { color: '#e0e0e0' } },
  },
  series: [
    {
      type: 'radar',
      data: [
        { value: [0, 0, 1, 2, 5, 5], name: 'Zalo/FB', lineStyle: { color: '#999', type: 'dashed' }, itemStyle: { color: '#999' } },
        { value: [4, 2, 1, 0, 3, 5], name: 'Grab', lineStyle: { color: COLORS.warning }, itemStyle: { color: COLORS.warning } },
        { value: [3, 5, 5, 1, 1, 0], name: 'TaskRabbit', lineStyle: { color: COLORS.danger }, itemStyle: { color: COLORS.danger } },
        { value: [1, 3, 3, 3, 3, 0], name: 'GoGetter', lineStyle: { color: '#AB47BC' }, itemStyle: { color: '#AB47BC' } },
        {
          value: [5, 5, 5, 5, 4, 5], name: 'Viecz',
          lineStyle: { color: COLORS.secondary, width: 3 },
          areaStyle: { color: 'rgba(33,128,141,0.15)' },
          itemStyle: { color: COLORS.secondary },
        },
      ],
    },
  ],
};

/** Section 6 — Operating cost donut chart */
export const COST_BREAKDOWN_CHART: any = {
  ...BASE,
  tooltip: { trigger: 'item', formatter: '{b}: {c} VND/tháng' },
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      label: { show: true, fontSize: 11, color: COLORS.fg, formatter: '{b}\n{c} VND' },
      labelLine: { lineStyle: { color: COLORS.muted } },
      data: [
        { value: 150000, name: 'VPS', itemStyle: { color: COLORS.secondary } },
        { value: 15000, name: 'Domain + DNS', itemStyle: { color: COLORS.primary } },
        { value: 35000, name: 'Khác (dự phòng)', itemStyle: { color: COLORS.muted } },
      ],
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)' } },
    },
  ],
};

/** Section 6 — Roadmap Gantt-style horizontal bar */
export const ROADMAP_CHART: any = {
  ...BASE,
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
  xAxis: {
    type: 'value',
    min: 0,
    max: 24,
    axisLabel: {
      color: COLORS.muted,
      fontSize: 10,
      formatter: (v: number) => {
        const months = ['10/25', '', '12/25', '', '02/26', '', '04/26', '', '06/26', '', '08/26', '', '10/26', '', '12/26', '', '02/27', '', '04/27', '', '06/27', '', '08/27', '', '10/27'];
        return months[v] || '';
      },
    },
    splitLine: { lineStyle: { color: '#e0e0e0', type: 'dashed' } },
  },
  yAxis: {
    type: 'category',
    data: ['Mở rộng', 'Đánh giá', 'Pilot ĐHKHTN', 'MVP'],
    axisLabel: { color: COLORS.fg, fontSize: 11, fontWeight: 'bold' },
    axisLine: { show: false },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'bar',
      stack: 'timeline',
      silent: true,
      data: [14, 9, 5, 0],
      itemStyle: { color: 'transparent' },
      barWidth: '50%',
    },
    {
      type: 'bar',
      stack: 'timeline',
      data: [
        { value: 4, itemStyle: { color: COLORS.muted, opacity: 0.4 } },
        { value: 2, itemStyle: { color: COLORS.muted, opacity: 0.4 } },
        { value: 4, itemStyle: { color: COLORS.primary } },
        { value: 5, itemStyle: { color: COLORS.success } },
      ],
      barWidth: '50%',
      label: {
        show: true,
        position: 'inside',
        fontSize: 10,
        color: '#fff',
        formatter: (p: { dataIndex: number }) => ['Kế hoạch', 'Kế hoạch', 'Đang chuẩn bị', 'Hoàn thành'][p.dataIndex],
      },
    },
  ],
};

/** Section 7 — KPI targets horizontal bar chart */
export const KPI_TARGETS_CHART: any = {
  ...BASE,
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '10%', bottom: '3%', top: '3%', containLabel: true },
  xAxis: {
    type: 'value',
    max: 500,
    axisLabel: { color: COLORS.muted, fontSize: 10 },
    splitLine: { lineStyle: { color: '#e0e0e0', type: 'dashed' } },
  },
  yAxis: {
    type: 'category',
    data: ['Retention (%)', 'Đánh giá TB (x100)', 'Completion (%)', 'Giao dịch', 'Người dùng'],
    axisLabel: { color: COLORS.fg, fontSize: 11 },
    axisLine: { show: false },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'bar',
      data: [
        { value: 30, itemStyle: { color: COLORS.primary } },
        { value: 400, itemStyle: { color: COLORS.secondary } },
        { value: 80, itemStyle: { color: COLORS.primary } },
        { value: 50, itemStyle: { color: COLORS.secondary } },
        { value: 500, itemStyle: { color: COLORS.primary } },
      ],
      barWidth: '50%',
      label: {
        show: true,
        position: 'right',
        fontSize: 11,
        color: COLORS.fg,
        formatter: (p: { dataIndex: number }) => ['≥30%', '≥4.0/5.0', '≥80%', '≥50', '200–500'][p.dataIndex],
      },
    },
  ],
};

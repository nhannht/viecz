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

/** Section 6 — Operating cost donut chart (enhanced with center label + free services) */
export const COST_BREAKDOWN_CHART: any = {
  ...BASE,
  tooltip: { trigger: 'item', formatter: '{b}: {c} VND/tháng' },
  graphic: [
    {
      type: 'text',
      left: 'center',
      top: 'center',
      style: {
        text: '~200.000\nVND/tháng',
        textAlign: 'center',
        fill: COLORS.fg,
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Inter, sans-serif',
      },
    },
  ],
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      label: {
        show: true, fontSize: 11, color: COLORS.fg,
        formatter: (p: { name: string; value: number }) => {
          if (p.value === 0) return `{muted|${p.name}}\n{sub|Miễn phí}`;
          return `${p.name}\n${p.value.toLocaleString('vi-VN')} VND`;
        },
        rich: {
          muted: { color: COLORS.muted, fontSize: 10 },
          sub: { color: COLORS.success, fontSize: 9, fontStyle: 'italic' },
        },
      },
      labelLine: { lineStyle: { color: COLORS.muted } },
      data: [
        { value: 150000, name: 'VPS', itemStyle: { color: COLORS.secondary } },
        { value: 15000, name: 'Domain + DNS', itemStyle: { color: COLORS.primary } },
        { value: 35000, name: 'Khác (dự phòng)', itemStyle: { color: COLORS.muted } },
        { value: 0, name: 'Cloudflare CDN', itemStyle: { color: '#B2EBF2', opacity: 0.5 } },
        { value: 0, name: 'PayOS', itemStyle: { color: '#B2EBF2', opacity: 0.5 } },
        { value: 0, name: 'MapTiler', itemStyle: { color: '#B2EBF2', opacity: 0.5 } },
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

/** Section 4.3 — Service price range chart (replaces table) */
export const SERVICE_PRICE_RANGE_CHART: any = {
  ...BASE,
  tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}: ${p[0].data[1].toLocaleString('vi-VN')}–${p[0].data[2].toLocaleString('vi-VN')} VND` },
  grid: { left: '3%', right: '8%', bottom: '8%', top: '5%', containLabel: true },
  xAxis: {
    type: 'log',
    min: 3000,
    max: 600000,
    axisLabel: {
      color: COLORS.muted, fontSize: 10,
      formatter: (v: number) => v >= 1000 ? (v / 1000) + 'k' : v + '',
    },
    splitLine: { lineStyle: { color: '#e0e0e0', type: 'dashed' } },
    name: 'VND',
    nameTextStyle: { color: COLORS.muted, fontSize: 10 },
  },
  yAxis: {
    type: 'category',
    data: ['Doi song', 'Viec vat', 'Hoc thuat', 'Ky nang'],
    axisLabel: {
      color: COLORS.fg, fontSize: 12, fontWeight: 'bold',
      formatter: (v: string) => ({ 'Doi song': 'Doi song\n(KTX, an dem, sua xe)', 'Viec vat': 'Viec vat\n(in an, giao do, mua ho)', 'Hoc thuat': 'Hoc thuat\n(slide, CV, speaking)', 'Ky nang': 'Ky nang\n(photo, video, IT)' } as any)[v] || v,
    },
    axisLine: { show: false },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'custom',
      renderItem: (params: any, api: any) => {
        const yIndex = api.value(0);
        const low = api.coord([api.value(1), yIndex]);
        const high = api.coord([api.value(2), yIndex]);
        const height = api.size([0, 1])[1] * 0.5;
        const colors = [COLORS.muted, COLORS.primary, COLORS.secondary, '#21808D'];
        return {
          type: 'rect',
          shape: { x: low[0], y: low[1] - height / 2, width: high[0] - low[0], height },
          style: { fill: colors[params.dataIndex], opacity: 0.85 },
          textContent: {
            style: { text: api.value(3), fill: '#fff', fontSize: 11, fontWeight: 'bold', fontFamily: 'Inter' },
          },
          textConfig: { position: 'inside' },
        };
      },
      encode: { x: [1, 2], y: 0 },
      data: [
        [0, 20000, 100000, '20k–100k VND'],
        [1, 5000, 30000, '5k–30k VND'],
        [2, 30000, 200000, '30k–200k VND'],
        [3, 50000, 500000, '50k–500k VND'],
      ],
    },
  ],
};

/** Section 5.3 — Competitor heatmap (replaces table) */
export const COMPETITOR_HEATMAP_CHART: any = {
  ...BASE,
  tooltip: { position: 'top' },
  grid: { left: '18%', right: '3%', bottom: '3%', top: '18%', containLabel: false },
  xAxis: {
    type: 'category',
    data: ['Viecz', 'Zalo/FB', 'Grab', 'TaskRabbit', 'GoGetter'],
    position: 'top',
    axisLabel: { color: COLORS.fg, fontSize: 11, fontWeight: 'bold' },
    axisLine: { show: false },
    axisTick: { show: false },
    splitArea: { show: false },
  },
  yAxis: {
    type: 'category',
    data: ['Hoat dong tai VN', 'Phi giao dich', 'Nham sinh vien', 'Micro-task da dang', 'Escrow thanh toan', 'Ket noi vi tri'],
    axisLabel: { color: COLORS.fg, fontSize: 10 },
    axisLine: { show: false },
    axisTick: { show: false },
    splitArea: { show: false },
  },
  visualMap: {
    show: false,
    min: 0,
    max: 2,
    inRange: { color: ['#E8E8E8', '#80DEEA', '#21808D'] },
  },
  series: [{
    type: 'heatmap',
    data: [
      // [x, y, value] — x: competitor index, y: criteria index (bottom-up)
      // Ket noi vi tri (y=5)
      [0, 5, 2], [1, 5, 0], [2, 5, 1], [3, 5, 1], [4, 5, 0],
      // Escrow (y=4)
      [0, 4, 2], [1, 4, 0], [2, 4, 1], [3, 4, 2], [4, 4, 2],
      // Micro-task (y=3)
      [0, 3, 2], [1, 3, 0], [2, 3, 0], [3, 3, 2], [4, 3, 1],
      // Nham sinh vien (y=2)
      [0, 2, 2], [1, 2, 0], [2, 2, 0], [3, 2, 0], [4, 2, 1],
      // Phi giao dich (y=1) — lower is better, Viecz=10-15%, TaskRabbit=22.5%
      [0, 1, 2], [1, 1, 2], [2, 1, 1], [3, 1, 0], [4, 1, 1],
      // Hoat dong tai VN (y=0)
      [0, 0, 2], [1, 0, 2], [2, 0, 2], [3, 0, 0], [4, 0, 0],
    ],
    label: {
      show: true,
      fontSize: 10,
      color: COLORS.fg,
      formatter: (p: any) => {
        const labels: Record<string, string[]> = {
          5: ['Co (TG thuc)', 'Khong', 'Van chuyen', 'Khu vuc', 'Khong'],
          4: ['Co (ngan hang VN)', 'Khong', 'Noi bo', 'Co (the QT)', 'Co'],
          3: ['Co', 'Khong', 'Khong', 'Co', 'Han che'],
          2: ['Co', 'Khong', 'Khong', 'Khong', 'Mot phan'],
          1: ['10–15%', '0%', 'N/A', '22,5%', 'N/A'],
          0: ['Co', 'Co', 'Co', 'Khong', 'Khong'],
        };
        return labels[p.data[1]]?.[p.data[0]] || '';
      },
    },
    itemStyle: {
      borderColor: '#fff',
      borderWidth: 2,
    },
    emphasis: { disabled: true },
  }],
};

/** Section 6.1 — Tech status dashboard (replaces table) */
export const TECH_STATUS_DASHBOARD_CHART: any = {
  ...BASE,
  series: [
    {
      type: 'gauge',
      center: ['30%', '45%'],
      radius: '55%',
      startAngle: 220,
      endAngle: -40,
      min: 0,
      max: 7,
      pointer: { show: false },
      progress: { show: true, width: 20, itemStyle: { color: COLORS.success } },
      axisLine: { lineStyle: { width: 20, color: [[1, '#E0E0E0']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        offsetCenter: [0, '10%'],
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.fg,
        formatter: () => '7/7',
      },
      title: { show: true, offsetCenter: [0, '40%'], fontSize: 12, color: COLORS.muted },
      data: [{ value: 7, name: 'Tinh nang hoan thanh' }],
    },
    {
      type: 'gauge',
      center: ['72%', '45%'],
      radius: '45%',
      startAngle: 220,
      endAngle: -40,
      min: 0,
      max: 100,
      pointer: { show: false },
      progress: { show: true, width: 16, itemStyle: { color: COLORS.primary } },
      axisLine: { lineStyle: { width: 16, color: [[1, '#E0E0E0']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        offsetCenter: [0, '10%'],
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.fg,
        formatter: () => '>70%',
      },
      title: { show: true, offsetCenter: [0, '40%'], fontSize: 11, color: COLORS.muted },
      data: [{ value: 70, name: 'Test coverage' }],
    },
  ],
  graphic: [
    {
      type: 'text',
      left: '8%',
      bottom: '5%',
      style: { text: 'Deployed 24/7', fill: COLORS.success, fontSize: 12, fontWeight: 'bold', fontFamily: 'Inter' },
    },
    {
      type: 'text',
      left: 'center',
      bottom: '5%',
      style: { text: '~5 thang phat trien', fill: COLORS.muted, fontSize: 11, fontFamily: 'Inter' },
    },
    {
      type: 'text',
      right: '8%',
      bottom: '5%',
      style: { text: 'Web + Android', fill: COLORS.secondary, fontSize: 12, fontWeight: 'bold', fontFamily: 'Inter' },
    },
  ],
};

/** Section 6.5 — Risk scatter map (replaces table) */
export const RISK_SCATTER_CHART: any = {
  ...BASE,
  grid: { left: '12%', right: '5%', bottom: '12%', top: '5%', containLabel: false },
  xAxis: {
    type: 'value',
    min: 0,
    max: 4,
    name: 'Kha nang xay ra',
    nameLocation: 'center',
    nameGap: 30,
    nameTextStyle: { color: COLORS.muted, fontSize: 11, fontStyle: 'italic' },
    axisLabel: {
      color: COLORS.muted, fontSize: 10,
      formatter: (v: number) => ['', 'Thap', 'TB', 'Cao', ''][v] || '',
    },
    splitLine: { lineStyle: { color: '#e0e0e0', type: 'dashed' } },
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 4,
    name: 'Muc do anh huong',
    nameLocation: 'center',
    nameGap: 40,
    nameTextStyle: { color: COLORS.muted, fontSize: 11, fontStyle: 'italic' },
    axisLabel: {
      color: COLORS.muted, fontSize: 10,
      formatter: (v: number) => ['', 'Thap', 'TB', 'Cao', ''][v] || '',
    },
    splitLine: { lineStyle: { color: '#e0e0e0', type: 'dashed' } },
  },
  series: [{
    type: 'scatter',
    symbolSize: (data: number[]) => data[2] * 14,
    data: [
      { value: [3, 3, 4], name: 'Cold start', itemStyle: { color: COLORS.danger } },
      { value: [2, 2.2, 3], name: 'Phan loai lao dong', itemStyle: { color: COLORS.warning } },
      { value: [2, 2.7, 3], name: 'Giay phep thanh toan', itemStyle: { color: COLORS.warning } },
      { value: [2, 1.5, 2.5], name: 'Bao ve du lieu', itemStyle: { color: COLORS.warning } },
      { value: [1, 1.2, 2], name: 'Nghia vu thue', itemStyle: { color: COLORS.success } },
      { value: [1, 1.8, 2], name: 'Canh tranh', itemStyle: { color: COLORS.success } },
    ],
    label: {
      show: true,
      position: 'right',
      fontSize: 10,
      color: COLORS.fg,
      formatter: '{b}',
    },
    emphasis: { disabled: true },
  }],
  markArea: {
    silent: true,
    data: [
      [{ coord: [0, 0], itemStyle: { color: 'rgba(102,187,106,0.06)' } }, { coord: [2, 2] }],
      [{ coord: [2, 2], itemStyle: { color: 'rgba(229,115,115,0.06)' } }, { coord: [4, 4] }],
    ],
  },
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

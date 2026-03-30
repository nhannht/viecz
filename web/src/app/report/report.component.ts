import { Component, AfterViewInit, HostListener, inject, OnDestroy, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { VieczCardComponent } from '../shared/components/viecz-card.component';
import { VieczStepComponent } from '../shared/components/viecz-step.component';
import { VieczDividerComponent } from '../shared/components/viecz-divider.component';
import { VieczTableComponent } from '../shared/components/viecz-table.component';
import { ThemeService } from '../core/theme.service';
import {
  MARKET_GAP_COLUMNS, MARKET_GAP_ROWS,
  TECH_COLUMNS, TECH_ROWS,
  CUSTOMER_SEGMENT_COLUMNS, CUSTOMER_SEGMENT_ROWS,
  TEAM_COLUMNS, TEAM_ROWS,
} from './report.data';
import { REF_URLS } from './report.refs';
import {
  INCOME_VS_COST_CHART,
  TAM_SAM_SOM_CHART,
  COMPETITOR_RADAR_CHART,
  COST_BREAKDOWN_CHART,
  ROADMAP_CHART,
  KPI_TARGETS_CHART,
  SERVICE_PRICE_RANGE_CHART,
  COMPETITOR_HEATMAP_CHART,
  TECH_STATUS_DASHBOARD_CHART,
  RISK_SCATTER_CHART,
} from './report.charts';

/**
 * Standalone report page rendering the HCMUS I&E 2025 competition report.
 * Accessible at /report (no auth required).
 * Uses sang-frostglass design system + ECharts (SVG) for data visualization.
 */
@Component({
  selector: 'app-report',
  standalone: true,
  imports: [
    VieczCardComponent,
    VieczStepComponent,
    VieczDividerComponent,
    VieczTableComponent,
    NgxEchartsDirective,
  ],
  providers: [provideEchartsCore({ echarts: () => import('echarts') })],
  encapsulation: ViewEncapsulation.None,
  styleUrl: './report.component.css',
  templateUrl: './report.component.html',
})
export class ReportComponent implements OnDestroy, AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private themeService = inject(ThemeService);
  private previousTheme = this.themeService.theme();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.themeService.setTheme('sang-frostglass');
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { default: mermaid } = await import(/* webpackIgnore: true */ 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs' as string & { __brand: 'cdn' }) as any;
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', fontFamily: 'Inter, sans-serif' });
      await mermaid.run({ querySelector: '.mermaid' });
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.themeService.setTheme(this.previousTheme);
    }
  }

  @HostListener('click', ['$event'])
  onAnchorClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.getAttribute('href') || '';

    // Citation links → open source URL
    if (anchor.classList.contains('cite') && href.startsWith('#ref-')) {
      event.preventDefault();
      const refNum = parseInt(href.replace('#ref-', ''), 10);
      const url = REF_URLS[refNum];
      if (url) window.open(url, '_blank', 'noopener');
      return;
    }

    // TOC links → scroll to section
    if (href.startsWith('#sec-')) {
      event.preventDefault();
      document.getElementById(href.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  }

  async printReport(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Scroll through entire page to trigger all @defer (on viewport) blocks
    const scrollStep = window.innerHeight;
    const maxScroll = document.body.scrollHeight;
    for (let y = 0; y < maxScroll; y += scrollStep) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 100));
    }
    // Wait for deferred charts to render
    await new Promise(r => setTimeout(r, 2000));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 200));
    window.print();
  }

  // ── ECharts config ──
  readonly chartInitOpts = { renderer: 'svg' as const, width: 'auto' as const, height: 300 };
  readonly incomeVsCostChart = INCOME_VS_COST_CHART;
  readonly tamSamSomChart = TAM_SAM_SOM_CHART;
  readonly competitorRadarChart = COMPETITOR_RADAR_CHART;
  readonly costBreakdownChart = COST_BREAKDOWN_CHART;
  readonly roadmapChart = ROADMAP_CHART;
  readonly kpiTargetsChart = KPI_TARGETS_CHART;
  readonly servicePriceRangeChart = SERVICE_PRICE_RANGE_CHART;
  readonly competitorHeatmapChart = COMPETITOR_HEATMAP_CHART;
  readonly techStatusDashboardChart = TECH_STATUS_DASHBOARD_CHART;
  readonly riskScatterChart = RISK_SCATTER_CHART;

  // ── Table data ──
  readonly marketGapColumns = MARKET_GAP_COLUMNS;
  readonly marketGapRows = MARKET_GAP_ROWS;
  readonly techColumns = TECH_COLUMNS;
  readonly techRows = TECH_ROWS;
  readonly customerSegmentColumns = CUSTOMER_SEGMENT_COLUMNS;
  readonly customerSegmentRows = CUSTOMER_SEGMENT_ROWS;
  readonly teamColumns = TEAM_COLUMNS;
  readonly teamRows = TEAM_ROWS;
}

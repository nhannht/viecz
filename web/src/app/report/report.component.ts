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
  SERVICE_COLUMNS, SERVICE_ROWS,
  TECH_COLUMNS, TECH_ROWS,
  CUSTOMER_SEGMENT_COLUMNS, CUSTOMER_SEGMENT_ROWS,
  COMPETITOR_COLUMNS, COMPETITOR_ROWS,
  TECH_STATUS_COLUMNS, TECH_STATUS_ROWS,
  COST_COLUMNS, COST_ROWS,
  TEAM_COLUMNS, TEAM_ROWS,
  ROADMAP_COLUMNS, ROADMAP_ROWS,
  RISK_COLUMNS, RISK_ROWS,
  KPI_COLUMNS, KPI_ROWS,
} from './report.data';
import { REF_URLS } from './report.refs';
import {
  INCOME_VS_COST_CHART,
  TAM_SAM_SOM_CHART,
  COMPETITOR_RADAR_CHART,
  COST_BREAKDOWN_CHART,
  ROADMAP_CHART,
  KPI_TARGETS_CHART,
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
      const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs' as any);
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

  printReport(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }

  // ── ECharts config ──
  readonly chartInitOpts = { renderer: 'svg' as const, width: 'auto' as const, height: 300 };
  readonly incomeVsCostChart = INCOME_VS_COST_CHART;
  readonly tamSamSomChart = TAM_SAM_SOM_CHART;
  readonly competitorRadarChart = COMPETITOR_RADAR_CHART;
  readonly costBreakdownChart = COST_BREAKDOWN_CHART;
  readonly roadmapChart = ROADMAP_CHART;
  readonly kpiTargetsChart = KPI_TARGETS_CHART;

  // ── Table data ──
  readonly marketGapColumns = MARKET_GAP_COLUMNS;
  readonly marketGapRows = MARKET_GAP_ROWS;
  readonly serviceColumns = SERVICE_COLUMNS;
  readonly serviceRows = SERVICE_ROWS;
  readonly techColumns = TECH_COLUMNS;
  readonly techRows = TECH_ROWS;
  readonly customerSegmentColumns = CUSTOMER_SEGMENT_COLUMNS;
  readonly customerSegmentRows = CUSTOMER_SEGMENT_ROWS;
  readonly competitorColumns = COMPETITOR_COLUMNS;
  readonly competitorRows = COMPETITOR_ROWS;
  readonly techStatusColumns = TECH_STATUS_COLUMNS;
  readonly techStatusRows = TECH_STATUS_ROWS;
  readonly costColumns = COST_COLUMNS;
  readonly costRows = COST_ROWS;
  readonly teamColumns = TEAM_COLUMNS;
  readonly teamRows = TEAM_ROWS;
  readonly roadmapColumns = ROADMAP_COLUMNS;
  readonly roadmapRows = ROADMAP_ROWS;
  readonly riskColumns = RISK_COLUMNS;
  readonly riskRows = RISK_ROWS;
  readonly kpiColumns = KPI_COLUMNS;
  readonly kpiRows = KPI_ROWS;
}

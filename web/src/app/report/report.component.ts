import { Component, inject, OnDestroy, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { VieczCardComponent } from '../shared/components/viecz-card.component';
import { VieczStepComponent } from '../shared/components/viecz-step.component';
import { VieczDividerComponent } from '../shared/components/viecz-divider.component';
import { VieczTableComponent } from '../shared/components/viecz-table.component';
import { ThemeService } from '../core/theme.service';
import {
  TECH_COLUMNS, TECH_ROWS,
  SERVICE_COLUMNS, SERVICE_ROWS,
  COMPETITOR_COLUMNS, COMPETITOR_ROWS,
  TEAM_COLUMNS, TEAM_ROWS,
} from './report.data';

/**
 * Standalone report page rendering the HCMUS I&E 2025 competition report
 * as a styled A4 web page. Accessible at /report (no auth required).
 * Uses the sang-frostglass design system with Storybook components.
 */
@Component({
  selector: 'app-report',
  standalone: true,
  imports: [
    VieczCardComponent,
    VieczStepComponent,
    VieczDividerComponent,
    VieczTableComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  styleUrl: './report.component.css',
  templateUrl: './report.component.html',
})
export class ReportComponent implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private themeService = inject(ThemeService);
  private previousTheme = this.themeService.theme();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.themeService.setTheme('sang-frostglass');
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.themeService.setTheme(this.previousTheme);
    }
  }

  printReport(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }

  // ── Table data (from report.data.ts) ──
  readonly techColumns = TECH_COLUMNS;
  readonly techRows = TECH_ROWS;
  readonly serviceColumns = SERVICE_COLUMNS;
  readonly serviceRows = SERVICE_ROWS;
  readonly competitorColumns = COMPETITOR_COLUMNS;
  readonly competitorRows = COMPETITOR_ROWS;
  readonly teamColumns = TEAM_COLUMNS;
  readonly teamRows = TEAM_ROWS;
}

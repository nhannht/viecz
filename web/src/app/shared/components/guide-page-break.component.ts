import { Component } from '@angular/core';

/**
 * Invisible page break marker for print/PDF export.
 * Hidden on screen, inserts a page break when printed.
 */
@Component({
  selector: 'viecz-guide-page-break',
  standalone: true,
  template: `<div class="hidden print:block" style="break-before: page; height: 0"></div>`,
})
export class GuidePageBreakComponent {}

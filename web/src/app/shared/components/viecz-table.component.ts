import { Component, input } from '@angular/core';
import { GlassSpecularDirective } from '../directives/glass-specular.directive';

export interface TableColumn {
  key: string;
  label: string;
}

/**
 * Frost-glass data table component.
 *
 * Renders a responsive table that uses the app's theme tokens.
 * On mobile (<=768px), rows stack into labeled cards.
 * Print-safe: degrades to solid backgrounds with no blur.
 *
 * @example
 * ```html
 * <viecz-table
 *   [columns]="[{key: 'name', label: 'Name'}, {key: 'role', label: 'Role'}]"
 *   [rows]="[{name: 'Alice', role: 'Engineer'}, {name: 'Bob', role: 'Designer'}]"
 * />
 * ```
 */
@Component({
  selector: 'viecz-table',
  standalone: true,
  imports: [GlassSpecularDirective],
  styles: [`
    /* ── Desktop table ── */
    .viecz-table-wrap {
      width: 100%;
      margin: 1.5rem 0;
      overflow-x: auto;
      position: relative;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-body);
      font-size: 0.875rem;
      border: 1px solid var(--color-border);
    }

    th {
      font-family: var(--font-display);
      font-size: 0.5625rem;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      background: var(--color-fg);
      color: var(--color-bg);
      padding: 0.75rem 1rem;
      text-align: left;
    }

    td {
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-border);
      vertical-align: top;
      background: var(--color-card);
      backdrop-filter: blur(8px);
    }

    tr:nth-child(even) td {
      background: var(--color-bg);
    }

    td:first-child {
      border-left: 3px solid var(--color-fg);
    }

    /* ── Mobile: stacked cards ── */
    @media screen and (max-width: 768px) {
      table, thead, tbody, th, td, tr {
        display: block;
      }

      thead {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
      }

      table {
        border: none;
      }

      tr {
        margin-bottom: 0.75rem;
        background: var(--color-card);
        backdrop-filter: blur(8px);
        border: 1px solid var(--color-border);
        border-left: 3px solid var(--color-fg);
        padding: 1rem;
      }

      td {
        border: none;
        border-left: none;
        padding: 0.25rem 0;
        font-size: 0.875rem;
        line-height: 1.7;
        background: transparent;
        backdrop-filter: none;
      }

      td:first-child {
        border-left: none;
        font-weight: 700;
        font-size: 0.9375rem;
        padding-bottom: 0.625rem;
        border-bottom: 1px solid var(--color-border);
        margin-bottom: 0.25rem;
      }

      td::before {
        content: attr(data-label);
        display: block;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--color-muted);
        margin-bottom: 0.125rem;
        margin-top: 0.625rem;
      }

      td:first-child::before {
        margin-top: 0;
        color: var(--color-fg);
      }
    }

    /* ── Print ── */
    @media print {
      td {
        backdrop-filter: none;
        background: #ffffff;
      }

      tr:nth-child(even) td {
        background: #f5f5f5;
      }

      td:first-child {
        border-left-color: #191C1D;
      }

      table {
        break-inside: avoid;
      }
    }
  `],
  template: `
    <div class="viecz-table-wrap" appGlassSpecular>
      <table>
        <thead>
          <tr>
            @for (col of columns(); track col.key) {
              <th>{{ col.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track $index) {
            <tr>
              @for (col of columns(); track col.key) {
                <td [attr.data-label]="col.label" [innerHTML]="row[col.key]"></td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class VieczTableComponent {
  /** Column definitions with key (maps to row data) and display label. */
  columns = input.required<TableColumn[]>();

  /** Row data as array of key-value records. Values may contain HTML. */
  rows = input.required<Record<string, string>[]>();
}

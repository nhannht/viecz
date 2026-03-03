import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'report', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];

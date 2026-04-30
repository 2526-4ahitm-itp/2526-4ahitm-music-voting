import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'join/:pin',    renderMode: RenderMode.Client },
  { path: 'create-party', renderMode: RenderMode.Client },
  { path: 'dashboard',    renderMode: RenderMode.Client },
  { path: 'startpage',    renderMode: RenderMode.Client },
  { path: 'host-options', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];

// src/main.ts
import 'zone.js'; // unbedingt zuerst
import {provideZoneChangeDetection} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {App} from './app/app';
import {provideRouter} from '@angular/router';
import {routes} from './app/app.routes';
import {provideHttpClient, withInterceptors, withXhr} from '@angular/common/http';
import {hostAuthInterceptor} from './app/host-auth.interceptor';

bootstrapApplication(App, {
  providers: [
    // Angular 21 defaults to zoneless; the browser app still runs on zone.js, so keep
    // zone-based change detection explicitly (added by the v21 ng update migration).
    provideZoneChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withXhr(), withInterceptors([hostAuthInterceptor]))
  ]
});

import { Routes } from '@angular/router';
import { Host } from './pages/host/host';
import {Home} from './pages/home/home';
import {Guest} from './pages/guest/guest';

export const routes: Routes = [
  { path: 'host', component: Host },
  {path: 'guest', component: Guest},
  {path: '', component: Home}

];

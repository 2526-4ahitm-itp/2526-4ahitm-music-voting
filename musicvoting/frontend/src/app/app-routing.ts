import { Routes } from '@angular/router';
import { Host } from './pages/host/host';
import {Home} from './pages/home/home';
import {Guest} from './pages/guest/guest';
import {Startpage} from './pages/startpage/startpage';
import {Control} from './pages/control/control';
import {HostDashboard} from './pages/host-dashboard/host-dashboard';

export const routes: Routes = [
  {path: 'startpage', component: Startpage},
  {path: 'control', component: Control},
  { path: 'host', component: Host },
  {path: 'guest', component: Guest},
  {path: 'dashboard-host', component: HostDashboard},
  {path: '', component: Home}

];

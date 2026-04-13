import { Routes } from '@angular/router';
import { Control } from './pages/control/control';
import { Guest } from './pages/guest/guest';
import { Home } from './pages/home/home';
import { HostDashboard } from './pages/host-dashboard/host-dashboard';
import { Startpage } from './pages/startpage/startpage';
import { VotingComp } from './pages/voting-comp/voting-comp';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'guest', component: Guest },
  { path: 'startpage', component: Startpage },
  { path: 'control', component: Control },
  { path: 'dashboard-host', component: HostDashboard },
  { path: 'dashboard', component: HostDashboard },
  { path: 'voting', component: VotingComp },
  { path: 'vote', component: VotingComp },
  { path: '**', redirectTo: '' }
];

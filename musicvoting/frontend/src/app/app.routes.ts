import { Routes } from '@angular/router';
import { Control } from './pages/control/control';
import { Guest } from './pages/guest/guest';
import { Home } from './pages/home/home';
import { HostDashboard } from './pages/host-dashboard/host-dashboard';
import { Startpage } from './pages/startpage/startpage';
import { VotingComp } from './pages/voting-comp/voting-comp';

export const routes: Routes = [
  { 
    path: '', 
    component: Home,
    title: 'MusicVoting'
  },

  { 
    path: 'guest', 
    component: Guest,
    title: 'Partygast - MusicVoting'
  },

  { 
    path: 'startpage', 
    component: Startpage ,
    title: 'Player - MusicVoting'
  },

  { 
    path: 'dashboard', 
    component: HostDashboard ,
    title: 'Übersicht - MusicVoting'
  },

  { 
    path: 'voting', 
    component: VotingComp,
    title: 'Partygast - MusicVoting'
  },

  { path: '**', redirectTo: '' }
];

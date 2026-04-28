import { Routes } from '@angular/router';
import { Control } from './pages/control/control';
import { Guest } from './pages/guest/guest';
import { Home } from './pages/home/home';
import { HostDashboard } from './pages/host-dashboard/host-dashboard';
import { Startpage } from './pages/startpage/startpage';
import { VotingComp } from './pages/voting-comp/voting-comp';
import {VotingHost} from './pages/voting-host/voting-host';
import { SearchHost } from './pages/search-host/search-host';
import { CodeInput } from './pages/code-input/code-input';
import { CreateParty } from './pages/create-party/create-party';

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
    path: 'code',
    component: CodeInput,
    title: 'Login - MusicVoting'
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
    path: 'voting-host',
    component: VotingHost ,
    title: 'Voten - MusicVoting'
  },

  {
    path: 'search-host',
    component: SearchHost ,
    title: 'Suchen - MusicVoting'
  },

  {
    path: 'voting',
    component: VotingComp,
    title: 'Partygast - MusicVoting'
  },

  { path: '**', redirectTo: '' }
];

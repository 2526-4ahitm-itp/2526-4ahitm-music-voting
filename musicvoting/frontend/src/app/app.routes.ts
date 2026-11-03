import { Routes } from '@angular/router';
import { Guest } from './pages/guest/guest';
import { Home } from './pages/home/home';
import { HostDashboard } from './pages/host-dashboard/host-dashboard';
import { HostOptions } from './pages/host-options/host-options';
import { Startpage } from './pages/startpage/startpage';
import { VotingComp } from './pages/voting-comp/voting-comp';
import {VotingHost} from './pages/voting-host/voting-host';
import { SearchHost } from './pages/search-host/search-host';
import { CodeInput } from './pages/code-input/code-input';
import { CreateParty } from './pages/create-party/create-party';
import { SelectPlaylist } from './pages/select-playlist/select-playlist';
import { SelectBlacklist } from './pages/select-blacklist/select-blacklist';
import { PartyReady } from './pages/party-ready/party-ready';
import { hostGuard } from './host.guard';

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
    path: 'host-options',
    component: HostOptions,
    title: 'Gastgeber - MusicVoting'
  },

  {
    path: 'create-party',
    component: CreateParty,
    title: 'Party erstellen - MusicVoting'
  },

  {
    path: 'select-playlist',
    component: SelectPlaylist,
    canActivate: [hostGuard],
    title: 'Standard-Playlist - MusicVoting'
  },

  {
    // Host setup step right after the default-playlist picker.
    path: 'select-blacklist',
    component: SelectBlacklist,
    canActivate: [hostGuard],
    title: 'Blacklist - MusicVoting'
  },

  {
    // Last setup step: explains the player and goes live (design D8).
    path: 'party-ready',
    component: PartyReady,
    canActivate: [hostGuard],
    title: 'Party bereit - MusicVoting'
  },

  {
    path: 'startpage',
    component: Startpage,
    canActivate: [hostGuard],
    title: 'Player - MusicVoting'
  },

  {
    path: 'dashboard',
    component: HostDashboard,
    canActivate: [hostGuard],
    title: 'Übersicht - MusicVoting'
  },

  {
    path: 'voting-host',
    component: VotingHost,
    canActivate: [hostGuard],
    title: 'Voten - MusicVoting'
  },

  {
    path: 'search-host',
    component: SearchHost,
    canActivate: [hostGuard],
    title: 'Suchen - MusicVoting'
  },

  {
    path: 'voting',
    component: VotingComp,
    title: 'Partygast - MusicVoting'
  },

  {
    path: 'join/:pin',
    component: CodeInput,
    title: 'Party beitreten - MusicVoting'
  },

  { path: '**', redirectTo: '' }
];

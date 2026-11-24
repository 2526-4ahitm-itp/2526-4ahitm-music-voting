import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { HostDashboard } from './pages/host-dashboard/host-dashboard';
import { HostOptions } from './pages/host-options/host-options';
import { Startpage } from './pages/startpage/startpage';
import { VotingComp } from './pages/voting-comp/voting-comp';
import { CodeInput } from './pages/code-input/code-input';
import { CreateParty } from './pages/create-party/create-party';
import { SelectPlaylist } from './pages/select-playlist/select-playlist';
import { SelectBlocklist } from './pages/select-blocklist/select-blocklist';
import { PartyReady } from './pages/party-ready/party-ready';
import { hostGuard } from './host.guard';
import { guestGuard } from './guest.guard';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'MusicVoting'
  },

  {
    // The add/search view merged into the guest page (guest spec "Guest Uses One
    // Page for Queue and Search"); old links and bookmarks still work.
    path: 'guest',
    redirectTo: 'voting'
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
    path: 'select-blocklist',
    component: SelectBlocklist,
    canActivate: [hostGuard],
    title: 'Blocklist - MusicVoting'
  },

  {
    // Path before the rename to "Blocklist" (host spec "Old Blocklist Setup Link Still
    // Works"): open tabs and bookmarks keep working; the target's hostGuard still applies.
    path: 'select-blacklist',
    redirectTo: 'select-blocklist'
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
    // The host voting and search pages merged into the dashboard (host spec "Host
    // Dashboard Shows the Whole Queue on Every Screen", "Host Adds Songs from the
    // Dashboard"). The dashboard's guard still applies after the redirect.
    path: 'voting-host',
    redirectTo: 'dashboard'
  },

  {
    path: 'search-host',
    redirectTo: 'dashboard'
  },

  {
    path: 'voting',
    component: VotingComp,
    canActivate: [guestGuard],
    title: 'Partygast - MusicVoting'
  },

  {
    path: 'join/:pin',
    component: CodeInput,
    title: 'Party beitreten - MusicVoting'
  },

  { path: '**', redirectTo: '' }
];

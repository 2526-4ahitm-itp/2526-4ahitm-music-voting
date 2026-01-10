import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Host } from './pages/host/host';
import {Home} from './pages/home/home';
import {Guest} from './pages/guest/guest';


const routes: Routes = [
  { path: 'host', component: Host },
  {path: 'guest', component: Guest},
  {path: '', component: Home}
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}

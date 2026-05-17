import {Routes} from '@angular/router';
import {Gallery} from './gallery';
import {AlbumView} from './album-view';
import {Dashboard} from './dashboard';

export const routes: Routes = [
  { path: '', component: Gallery },
  { path: 'album/:id', component: AlbumView },
  { path: 'admin', component: Dashboard },
  { path: '**', redirectTo: '' }
];

import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { HostPlaylist, PartyService } from '../../services/party.service';

@Component({
  selector: 'app-select-playlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-playlist.html',
  styleUrl: './select-playlist.css',
})
export class SelectPlaylist implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private partyService = inject(PartyService);
  private cd = inject(ChangeDetectorRef);

  partyId: string | null = null;
  playlists: HostPlaylist[] = [];
  isLoading = true;
  isSaving = false;
  error: string | null = null;

  async ngOnInit() {
    const partyIdFromUrl = this.route.snapshot.queryParamMap.get('partyId');
    if (partyIdFromUrl) {
      this.partyService.setCurrentPartyId(partyIdFromUrl);
    }
    this.partyId = this.partyService.currentPartyId;

    if (!this.partyId) {
      this.router.navigate(['/']);
      return;
    }

    try {
      this.playlists = await lastValueFrom(this.partyService.getPlaylists(this.partyId));
    } catch {
      this.error = 'Playlists konnten nicht geladen werden.';
    } finally {
      this.isLoading = false;
      this.cd.detectChanges();
    }
  }

  async choose(playlist: HostPlaylist) {
    if (!this.partyId || this.isSaving) return;
    this.isSaving = true;
    this.error = null;
    this.cd.detectChanges();
    try {
      await lastValueFrom(this.partyService.setDefaultPlaylist(this.partyId, playlist.id));
      this.goToDashboard();
    } catch {
      this.error = 'Playlist konnte nicht gespeichert werden. Bitte versuche es erneut.';
      this.isSaving = false;
      this.cd.detectChanges();
    }
  }

  skip() {
    this.goToDashboard();
  }

  private goToDashboard() {
    this.router.navigate(['/dashboard'], { queryParams: { partyId: this.partyId } });
  }
}

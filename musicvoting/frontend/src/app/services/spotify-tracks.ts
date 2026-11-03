import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { PartyService } from './party.service';

@Injectable({ providedIn: 'root' })
export class TrackService {

  constructor(private http: HttpClient, private partyService: PartyService) {}

  private get partyId(): string | null {
    return this.partyService.currentPartyId;
  }

  /**
   * Searches the party's provider. `guest: true` asks for the guest view: the backend then
   * drops songs by banned artists and adds `hiddenHint` ('ARTIST' | 'SOME' | null). The host
   * search leaves it off so the host still sees every blocked song greyed out.
   */
  searchTracks(query: string, options?: { guest?: boolean }): Observable<any> {
    if (!this.partyId) { console.warn('searchTracks: keine aktive Party'); return EMPTY; }
    const audience = options?.guest ? '&audience=guest' : '';
    return this.http.get<any>(`/api/party/${this.partyId}/track/search?q=${encodeURIComponent(query)}${audience}`);
  }

  startParty(): Observable<any> {
    if (!this.partyId) { console.warn('startParty: keine aktive Party'); return EMPTY; }
    return this.http.post(`/api/party/${this.partyId}/track/next`, {});
  }

}

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

  searchTracks(query: string): Observable<any> {
    if (!this.partyId) { console.warn('searchTracks: keine aktive Party'); return EMPTY; }
    return this.http.get<any>(`/api/party/${this.partyId}/track/search?q=${encodeURIComponent(query)}`);
  }

  startParty(): Observable<any> {
    if (!this.partyId) { console.warn('startParty: keine aktive Party'); return EMPTY; }
    return this.http.post(`/api/party/${this.partyId}/track/next`, {});
  }

}

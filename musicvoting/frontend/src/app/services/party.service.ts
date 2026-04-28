import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface CreatePartyResponse {
  id: string;
  pin: string;
  joinUrl: string;
}

export interface PartyDetailsResponse {
  id: string;
  pin: string;
}

@Injectable({ providedIn: 'root' })
export class PartyService {
  private readonly ID_KEY = 'mv_party_id';
  private readonly PIN_KEY = 'mv_party_pin';

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  readonly partyId$ = new BehaviorSubject<string | null>(this.readStorage(this.ID_KEY));
  readonly pin$     = new BehaviorSubject<string | null>(this.readStorage(this.PIN_KEY));

  get currentPartyId(): string | null { return this.partyId$.getValue(); }
  get currentPin(): string | null     { return this.pin$.getValue(); }

  setCurrentPartyId(id: string): void {
    this.partyId$.next(id);
    this.writeStorage(this.ID_KEY, id);
  }

  createParty(provider: string): Observable<CreatePartyResponse> {
    return this.http.post<CreatePartyResponse>('/api/party', { provider }).pipe(
      tap(res => {
        this.partyId$.next(res.id);
        this.pin$.next(res.pin);
        this.writeStorage(this.ID_KEY, res.id);
        this.writeStorage(this.PIN_KEY, res.pin);
      })
    );
  }

  resolvePin(pin: string): Observable<{ id: string }> {
    return this.http.get<{ id: string }>(`/api/party/join/${pin}`).pipe(
      tap(res => {
        this.partyId$.next(res.id);
        this.pin$.next(pin);
        this.writeStorage(this.ID_KEY, res.id);
        this.writeStorage(this.PIN_KEY, pin);
      })
    );
  }

  getParty(id: string): Observable<PartyDetailsResponse> {
    return this.http.get<PartyDetailsResponse>(`/api/party/${id}`).pipe(
      tap(res => {
        this.pin$.next(res.pin);
        this.writeStorage(this.PIN_KEY, res.pin);
      })
    );
  }

  endParty(id: string): Observable<void> {
    return this.http.delete<void>(`/api/party/${id}`).pipe(
      tap(() => this.clearParty())
    );
  }

  clearParty(): void {
    this.partyId$.next(null);
    this.pin$.next(null);
    this.removeStorage(this.ID_KEY);
    this.removeStorage(this.PIN_KEY);
  }

  private readStorage(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private writeStorage(key: string, value: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  }

  private removeStorage(key: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
}

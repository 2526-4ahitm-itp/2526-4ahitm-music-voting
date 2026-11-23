# MusicVoting — Project Overview

> Short product overview for people. The OpenSpec CLI does **not** read this file —
> the context and rules given to AI agents live in [`config.yaml`](config.yaml).
> Binding team rules: [`ai/ARBEITSREGELN.md`](../ai/ARBEITSREGELN.md).

MusicVoting lets party guests choose the music together. Guests join from their phone (no account, no name) by scanning a QR code or typing the 5-digit PIN. They add songs through search and like songs to push them up the queue. The host runs one party at a time with one music provider (Spotify or YouTube), and the music plays in the browser on a shared monitor or TV.

## Product shape

- **Three clients:** the guest page (phone), the host dashboard (phone) and the TV display (monitor). There is also an optional SwiftUI iOS app.
- **One party = one provider:** the host picks Spotify or YouTube when creating the party.
- **Anonymous guests:** each device is recognised by a persistent `deviceId`; there are no accounts.
- **Automatic queue order:** more likes first, FIFO on ties.
- **Host OAuth once per party:** the tokens are dropped when the party ends.

## Spec areas

The current behaviour is in [`specs/`](specs/): `party`, `guest`, `host`, `queue`, `voting`, `playback`, `dashboard`, `search`, `provider`, `web-ui`, `ios-localization`.

## Out of scope

- Multiple providers in one party.
- Named or registered guest accounts.
- Persistent play history or "recently played" lists.
- Guaranteed ad-free playback on YouTube (best effort only).

# Proposal: Lock Play Button Without Active Playback Device

## Intent

Hosts can currently tap Play/Pause/Skip on the web host-dashboard or the iOS admin dashboard even when no playback device has been registered for the party — i.e. the TV/startpage (which hosts the Spotify Web Playback SDK) has never been opened, or its connection was lost. This sends Spotify playback commands with no valid `device_id`, fails silently, and leaves the host confused about why nothing happens.

## Scope

In scope:
- Disable the Play/Pause/Skip controls in the Angular host-dashboard when the party has no active Spotify playback device
- Disable the corresponding controls in the iOS admin dashboard (`CurrentSongPlaying`) under the same condition
- Expose whether a playback device is currently registered to both clients
- Show a short hint (e.g. pointing the host to open the dashboard/startpage) while controls are locked

Out of scope:
- YouTube provider — no provider implementation or device concept exists yet
- Changes to how the Spotify Web Playback SDK registers/re-registers its device ID
- Changes to voting, search, or queue controls

## Approach

The backend already tracks a Spotify `deviceId` per party (`SpotifyCredentials`, registered via `PUT /party/{id}/spotify/deviceId`). `GET /party/{id}/track/current` is extended to include a `deviceActive` boolean derived from whether that `deviceId` is set. Both the Angular host-dashboard and the iOS admin dashboard already poll/refresh this endpoint; they read `deviceActive` and disable Play/Pause/Skip with an explanatory hint when it is `false`, re-enabling automatically once a device registers.

# Tasks

## 1. Backend
- [x] 1.1 Add `getQueueForDevice(Party, String deviceId)` default method to `MusicProvider` interface
- [x] 1.2 Implement `getQueueForDevice` in `SpotifyMusicProvider` with `has_voted` SQL column
- [x] 1.3 Add optional `?deviceId` query param to `GET /party/{id}/track/queue` in `TrackResource`

## 2. Web frontend
- [x] 2.1 Add `deviceId` getter to `PartyService` — generates UUID, persists to localStorage and 1-year cookie
- [x] 2.2 Add `readCookie` / `writeCookie` helpers to `PartyService`
- [x] 2.3 Add `toggleVote(uri, deviceId)` to `SpotifyWebPlayerService`
- [x] 2.4 Update `getQueue(deviceId?)` in `SpotifyWebPlayerService` to forward deviceId
- [x] 2.5 Wire `toggleVote` and `deviceId` in `VotingComp` — optimistic update + SSE reload
- [x] 2.6 Update `voting-comp.html` — heart button, like count display, `.voted` class
- [x] 2.7 Add `.vote-section` and `.like-count` CSS

## 3. iOS app
- [x] 3.1 Extract `deviceId` computed property from `sseEventsURL` in `PartySessionStore`
- [x] 3.2 Implement full `VotingView` and `VotingViewModel` in `VotingView.swift`
- [x] 3.3 `VotingViewModel.loadQueue` passes `?deviceId=` to queue endpoint
- [x] 3.4 `VotingViewModel.toggleVote` — optimistic update, server reconciliation, revert on error
- [x] 3.5 `VotingViewModel.listenForVoteUpdates` — SSE reconnect on `vote-updated` / `queue-updated`

## 4. Tests
- [x] 4.1 Backend: `getQueueForDevice` — `hasVoted=true` for voting device, `false` for other, `false` with no votes
- [x] 4.2 Backend: `GET /queue?deviceId=` routes to `getQueueForDevice` and returns `hasVoted`
- [x] 4.3 Backend: `GET /queue` without deviceId still uses plain `getQueue`
- [x] 4.4 Frontend: `PartyService.deviceId` generates UUID, writes to localStorage and cookie
- [x] 4.5 Frontend: `PartyService.deviceId` recovers from cookie when localStorage is cleared
- [x] 4.6 Frontend: `SpotifyWebPlayerService.getQueue(deviceId)` appends query param
- [x] 4.7 Frontend: `SpotifyWebPlayerService.toggleVote` posts correct body; returns EMPTY without party
- [x] 4.8 Swift: `VotingViewModel.loadQueue` populates entries with `likeCount` and `hasVoted`
- [x] 4.9 Swift: `VotingViewModel.loadQueue` passes `deviceId` in URL
- [x] 4.10 Swift: `VotingViewModel.toggleVote` updates entry from server response
- [x] 4.11 Swift: `VotingViewModel.toggleVote` reverts on server error and network error
- [x] 4.12 Swift: `VotingViewModel.toggleVote` clears `votingIds` after completion

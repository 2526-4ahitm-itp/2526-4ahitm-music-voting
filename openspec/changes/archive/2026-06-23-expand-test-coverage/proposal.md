# Proposal: Expand Automated Test Coverage (Backend + Frontend)

## Intent

Large parts of the Quarkus backend and the Angular frontend had no automated tests, which made it risky to refactor or extend the app — regressions in SSE event handling, Spotify provider logic, host-authentication, or the various page components would only surface manually. This change adds new tests across both stacks to close those gaps, without changing any production behavior.

## Scope

In scope:
- New backend tests for `SpotifyMusicProvider` (queue ordering, voting, playback control), `SpotifyTokenResource`/`SpotifyCallbackResource` (OAuth/device-id/SSE endpoints), `SpotifyApiErrors` (error-message formatting), `PartyRegistry` DB-reconstruction, and `HostAuthFilter` (the `@HostOnly` request filter, all 5 branches incl. the otherwise-unreachable 400 path)
- New frontend tests for previously-untested guards/interceptors/services (`hostGuard`, `hostAuthInterceptor`, `TrackService`, `SpotifyWebPlayerService`, `QueueStateService`, `PartyService`) and page components (`CreateParty`, `CodeInput`, `Home`, `HostOptions`, `VotingHost`, `VotingComp`, `SearchHost`, `Guest`, `Startpage`, `HostDashboard`, `App`, `app.routes`)
- Adding `quarkus-junit5-mockito` as a test-scoped dependency (needed for `HostAuthFilterTest`)

Out of scope:
- Refactoring `SpotifyMusicProvider`'s raw `HttpClient`-based OAuth token exchange to make it independently unit-testable (would require structural changes to production code)
- Any change to application behavior, specs, or APIs
- End-to-end/browser tests beyond Karma/ChromeHeadless unit tests

## Approach

Tests were added incrementally per untested file/class, following existing patterns in the codebase: `@QuarkusTest` + REST-assured + `@TestTransaction`/`QuarkusTransaction.requiringNew()` for backend integration tests, `@InjectMock` for isolating CDI beans, and plain Mockito for `HostAuthFilter`'s `ContainerRequestContext`. On the frontend, simple components/services are constructed directly with stubbed dependencies; components depending on Angular DI features (`inject()`, `toObservable`, guards) use `TestBed.runInInjectionContext`/`TestBed.configureTestingModule` with `provideZonelessChangeDetection()`, `provideHttpClient()` + `provideHttpClientTesting()`.

One known limitation: `window.location.href` cannot be mocked/spied in this Karma + ChromeHeadless setup (the property is non-configurable), so the navigation-triggering branches of `CreateParty.create()` (success path) and `SpotifyWebPlayerService.login()` (active-party path) remain untested at the unit level.

## Result

- Backend: 114/114 tests passing (`./mvnw test`)
- Frontend: 178/178 tests passing (`npx ng test --watch=false --browsers=ChromeHeadless`)

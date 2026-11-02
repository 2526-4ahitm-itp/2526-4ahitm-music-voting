# SpotifyWebPlayer

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.7.

## Development server


To start a local development server, run: (with spotify connection)
   ```bash
   ng serve --host 0.0.0.0 --port 4200
   ```

To start a local development server, run: (without spotify connection)

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Host flow

Creating a party walks the host through these routes (all after `create-party` are guarded by `hostGuard`):

1. `/create-party` → Spotify login
2. `/select-playlist` — optional default playlist for the auto-refill
3. `/select-blacklist` — optional party blacklist: words (whole-word, case-insensitive), artists and songs via search; "Ohne Blacklist fortfahren" skips it
4. `/dashboard` — host dashboard; waiting songs in the queue have a "Song sperren" button that blocks the song for the party and removes it from the queue

Blacklisted songs appear greyed out with a disabled "+" and "Nicht erlaubt." in the guest (`/guest`) and host (`/search-host`) search.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

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

## Design tokens

Colors, brand gradients and border radii are defined once as CSS custom properties on `:root` in `src/styles.css` (e.g. `--color-primary`, `--gradient-brand`, `--radius-md`). Token names describe the role, not the hue, so a rebrand or a dark mode only changes that block.

Rules for page stylesheets (`src/app/pages/*/*.css`):

- No hex colors. Use `var(--color-…)` / `var(--gradient-…)`; for transparent brand colors use `rgba(var(--color-primary-rgb), 0.3)` or `rgba(var(--color-accent-rgb), …)`. Neutral `rgba(0, 0, 0, …)` / `rgba(255, 255, 255, …)` and `white`/`black` are fine.
- No `html` or `body` rules. Angular scopes component CSS, so they never apply; document-wide rules go into `src/styles.css`.

`src/app/design-tokens.spec.ts` checks both rules in `ng test`. Spec: `openspec/specs/web-design-system/spec.md`.

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

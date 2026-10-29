# web-design-system Specification

## Purpose
Defines the central design tokens of the Angular web frontend (colors, brand gradients, border radii in `src/styles.css`) and the rules page stylesheets follow, so design changes and a later dark mode only touch one place.
## Requirements
### Requirement: Central design tokens
The web frontend SHALL define its design tokens as CSS custom properties on `:root` in the global stylesheet `musicvoting/frontend/src/styles.css`. The tokens SHALL cover at least the brand colors (`--color-primary`, `--color-accent` and their variants), the brand gradient (`--gradient-brand`), neutral text, surface and border colors, the danger color (`--color-danger`) and the border radii (`--radius-*`). The brand primary SHALL be `#8403a6` and the brand accent SHALL be `#f2594b`.

#### Scenario: Brand tokens resolve in the browser
- **WHEN** any page of the web app is loaded
- **THEN** `getComputedStyle(document.documentElement).getPropertyValue('--color-primary')` resolves to `#8403a6`
- **AND** `--color-accent` resolves to `#f2594b`
- **AND** `--gradient-brand` resolves to a 135° linear gradient from the primary to the accent color

#### Scenario: A page element uses the primary token
- **WHEN** an element is styled with `var(--color-primary)` as its background
- **THEN** its computed background color is `rgb(132, 3, 166)`

### Requirement: Page stylesheets use tokens for colors
Page stylesheets under `musicvoting/frontend/src/app/pages/` SHALL NOT contain hexadecimal color literals. Colors SHALL be referenced via `var(--color-…)` or `var(--gradient-…)`. Brand-colored transparency SHALL use the RGB-channel tokens (e.g. `rgba(var(--color-primary-rgb), 0.3)`). Neutral black/white transparency overlays (`rgba(0, 0, 0, …)`, `rgba(255, 255, 255, …)`) and the keywords `white`, `black` and `transparent` remain allowed.

#### Scenario: No hex colors in page styles
- **WHEN** the compiled styles of every page component are inspected
- **THEN** none of them contains a hexadecimal color literal such as `#8403a6` or `#fff`

#### Scenario: Brand purple is consistent
- **WHEN** two pages show a primary-colored element (e.g. the active bottom-nav button on the guest page and a primary button on the host dashboard)
- **THEN** both use the same color value from `--color-primary`

### Requirement: No global element rules in component stylesheets
Page (component) stylesheets SHALL NOT contain rules targeting the `html` or `body` elements, because Angular's emulated view encapsulation scopes them to the component and they never apply. Document-wide rules SHALL live only in the global stylesheet `src/styles.css`.

#### Scenario: Component styles contain no html/body selectors
- **WHEN** the compiled styles of every page component are inspected
- **THEN** none of them contains a selector targeting `html` or `body`

### Requirement: Drawn Icons on Guest Screens
Icons on the guest screens (`/code`, `/voting`, `/guest`) and the home page MUST be drawn as inline SVG in the shared stroke style. Text glyphs (e.g. ♥, ✓, ←) and emoji MUST NOT be used as icons.

#### Scenario: Empty state icon
- GIVEN the voting view shows its empty state
- WHEN the page renders
- THEN the music icon in the circle is an SVG element, not an emoji

### Requirement: No Inline Styles in Guest Page Templates
Guest page templates (`/code`, `/voting`, `/guest`) and the TV player template MUST NOT use `style="…"` attributes; styling lives in the component stylesheet and its tokens, and hiding uses the `hidden` attribute.

#### Scenario: Hidden submit button
- GIVEN the add/search view's form needs an invisible submit button
- WHEN the template is inspected
- THEN the button carries the `hidden` attribute and no `style` attribute


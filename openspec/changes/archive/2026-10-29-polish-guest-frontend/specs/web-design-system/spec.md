## ADDED Requirements

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

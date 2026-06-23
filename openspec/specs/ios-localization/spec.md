# ios-localization Specification

## Purpose
TBD - created by archiving change add-ios-i18n. Update Purpose after archive.
## Requirements
### Requirement: iOS App Respects the Device Language
The iOS app MUST localize all user-facing strings via iOS's `Localizable.strings` infrastructure and display them in the language selected by the device's system language setting. The app MUST NOT hardcode user-facing strings in a single language, and MUST NOT provide an in-app language picker — the operating system's language setting is the sole control.

#### Scenario: Device set to German
- GIVEN an iPhone whose system language is German
- WHEN the user opens the app
- THEN all user-facing strings are shown in German

#### Scenario: Device set to English
- GIVEN an iPhone whose system language is English
- WHEN the user opens the app
- THEN all user-facing strings are shown in English

### Requirement: German Is the Base Language with English as a Secondary Language
The iOS app MUST ship German (`de`) and English (`en`) localizations, with German as the development/base region (`CFBundleDevelopmentRegion = de`). If a key is missing from the English localization, the German string MUST be used as the fallback rather than showing a raw key. The German strings MUST preserve the existing app wording verbatim.

#### Scenario: Missing English translation falls back to German
- GIVEN a localization key that exists in `de.lproj/Localizable.strings` but is absent from `en.lproj/Localizable.strings`
- WHEN the device language is English and that string is displayed
- THEN the German text is shown instead of a raw key identifier

#### Scenario: Unsupported device language falls back to German
- GIVEN an iPhone whose system language is neither German nor English
- WHEN the user opens the app
- THEN the app displays the German (base) strings

### Requirement: Backend Error Strings Remain Backend-Defined German
Error and status messages returned by the backend API (e.g. `"Nicht erlaubt."`, `"Song ist schon in der Warteschlange."`) MUST continue to be shown verbatim as received from the backend and MUST NOT be re-localized by the iOS app. Only strings owned by the iOS client are localized.

#### Scenario: Backend error is shown as received
- GIVEN the backend returns a German error message for a rejected request
- WHEN the iOS app displays that error
- THEN the message is shown exactly as the backend returned it, regardless of device language


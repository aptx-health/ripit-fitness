Feature: Theme page with previews
  Settings → Look → Theme opens its own page instead of a dropdown menu that
  can run off the bottom of the screen (staging bug, 2026-11-07). Every theme
  is a card showing a small preview of how it looks in light and dark.

  Scenario: Theme opens a page
    When the user taps Theme in Settings
    Then /settings/theme opens with the shared "← Settings" header and the title "Theme"
    And it scrolls like any page, so every theme can be reached on a phone

  Scenario: A card per theme
    Then each theme has a card with its name and two small previews side by side, Light and Dark
    And each preview is drawn with that theme's own colours and fonts: page background, a card with a heading and muted text, a primary button and an accent
    And E-INK shows only Light, marked "Light only"

  Scenario: Current theme
    Then the current theme's card is marked with a check and "Current"

  Scenario: Pick a theme
    When the user taps a card
    Then the app switches to that theme at once and the card becomes Current
    And picking E-INK still turns the E-ink display on, and leaving it still restores the old mode, as before

  Scenario: Mode stays in Settings
    Then light/dark is still chosen with the Mode row in Settings, and the page shows which mode is in use

  Scenario: The header picker
    Then the header theme picker can't run off the screen either: it opens the same page (or scrolls within the screen)

  Scenario: Fast and still
    Then the page renders the previews without a fetch or layout jump, and has a loading.tsx
    And with E-ink display on, nothing animates

  Scenario: Phone width
    Then at 390px the cards fit two-up or one-up with no horizontal scroll, tap targets at least 48px, in every theme and both modes

Feature: E-ink theme and display toggle
  For color e-ink screens (designed on a BOOX with Kaleido 3: a reflective
  paper screen, about 4,096 muted colours, colour at half the black-and-white
  resolution, slow refresh that ghosts on motion). Two parts:
  an "E-INK" theme (light only) and an "E-ink display" toggle that works with
  any theme. Both are per-device preferences, stored like the theme today
  (localStorage with the cookie fallback), applied before first paint by the
  inline scripts in app/layout.tsx and app/(auth)/layout.tsx.

  # Theme
  Scenario: Pick the e-ink theme
    When the user picks "E-INK" in the theme picker
    Then the app uses the e-ink theme in light mode
    And the E-ink display toggle turns on

  Scenario: Light only
    Given the e-ink theme is chosen
    Then the light/dark switch is hidden or disabled with "E-INK is light only"
    And a stored "eink:dark" preference is read as light

  Scenario: Paper look
    Given the e-ink theme is chosen
    Then the page is white, text and icons are black, and borders are solid black at least 2px
    And there are no shadows, gradients, textures, glows or translucent overlays

  Scenario: Few, strong colours on fills only
    Then colour is used only for fills and thick marks (primary buttons, active tabs, chips, chart lines and bars, PR markers), from a small palette of saturated colours that stay distinct on Kaleido 3
    And text is never coloured (except on a coloured fill, where it is black or white with at least 7:1 contrast)
    And no meaning depends on colour alone (success/flat/PR keep their words or icons)

  Scenario: No thin greys
    Then muted text and dividers are dark enough to read on e-ink (muted text at least 7:1 on white; dividers solid, not hairline)

  Scenario: Leaving the theme
    Given the e-ink theme is chosen
    When the user picks another theme
    Then the E-ink display toggle stays as it was (the user turns it off if they want)

  # Display toggle (any theme)
  Scenario: Toggle in Settings
    Then Settings has an "E-ink display" switch with the hint "Turns off animation and makes text bolder for e-ink screens"
    And it is a 48px switch that works with any theme

  Scenario: No motion
    Given E-ink display is on
    Then CSS animations and transitions are off everywhere (skeleton pulse, tab and folder transitions, the planned-set flash, image crossfades)
    And background effects (pixel drift and the like) don't render
    And components that check reduced motion behave as if it were requested

  Scenario: Static skeletons
    Given E-ink display is on
    Then loading skeletons show as still outlined blocks, not pulsing

  Scenario: Bolder text
    Given E-ink display is on
    Then body text is at least medium weight and small labels are not lighter than semibold

  Scenario: Off by default
    Given a new device
    Then E-ink display is off and the theme is the default

  Scenario: Before first paint
    Given E-ink display is on and the e-ink theme is chosen
    When any page loads, including sign-in
    Then the first paint already uses the e-ink theme and no motion, with no flash of the old theme

  # Fit
  Scenario: Every screen works
    Given the e-ink theme and E-ink display are on
    Then Training, Library, the workout logger, Progress (incl. the lift page) and Settings are readable at 390px and at the BOOX's width, with no element invisible or unreadable

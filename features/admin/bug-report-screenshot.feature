Feature: Report a bug with a screenshot
  From the admin quick panel, an admin reports a bug with a capture of the
  screen they're on and some context, saved as "bug" feedback. Agents fixing
  it can see the screenshot and the context.

  Background:
    Given I am signed in as an admin
    And I am on an app page

  # --- Capture ---

  Scenario: Report a bug captures the current screen
    When I open the admin panel and tap "Report a bug"
    Then the panel closes before the capture, so it isn't in the screenshot
    And a "Report a bug" sheet opens with a preview of the screen I was on

  Scenario: Retake or use a photo instead
    Given the "Report a bug" sheet shows a captured preview
    When I tap "Retake"
    Then the sheet hides, the screen is captured again, and the preview updates
    When I tap "Use a photo" and pick an image
    Then the preview shows that image instead

  Scenario: Capture fails
    Given the screen can't be captured
    When I tap "Report a bug"
    Then the sheet still opens, says the capture didn't work, and offers "Use a photo"
    And I can send the report without an image

  Scenario: Big images are shrunk before sending
    Given the image is larger than the limit
    Then it is scaled down and compressed as a JPEG to fit under 500 KB before upload

  # --- Sending ---

  Scenario: Send a bug report
    Given I typed "Rest timer didn't start" and have a screenshot
    When I tap "Send"
    Then a feedback item with category "bug" and that message is saved with its screenshot
    And the sheet closes with a confirmation
    And the Discord feedback notice says it has a screenshot

  Scenario: The report carries context
    When I send a bug report
    Then it records the page URL, the screen size, the theme, the build version,
    And the last few console errors from this session (up to 10, newest last)

  Scenario: A message is required
    Given the message is empty
    Then "Send" is disabled

  Scenario: A failed send keeps my report
    Given the upload fails
    When I tap "Send"
    Then I see that it didn't send, my message and image are kept, and I can try again

  # --- Who can do what ---

  Scenario: Only admins can attach screenshots
    Given I am not an admin
    Then I never see "Report a bug"
    And the server refuses a screenshot on feedback from me

  Scenario: The server checks the image
    Then the server accepts only JPEG, PNG or WebP images up to 500 KB
    And refuses anything else without saving the feedback

  # --- Reading it back ---

  Scenario: The admin feedback page shows the screenshot
    Given a bug report with a screenshot
    When I open it on the admin feedback page
    Then I see the screenshot (tap to see it full size) and its context

  Scenario: Agents can see the screenshot
    Given a bug report with a screenshot
    Then the MCP feedback list says which items have a screenshot
    And an agent can fetch that screenshot as an image, with its context
    And only for feedback the agent's user can see

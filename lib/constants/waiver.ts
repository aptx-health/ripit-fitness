/**
 * Waiver version and content constants.
 *
 * Bump CURRENT_WAIVER_VERSION when legal copy changes — the routing guard
 * will force existing users to re-accept before they can proceed.
 *
 * Real legal copy will be provided by #463; this file holds the placeholder
 * text from the UI stub (#472).
 */

export const CURRENT_WAIVER_VERSION = '1.0'

export const WAIVER_TEXT = `
ASSUMPTION OF RISK AND WAIVER OF LIABILITY

By using this application, you acknowledge and agree to the following:

1. Physical activity carries inherent risks of injury. You voluntarily assume
   all risks associated with any exercise program you undertake using this app.

2. This application is not a substitute for professional medical advice,
   diagnosis, or treatment. Consult your physician before beginning any
   exercise program.

3. You are solely responsible for determining whether any exercise or workout
   is appropriate for your fitness level and physical condition.

4. The developers and operators of this application shall not be liable for
   any injury, damage, or loss resulting from your use of the app or
   participation in any exercise program.

5. You agree to use the application in accordance with all applicable laws
   and regulations.

[Placeholder waiver text -- replaced by #463]
`.trim()

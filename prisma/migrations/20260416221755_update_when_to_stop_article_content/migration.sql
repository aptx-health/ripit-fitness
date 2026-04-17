-- Update "when-to-stop" article with revised title and body
--
-- The initial migration (20260416173535) inserted the article. This
-- follow-up applies the post-review content edits: new title, restructured
-- sections, and updated disclaimer footer. The slug stays unchanged so
-- bookmarks and collection placement are unaffected.
--
-- Idempotent: UPDATE is naturally idempotent (same row, same values).
-- Skips silently if the article doesn't exist yet (fresh env handled by seed).

UPDATE "Article"
SET
  title = 'When to Push, When to Pause',
  body = $body$# When to Push, When to Pause

*Heads up: this is general guidance to help you train safely, not medical advice. If something feels off and doesn't go away, talk to a doctor or physical therapist who can actually take a look.*

Your first few weeks of training will throw new sensations at you. Most of them are your body adapting, and they're fine. A few are worth paying attention to. This guide is here so you can tell which is which.

## The normal stuff

Soreness a day or two after a session, especially after trying something new. Muscles burning on your last few reps. Shaky arms or legs after a hard set. Getting sweaty and out of breath. Stiff joints that loosen up once you start moving. A muscle feeling pumped and tight after you've worked it.

All normal. Drink some water, eat something, get some sleep. By your next session it's gone.

## When to call it on an exercise

Sometimes a specific movement just isn't working that day. If you notice any of the following, rack the weight and move on to something else in your program:

- A sharp, sudden pain that's different from muscle burn — more like a sting, pinch, or jolt
- Pain inside a joint (shoulder, knee, elbow, lower back). Muscles are supposed to work hard. Joints should feel quiet and stable.
- Numbness or tingling in your hands or feet during the movement
- That gut feeling that something's wrong before you can explain why. Worth listening to.

You don't need to figure out what happened. Finish the rest of your workout, and try the exercise again next session — lighter weight, or a different variation. If the same thing happens twice, give it a week off and come back to it.

## When to call it on the workout

Some things are worth ending the session for:

- Chest tightness, pressure, or pain — especially if it spreads to your arm, jaw, or back
- Dizziness that hangs around or gets worse after you sit down
- Sudden nausea, cold sweat, or feeling like you might pass out
- A sudden, severe headache during a heavy set

These are the kinds of symptoms most guidance treats as reasons to stop, sit down, and get some water. If they don't pass in a few minutes, most folks would tell you to seek medical attention — and skip the drive home if you're still feeling rough. Most of the time it's nothing serious. Better to find out sitting down than mid-squat.

## When it's worth getting checked out

A few patterns are worth a visit to a doctor, PT, or sports medicine person:

- Pain from training that's still bugging you a week later, outside the gym
- A joint that gets worse session to session instead of better
- The same spot — same knee, same shoulder — flaring up every time you train it
- Anything that's changing how you walk, sleep, or move through your day
- Chest stuff that keeps showing up during workouts, even if it's mild

Going to see someone isn't a sign you broke yourself. People who lift for decades do this routinely. A good PT can usually spot what's going on in a session or two — often it's a mobility thing or a form tweak that's a quick fix.

When you're not sure if it's worth a visit, that uncertainty is usually worth an hour of someone's time. While you're sorting it out, train the parts that feel good and let the cranky ones rest.

You're going to have a long career of this. Pacing yourself early is how you get there.

---

*Ripit gives you general fitness guidance, not medical advice. For anything specific to your body, talk to a doctor or PT. Full terms in your user agreement.*$body$,
  "updatedAt" = NOW()
WHERE slug = 'when-to-stop';

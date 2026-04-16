-- Add "When to Stop and When to Ask for Help" article to Getting Started
--
-- Data-only migration. Inserts one article, its tag association, and its
-- collection placement at position 6 (between "Staying Safe" and
-- "Gym Etiquette"). Bumps subsequent articles by one position.
--
-- Idempotent: safe to re-run. The reorder step only fires when the article
-- is not yet in the collection, preventing repeated runs from shifting
-- positions.
--
-- Skips silently if the Getting Started collection or Beginner Basics tag
-- don't exist yet (e.g., a fresh environment where the seed hasn't run).
-- In that case, prisma/seeds/dev-articles.ts already contains the article
-- and the seed will place it correctly.

DO $mig$
DECLARE
  v_collection_id TEXT;
  v_article_id    TEXT;
  v_tag_id        TEXT;
  v_already_in_collection BOOLEAN;
BEGIN
  SELECT id INTO v_collection_id FROM "Collection" WHERE name = 'Getting Started' LIMIT 1;
  IF v_collection_id IS NULL THEN
    RAISE NOTICE 'Getting Started collection not found; skipping (fresh env seed will handle)';
    RETURN;
  END IF;

  SELECT id INTO v_tag_id FROM "Tag" WHERE name = 'Beginner Basics' AND category = 'topic' LIMIT 1;
  IF v_tag_id IS NULL THEN
    RAISE NOTICE 'Beginner Basics tag not found; skipping (fresh env seed will handle)';
    RETURN;
  END IF;

  -- Insert the article. ON CONFLICT makes this safe if the article already exists
  -- (e.g., created via admin UI prior to this migration running).
  INSERT INTO "Article" (
    id, title, slug, body, level, status, "authorId",
    "readTimeMinutes", "publishedAt", "createdAt", "updatedAt"
  )
  VALUES (
    gen_random_uuid()::text,
    'When to Stop and When to Ask for Help',
    'when-to-stop',
    $body$# When to Stop and When to Ask for Help

"Staying Safe in the Gym" covered the basic distinction between pain and discomfort. This article goes one step further: when should you actually stop an exercise, stop the workout, or go see a professional?

Most of what's below will never apply to you. Knowing the difference between something you can push through and something that needs attention is a skill worth having before you need it.

## Things that feel weird but are fine

Your first few weeks will include sensations you haven't felt before. Most of them are normal:

- Soreness 24-48 hours after a workout, especially after new exercises
- Muscles burning during the last few reps of a set
- Arms or legs feeling shaky after a hard set
- Feeling out of breath, sweaty, warm
- Mild joint stiffness that loosens up during your warm-up
- A muscle that feels pumped or tight after training it

None of these need any action. Drink water, move around, eat something. By your next session it's gone.

## Stop the exercise

Some sensations are your body telling you that the specific movement isn't working today. When you feel any of these, stop the set, rack the weight, and move on to something else:

**Sharp or sudden pain.** A sting, a pinch, or a jolt that wasn't there on the previous rep. This is different from muscle burn — it's sharper and it grabs your attention.

**Pain in a joint.** Shoulders, knees, elbows, lower back. Muscles should work during an exercise. Joints should feel stable and quiet. If your shoulder aches every time you press overhead, that's your shoulder asking you to stop.

**Numbness or tingling.** Hands or feet going numb, pins and needles down an arm or leg. This can be a nerve being pinched by your position. Adjust the machine or skip that exercise for the day.

**An instinct to pull away.** Sometimes you feel a movement is wrong before you can describe why. Trust that. Stop the set.

You don't need to diagnose what happened. Do the other exercises in your program, then try that one again next session with lighter weight or a different variation. If the same thing happens twice, leave it alone for a week and see how it feels later.

## Stop the workout

A few signals mean the whole session is over, not just the one exercise:

**Chest tightness, pressure, or pain.** Especially if it spreads to your arm, jaw, or back. Stop training, sit down, and tell someone. If it doesn't pass in a few minutes, call for help. This isn't common in gyms but it's not zero.

**Dizziness that doesn't pass.** A brief head rush when you stand up from a machine is normal. Dizziness that sticks around, or gets worse after you sit down, is not. Sit, drink water, and give yourself a few minutes. If it doesn't clear up, go home — and don't drive if you still feel off.

**Nausea or feeling faint.** Cold sweat, tunnel vision, nausea that comes on suddenly. Same protocol: sit down, drink water, wait it out, head home if it doesn't resolve.

**A sudden severe headache.** Especially one that comes on during a heavy set. Stop and give yourself time. If it's the worst headache you've ever had, that's an emergency room situation.

Wrapping up early when something feels off is the right call. You'll train again tomorrow or the next day.

## See a professional

A few patterns are worth getting checked out by a doctor, physical therapist, or sports medicine provider:

- Pain from an exercise that's still there a week later, outside the gym
- Joint pain that gets worse session to session instead of better
- A recurring issue — the same knee, the same shoulder — flaring up every time you train it
- Any pain that changes how you walk, sleep, or move through normal daily things
- Chest-related symptoms, even mild ones, if they keep showing up during training

Seeing a professional isn't a sign you've done something wrong. It's what people who train seriously for decades do. A physical therapist can usually identify what's going on in a visit or two — often a mobility or form issue that's fixable, sometimes something that needs a different approach for a few weeks.

If you're not sure whether something warrants a visit, it probably does. The cost of going is an hour of your time. The cost of not going is training through something that gets worse.

In the meantime, train the parts of your body that aren't complaining, and give the ones that are a session or two off.

---

*This article is general guidance for training safely. It isn't medical advice. If something feels wrong and doesn't go away, see someone qualified who can actually examine what's going on.*$body$,
    'beginner'::"ArticleLevel",
    'published'::"ArticleStatus",
    'system',
    4,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_article_id FROM "Article" WHERE slug = 'when-to-stop' LIMIT 1;

  -- Tag association (compound PK on articleId+tagId makes this idempotent)
  INSERT INTO "ArticleTag" ("articleId", "tagId")
  VALUES (v_article_id, v_tag_id)
  ON CONFLICT DO NOTHING;

  -- Only shift existing articles if we haven't already attached this one.
  -- This prevents a re-run from pushing everyone down again.
  SELECT EXISTS(
    SELECT 1 FROM "CollectionArticle"
    WHERE "collectionId" = v_collection_id AND "articleId" = v_article_id
  ) INTO v_already_in_collection;

  IF NOT v_already_in_collection THEN
    UPDATE "CollectionArticle"
    SET "order" = "order" + 1
    WHERE "collectionId" = v_collection_id AND "order" >= 6;

    INSERT INTO "CollectionArticle" ("collectionId", "articleId", "order")
    VALUES (v_collection_id, v_article_id, 6);
  END IF;
END
$mig$;

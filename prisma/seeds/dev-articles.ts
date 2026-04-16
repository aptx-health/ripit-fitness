/**
 * Learning content for the Learn tab.
 *
 * Three collections:
 *   1. Getting Started — linked from beginner primer, first-week essentials
 *   2. Building Your Foundation — week 2-4 topics
 *   3. Making It Stick — habit and identity, surfaced after 3-4 workouts
 */

type ArticleDef = {
  title: string
  slug: string
  body: string
  level: 'beginner' | 'intermediate' | 'advanced'
  readTimeMinutes: number
  tags: string[]
}

// ---------------------------------------------------------------------------
// Collection 1: Getting Started
// ---------------------------------------------------------------------------

const yourFirstWeek: ArticleDef = {
  title: 'Your First Week: What to Expect',
  slug: 'your-first-week',
  level: 'beginner',
  readTimeMinutes: 4,
  tags: ['Beginner Basics'],
  body: `# Your First Week: What to Expect

You showed up. That's the hardest part. Here's what the next few days actually feel like so nothing catches you off guard.

## Day 1: It's going to feel awkward

You'll fumble with machines. You'll forget which exercise is next and check your phone. You might pick a weight that's too light or too heavy on the first try. All of that is normal and expected.

Nobody in the gym is paying attention to you. They're focused on their own workout, their own music, their own sets. You're invisible in the best possible way.

## Day 2-3: Soreness

Somewhere between 24 and 48 hours after your first workout, you'll feel sore. Maybe very sore. This is called DOMS (delayed onset muscle soreness) and it happens to everyone after new exercises, not just beginners.

It doesn't mean you did something wrong. It doesn't mean you went too hard. It means your muscles did something unfamiliar and they're adapting.

A few things that help:
- Move around. A short walk or light stretching feels better than sitting still
- Stay hydrated
- It gets dramatically better after the first week. Your second workout will produce far less soreness than your first

## Day 2 or 3: Your next workout

You might feel stiff walking in. That's fine. Your warm-up will loosen things up, and most people feel better mid-workout than they did walking through the door.

If a muscle is so sore that you can't perform an exercise with decent form, use a lighter weight or skip that one. There's no penalty for adjusting.

## By the end of week 1

The soreness is fading. The machines feel more familiar. You're not checking the app between every single set anymore. You start to notice small things — the weight that felt heavy on Monday feels a bit easier on Friday.

This is the part that hooks people. You notice your body adapts fast when you give it a reason to.

## The only thing that matters this week

Show up, follow the program, don't go too heavy. That's it. Everything else — optimal weight selection, understanding intensity, tracking progression — comes later.`,
}

const howToReadYourProgram: ArticleDef = {
  title: 'How to Read Your Program',
  slug: 'how-to-read-your-program',
  level: 'beginner',
  readTimeMinutes: 3,
  tags: ['Beginner Basics'],
  body: `# How to Read Your Program

Your program is organized into weeks, and each week has workouts (training days). When you open a workout, you'll see a list of exercises with some numbers next to each one.

## What the numbers mean

Here's what a typical exercise looks like in the app:

**Chest Press** - 3 x 12 @ RIR 3

- **3** is the number of sets (rounds of the exercise)
- **12** is the number of reps (how many times you move the weight per set)
- **RIR 3** means "Reps in Reserve" — stop when you could still do about 3 more

So you'd do the Chest Press 12 times, rest, do it 12 more times, rest, then 12 more times. Each round you stop when you feel like you've got about 3 left in you.

## Warm-up sets vs. working sets

Some exercises have warm-up sets listed before the working sets. These are marked differently in the app. Warm-up sets use lighter weight and are there to prepare your body for the heavier work. Don't skip them.

## What to do when you're working out

1. Open the workout for today
2. Go to the first exercise
3. Do the prescribed sets and reps
4. Log what you actually did — the weight you used and how many reps you got
5. Move to the next exercise

If you didn't hit the prescribed reps, log what you got. If you used a different weight, log that. Honest logging is more valuable than perfect numbers.

## Logging matters more than you'd think

The app builds your training history from what you log. Over weeks, you'll see patterns — where you're getting stronger, where you're stalling, when you need to adjust. But that only works if you log what actually happened, not what the program told you to do.`,
}

const choosingTheRightWeight: ArticleDef = {
  title: 'Choosing the Right Weight',
  slug: 'choosing-the-right-weight',
  level: 'beginner',
  readTimeMinutes: 4,
  tags: ['Beginner Basics', 'Strength Training'],
  body: `# Choosing the Right Weight

The most common mistake beginners make is going too heavy too soon. The second most common mistake is worrying too much about picking the "right" weight. Here's a simple framework.

## Use RIR as your guide

Your program prescribes an RIR (Reps in Reserve) for each exercise. This tells you how hard the set should feel, not what weight to use.

- **RIR 4-5**: Comfortable. You finish and could clearly keep going. Good for warm-ups and your first week
- **RIR 3**: Moderate effort. You could do a few more but you're working
- **RIR 2**: Hard. You could get 2 more if you had to
- **RIR 1**: Very hard. One more rep and that's it
- **RIR 0**: You couldn't do another rep with good form

For your first few sessions, err toward RIR 4-5 even if the program says RIR 2-3. You're learning the movements. There's no rush.

## Intensity matters more than the number on the weight

A set of 12 reps at a controlled pace with a weight that challenges you is better training than heaving a heavy weight around with momentum and body english. When you see someone swinging their whole body to curl a dumbbell, that's ego lifting. The muscle they're trying to train isn't doing most of the work.

Focus on:
- Controlling the weight through the full range of motion
- Feeling the target muscle working
- Hitting the prescribed rep range at the prescribed RIR

The weight on the machine or dumbbell is just a means to get there. It will go up naturally as you get stronger.

## How to find your starting weight

For a machine exercise you've never done:
1. Start with a weight that feels obviously too light
2. Do 5-6 reps. If it feels like air, move up
3. Repeat until the weight feels like work but you could clearly do more reps
4. That's your starting point

You'll dial it in over 2-3 sessions. Being a little too light the first time costs you almost nothing. Being too heavy risks bad form, strain, and a worse workout.

## When to adjust

- You finished all sets at the prescribed reps and it felt easier than the target RIR? Go up a small increment next time
- You couldn't finish the prescribed reps? Drop the weight next time. No shame in it
- The weight felt right but your form broke down on the last set? Stay at that weight and nail it clean next time before going up`,
}

const warmingUp: ArticleDef = {
  title: 'Warming Up: Why and How',
  slug: 'warming-up',
  level: 'beginner',
  readTimeMinutes: 3,
  tags: ['Beginner Basics'],
  body: `# Warming Up: Why and How

A warm-up gets blood flowing, loosens your joints, and prepares your muscles for work. It doesn't need to be complicated or long. Five to seven minutes before you start your first exercise.

## Step 1: Get your heart rate up (3-5 minutes)

Pick one and go at an easy-to-moderate pace:
- Treadmill at an incline
- Stationary bike
- Jump rope
- Brisk walk

You're aiming for "slightly out of breath, light sweat." Not a cardio session.

## Step 2: Move your joints (2 minutes)

Focus on the areas you're about to train. Some basics that cover most workouts:
- Arm circles (forward and back, 10 each)
- Shoulder rolls
- Torso twists
- Hip circles
- Leg swings (front-to-back, side-to-side)
- Bend down and reach for your toes, hold for a few seconds

You don't need to be thorough about this. The goal is to feel less stiff than when you walked in.

## Step 3: Warm-up sets (built into your program)

Your program includes warm-up sets at the start of exercises, especially compound movements. These use lighter weight and exist so you can practice the movement pattern and get the target muscles firing before your working sets.

Use a weight that feels easy — like you could do many more reps without any real effort. The purpose is preparation, not fatigue.

More complex exercises like squats or leg press will have more warm-up sets than something like a bicep curl. The app handles this for you.

## What about stretching?

Save static stretching (holding a stretch for 30+ seconds) for after your workout. Before training, dynamic movement — the arm circles, leg swings, and torso twists above — does a better job of preparing your muscles.`,
}

const stayingSafe: ArticleDef = {
  title: 'Staying Safe in the Gym',
  slug: 'staying-safe',
  level: 'beginner',
  readTimeMinutes: 4,
  tags: ['Beginner Basics'],
  body: `# Staying Safe in the Gym

Strength training is one of the safest forms of exercise when done with basic awareness. Most gym injuries come from ego lifting, distraction, or ignoring pain signals. Here's what to pay attention to.

## Pain vs. discomfort

This is the most important distinction you'll learn:

**Muscle fatigue and burning during a set** — normal. This is the muscle working. It should feel hard by the end of a set, especially at lower RIR.

**Soreness the next day or two** — normal. Especially after new exercises. This fades dramatically after your first week.

**Sharp, sudden, or localized joint pain during a movement** — stop. Drop the weight or step off the machine. This kind of pain is your body telling you something isn't right. It could be form, it could be too much weight, it could be a movement that doesn't agree with your body. Don't push through it.

If something hurts in a way that surprises you, skip that exercise for the day. Try it again next session with lighter weight. If it persists, ask the gym staff or see a professional.

## Machine safety

- **Check the pin.** On selectorized machines (the ones with a weight stack), make sure the pin is fully inserted into the weight you want. A half-inserted pin can slip mid-set
- **Adjust the seat.** Most machines have a seat height adjustment and sometimes a back pad position. Take 10 seconds to set it up for your body. The right position makes the exercise feel natural; the wrong position puts stress on your joints
- **Watch the cable path.** On cable machines, make sure the cable isn't going to catch on anything as you move. Stand clear of the weight stack

## Free weight safety

If your program includes dumbbells:
- Pick them up from the rack with a flat back, not a rounded one
- Don't drop dumbbells from height. Lower them to your thighs first, then to the floor
- Use the full range of motion with control. If you can't control the weight, it's too heavy

## General awareness

- Keep your area clear. Water bottles and bags go out of the walking path
- If you're between sets, stay near your equipment so nobody thinks you're done
- If you feel dizzy or lightheaded, stop, sit down, drink some water. This can happen early on, especially if you haven't eaten recently
- Breathe. Holding your breath through an entire set raises your blood pressure unnecessarily. Exhale during the hard part (pushing or pulling), inhale during the easy part (lowering)`,
}

const whenToStop: ArticleDef = {
  title: 'When to Stop and When to Ask for Help',
  slug: 'when-to-stop',
  level: 'beginner',
  readTimeMinutes: 4,
  tags: ['Beginner Basics'],
  body: `# When to Stop and When to Ask for Help

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

## A note on soreness

Regular soreness is not in the "see a doctor" category. A muscle that's sore from yesterday's workout and loosens up during your warm-up is fine to train. Soreness that feels sharp, localized to a joint, or that gets worse once you start moving is something else. The distinction takes a few weeks to feel out.

When in doubt, train the parts of your body that aren't complaining, and give the ones that are a session or two off.`,
}

const gymEtiquette: ArticleDef = {
  title: 'Gym Etiquette: The Short Version',
  slug: 'gym-etiquette',
  level: 'beginner',
  readTimeMinutes: 3,
  tags: ['Beginner Basics'],
  body: `# Gym Etiquette: The Short Version

Gyms have unwritten rules. Once you know them, they're obvious. Here's the full list — it's shorter than you'd expect.

## The basics

**Wipe down equipment when you're done.** Spray bottle and paper towels are scattered around the gym. Quick wipe of the seat and any pads you touched. Takes 5 seconds.

**Rerack your weights.** Put dumbbells back where you found them. Remove plates from barbells when you're done. This is the one that gym regulars care about the most.

**Don't sit on a machine scrolling your phone between sets.** Rest between sets is normal and expected — 2-3 minutes for big lifts. But if you're resting for 5 minutes while checking Instagram, and someone is waiting, that's not great. If you notice someone hovering, ask if they want to work in (alternate sets with you).

## Sharing equipment

If the gym is busy and someone asks "how many sets do you have left?" they're waiting for the equipment. Give them an honest answer. If you've got several sets left, offer to let them work in — you alternate sets while each of you rests.

If you need a machine that's occupied, it's totally fine to ask "mind if I work in?" or "how many sets do you have left?" This is standard gym communication. Nobody will think it's weird.

## What nobody will judge you for

- Using light weight. Nobody cares what's on your machine
- Checking the app between sets. You're following a program, that's smart
- Not knowing how to adjust a machine. Ask someone — the staff, another gym-goer, whoever's nearby. People in gyms like helping with this stuff
- Taking your time. There's no pace you're supposed to maintain
- Being new. Everyone was new once, and most people remember how it felt

## Headphones

If someone has headphones in, they probably don't want to chat. A quick question ("are you using this?") is fine. A long conversation is not. Same goes for you — if you want to be left alone, headphones are a universal signal.`,
}

// ---------------------------------------------------------------------------
// Collection 2: Building Your Foundation
// ---------------------------------------------------------------------------

const gettingComfortableWithMachines: ArticleDef = {
  title: 'Getting Comfortable with Machines',
  slug: 'getting-comfortable-with-machines',
  level: 'beginner',
  readTimeMinutes: 4,
  tags: ['Beginner Basics', 'Equipment'],
  body: `# Getting Comfortable with Machines

Machines are great for beginners because they guide the movement for you. You don't have to worry about balance or bar path — just push or pull. But they can look intimidating when you don't know how to adjust them.

Most commercial gyms use Matrix, Life Fitness, or similar brands. The adjustment mechanisms are nearly identical across all of them.

## Seat height

Almost every machine has a yellow or orange pull pin on the side of the seat. Pull it out, slide the seat up or down, and release the pin into the nearest hole. Some machines use a lever under the seat instead.

**How to tell if it's right:** The movement should feel natural at the start position. If you're straining to reach the handles before you've even started the rep, or the handles are jammed into your chest, the seat is wrong.

Rules of thumb:
- **Chest press and shoulder press:** Handles should be roughly at chest/shoulder height. Your feet should be flat on the floor
- **Lat pulldown:** Thigh pad should pin your legs so you don't lift off the seat. Sit down, adjust the pad, then grab the bar
- **Leg press:** When your knees are bent at the start position, they should be at about 90 degrees. Not deeper, not shallower
- **Leg curl and extension:** The rotation point of the machine should line up with your knee joint. The pad should sit just above your ankles

## Weight selection

Most machines use a pin-and-stack system. Pull the pin out, insert it into the plate you want, and make sure it's fully seated. Give the stack a small test lift before your set — if the pin isn't in right, you'll feel it click or slip.

Weight increments vary by machine. Some go up in 10 lb jumps, which can be too big for smaller muscle groups. Many machines have a small add-on weight (2.5 or 5 lbs) at the top of the stack with its own pin. Use it.

## Cable machines

Cables are more versatile than fixed machines. You can adjust the pulley height (high, mid, low) and swap out handles. The adjustment pin is usually on the column — pull it out, slide the pulley, click it into the height you need.

Common handle attachments:
- **Straight bar:** Pulldowns, pushdowns
- **V-bar or rope:** Pushdowns, face pulls
- **D-handle (single grip):** One-arm rows, single-arm presses, lateral raises

The attachment clips on with a carabiner. Just unclip the old one and clip on the one you need. If you can't find the attachment you want, check the rack or hooks near the cable station.

## If you're lost

Every machine has a placard on it with a diagram of the exercise and which muscles it works. It's usually on the frame at eye level. This tells you the intended movement and the correct seat position.

And if the placard doesn't help — ask someone. Gym staff exist for exactly this question.`,
}

const dumbbellBasics: ArticleDef = {
  title: 'Dumbbell Basics',
  slug: 'dumbbell-basics',
  level: 'beginner',
  readTimeMinutes: 3,
  tags: ['Beginner Basics', 'Equipment'],
  body: `# Dumbbell Basics

Dumbbells are simple — grab one in each hand and go. But there are a few things worth knowing if you haven't used them before.

## Picking them up

Dumbbells live on a rack, usually organized lightest to heaviest. When you grab a pair:
- Stand close to the rack
- Bend at your hips and knees (like a squat), grab the dumbbells, and stand up. Don't round your back and yank them off the rack
- Carry them to where you're working, then set them down

This sounds obvious, but rounding your back to grab a 30 lb dumbbell off a low shelf is one of the more common ways people tweak their back in a gym.

## Putting them back

Return dumbbells to the same spot on the rack when you're done. This matters more than you'd think — someone searching for the 20s while they're wedged in the 50 slot is a universal gym frustration.

Don't drop dumbbells from height. When you finish a set, lower them to your thighs, then tilt forward and place them on the ground. Or just reverse the pickup — hinge at the hips and set them down.

## Grip

For most exercises you'll wrap all four fingers and your thumb around the handle. Grip firmly but don't white-knuckle it — a death grip tires out your forearms faster than the target muscle.

A few exercises use different grips:
- **Neutral grip** (palms facing each other) — common for rows, presses, and hammer curls
- **Supinated grip** (palms up) — bicep curls
- **Pronated grip** (palms down) — less common, some row variations

Your program will typically specify if the grip matters. If it doesn't, use whatever feels natural.

## How heavy?

Same rules as any other exercise — start lighter than you think and use RIR to guide you. Dumbbells are often harder than the equivalent machine weight because you have to stabilize the weight yourself. A 20 lb dumbbell press feels heavier than 20 lbs on a chest press machine.

If your program just started and you've been using machines, expect to use lighter weight when you switch to dumbbells for the same movement pattern.`,
}

const restBetweenSets: ArticleDef = {
  title: 'Rest Between Sets',
  slug: 'rest-between-sets',
  level: 'beginner',
  readTimeMinutes: 3,
  tags: ['Strength Training'],
  body: `# Rest Between Sets

Rest is part of the workout, not a break from it. How long you rest affects how well you perform on your next set.

## How long to rest

There's no single answer, but here's a starting point:

**Compound exercises** (leg press, chest press, rows, lat pulldown) — 2-3 minutes. These use multiple muscle groups and take more recovery between sets.

**Isolation exercises** (bicep curls, tricep pushdowns, lateral raises, leg extensions) — 60-90 seconds. Smaller muscles recover faster.

**Warm-up sets** — 30-60 seconds. You're not fatiguing yourself, so you don't need much.

If you're at RIR 1-2 on your working sets, lean toward the longer end. If you're at RIR 3-4, the shorter end is fine.

## How to tell if you've rested enough

You should feel ready to do another set at roughly the same quality as the last one. If you start your next set and the weight feels dramatically harder than it should, you probably needed more rest.

On the other hand, if you're resting 5+ minutes between sets of bicep curls, you're probably resting longer than you need to.

## What to do while resting

Honestly? Not much. Sit on the machine or bench, breathe, maybe check the app for your next exercise. You don't need to be doing anything productive during rest. Your muscles are recovering and that's the point.

What you probably shouldn't do: wander across the gym, start a conversation, lose track of time. Staying near your equipment keeps your rest consistent and signals to others that you're still using it.

## A common beginner mistake

New lifters often don't rest enough because they feel awkward sitting there. They rush through sets and wonder why everything feels so hard by set 3. If the program says 3 sets and you're failing on set 2, try resting longer before you drop the weight. The rest might be the issue, not the weight.`,
}

const understandingRIR: ArticleDef = {
  title: 'Understanding RIR and Intensity',
  slug: 'understanding-rir',
  level: 'beginner',
  readTimeMinutes: 4,
  tags: ['Strength Training'],
  body: `# Understanding RIR and Intensity

You've been using RIR for a couple of weeks now. You have a feel for it. Here's the deeper picture of what it's actually doing for your training.

## What RIR really measures

RIR (Reps in Reserve) is a way to standardize effort across every exercise, every weight, every person. Whether you're leg pressing 90 lbs or 300 lbs, RIR 2 means the same thing: you stopped 2 reps before failure.

This matters because the stimulus that makes muscles grow and get stronger comes primarily from hard sets — sets done within about 3 reps of failure. Training at RIR 0-3 is where most of the productive work happens.

## Why we don't just say "go to failure"

Training to failure (RIR 0) on every set sounds hardcore, but it has real costs:
- It accumulates more fatigue than the extra stimulus is worth
- Your form tends to break down on those last grinding reps
- It makes it harder to complete your remaining sets at a good quality
- Recovery takes longer, which can affect your next workout

Programs prescribe RIR targets to keep you in the productive zone — hard enough to drive adaptation, controlled enough to sustain across a full workout and a full training week.

## Getting better at estimating RIR

Everyone underestimates their RIR at first. You think you're at RIR 2 but you actually had 4-5 reps left. This is normal and it calibrates over time.

A few cues that help:
- **Speed:** When the bar or weight starts moving noticeably slower, you're getting close to failure. If rep 10 moves at the same speed as rep 1, you had more in the tank
- **Effort:** If you could carry on a conversation during the set, you're probably at RIR 5+. If you need to catch your breath after, you were closer to the mark
- **The last 2 reps test:** After a set, honestly ask yourself — could you have done 2 more with the same form? If yes, you're at RIR 2 or higher

Don't stress about getting it exactly right. Being within 1 rep of your target is good enough. The important thing is that you're training with intentional effort, not just moving weight for the sake of counting reps.

## RIR vs. RPE

You'll see RPE (Rate of Perceived Exertion) referenced in some training contexts. RPE uses a 1-10 scale where 10 is max effort. In practice, RPE and RIR map to each other:

- RPE 10 = RIR 0 (max effort)
- RPE 9 = RIR 1
- RPE 8 = RIR 2
- RPE 7 = RIR 3

This app defaults to RIR because most people find "how many more could I do?" easier to answer than "what number out of 10 was that?" Both measure the same thing.`,
}

const progressiveOverload: ArticleDef = {
  title: 'Progressive Overload: Adding Weight Over Time',
  slug: 'progressive-overload',
  level: 'beginner',
  readTimeMinutes: 4,
  tags: ['Strength Training'],
  body: `# Progressive Overload: Adding Weight Over Time

Your body adapts to the demands you place on it. If you do the same weight for the same reps every week, your body stops having a reason to get stronger. Progressive overload means gradually increasing the challenge so your muscles keep adapting.

## When to increase weight

You're ready to go up when you can complete all prescribed sets at the prescribed reps while hitting (or beating) the target RIR. If your program says 3 x 12 at RIR 2, and you finish all three sets of 12 at RIR 2 or even RIR 3, it's time to add weight.

If you can hit the reps but your last set is at RIR 0-1 and your form is breaking down, you're right at the edge. Stay at that weight for another session.

## How much to add

Small jumps. Smaller than you think.

- **Machines:** Go up one pin (usually 5-10 lbs). If the machine has an add-on weight at the top of the stack, use that for a smaller jump
- **Dumbbells:** Go up one pair (usually 5 lbs per hand). For smaller exercises like lateral raises, even 2.5 lb jumps can be significant
- **Cables:** One plate on the stack

A 5 lb increase on a 50 lb exercise is a 10% jump. That's meaningful. Resist the urge to jump two or three increments just because this week felt easy.

## What if you stall

At some point, you'll hit a weight where you can't complete all prescribed reps. This is normal and expected. A few approaches:

**Stay and repeat.** Use the same weight next session. Often you'll get the reps the second time around.

**Add reps first.** If the program says 3 x 10 and you can do 10, 10, 9 at the new weight, that's progress. Next session try for 10, 10, 10. Then increase weight.

**Drop and build back.** Lower the weight slightly and add an extra rep or set. Build back up to the target weight over 2-3 sessions.

Stalling isn't failure. It's information. The weight you stall at tells you where your current limit is, and working at that limit is exactly how you push it higher.

## The long view

In your first few months, weight will go up almost every week on most exercises. This is beginner gains — your nervous system is learning how to recruit muscle fibers efficiently, and the improvements come fast.

After 6-12 months, progress slows down. Increases become smaller and less frequent. This is normal. Experienced lifters might add weight to a lift once a month or fight for a single rep improvement over weeks.`,
}

const whyYourProgramRepeats: ArticleDef = {
  title: 'Why Your Program Repeats',
  slug: 'why-your-program-repeats',
  level: 'beginner',
  readTimeMinutes: 3,
  tags: ['Strength Training'],
  body: `# Why Your Program Repeats

You might notice that week 2 looks exactly like week 1. Same exercises, same order, same rep targets. Week 3 too. This can feel wrong — shouldn't you be mixing things up?

No. The repetition is the point.

## You can't measure progress on an exercise you just learned

The first time you do a cable row, most of your effort goes into figuring out the movement — where to stand, how to grip, what the pull should feel like. The weight you pick is a guess. By week 3, you've grooved the pattern and you're actually training the muscle instead of learning the coordination. That's when the real work starts.

If you swapped to a different row variation every week, you'd spend all five weeks in the "figuring it out" phase. You'd feel sore — new movements always produce soreness — but soreness from novelty and soreness from hard training aren't the same thing.

## "Muscle confusion" is a marketing term

The idea that you need to constantly surprise your muscles to make them grow has been a gym myth for decades. Muscles respond to progressive overload — gradually doing more work over time. They don't care whether the exercise is new or familiar. They care whether the demand is increasing.

Repeating the same exercises is how you increase the demand in a measurable way. You did 3 x 12 at 40 lbs last week, you do 3 x 12 at 45 lbs this week. That's progress you can see and track. You can't do that comparison when the exercise changes every session.

## How long is too long?

Scientifically, you could run the same exercises for 8 weeks or longer and keep making progress. The limiting factor usually isn't your muscles — it's your brain. Doing the exact same workout for two months gets tedious, and boredom is a real threat to consistency. If you're dreading the workout because it feels stale, that matters more than whether the program is theoretically optimal.

Your programs run 5 weeks, which is a good balance. Long enough to learn the movements and push the weight up across several sessions. Short enough that you move on before it gets monotonous. When you start your next program block, you'll see new exercises and variations that keep things fresh while still building on what you've developed.

## When it feels boring

If you're in week 4 and the exercises feel repetitive, check your logbook. Are you lifting more than week 1? Hitting more reps? That's the program working. The excitement comes from the numbers moving, not from the novelty of the exercise.

And if the numbers have stalled and you're bored? That's a sign it's time for the next block — which is exactly what a 5-week program is designed for.`,
}

// ---------------------------------------------------------------------------
// Collection 3: Making It Stick
// ---------------------------------------------------------------------------

const makingTheGymEasy: ArticleDef = {
  title: 'Making the Gym Easy to Show Up To',
  slug: 'making-the-gym-easy',
  level: 'beginner',
  readTimeMinutes: 4,
  tags: ['Beginner Basics', 'Mindset'],
  body: `# Making the Gym Easy to Show Up To

Motivation gets you to the gym the first time. Systems get you there the fiftieth time. Here's how to make showing up as friction-free as possible.

## Reduce the decisions

The biggest predictor of whether you'll work out on a given day is how many decisions stand between you and starting. Your program already handles the planning — what exercises, how many sets, what weight range. That's one less thing to figure out. Stack more on top of that.

Pack your gym bag the night before. Put it by the door or in your car. If you go before work, set out your gym clothes so you can put them on without thinking. If you go after work, bring your bag with you so you don't have to stop at home first. Stopping at home is where most gym trips die.

## Attach it to something you already do

Habits stick better when they're linked to an existing routine. "I go to the gym after I drop the kids at school" is more reliable than "I go to the gym three times a week." The trigger is specific and the decision is already made.

Some anchors that work:
- Right after morning coffee, before the day starts
- Straight from work, before going home
- After school or daycare drop-off
- Same time, same days, every week

The specific time matters less than the consistency. Pick a slot and protect it.

## Lower the bar on bad days

Some days you won't feel like going. The instinct is to skip it entirely — "I'll go tomorrow" or "I'm not feeling 100%." Those are valid feelings, but they don't have to be decisions.

On low-motivation days, make a deal with yourself: just go and do the warm-up. Walk on the treadmill for 5 minutes. If you still want to leave after that, leave. Most of the time you'll stay and do the workout. And a mediocre workout still beats no workout for building the habit.

## Track the streak, not the performance

Early on, the most valuable metric isn't how much weight you lifted or how many reps you got. It's how many sessions you showed up for. Three workouts a week for four weeks is twelve sessions. That's a foundation.

The app tracks your workout completions. Watch that number grow. Performance improvements will follow automatically — you can't show up consistently and not get stronger.

Decide once — "I train Monday, Wednesday, Friday at 7am" — and stop re-deciding every week.`,
}

const youreAGymPerson: ArticleDef = {
  title: "You're a Gym Person Now",
  slug: 'youre-a-gym-person',
  level: 'beginner',
  readTimeMinutes: 3,
  tags: ['Mindset'],
  body: `# You're a Gym Person Now

If you've done a handful of workouts, you might not feel like a "gym person" yet. Maybe you look at the regulars — the ones who seem to know exactly what they're doing, who load heavy weights without hesitation, who nod at each other between sets — and think that's a different category of person.

They're not. They just have more reps in.

## The identity shift

There's a difference between "I'm trying to get in shape" and "I'm someone who goes to the gym." The first framing treats gym-going as a temporary project with an endpoint. The second treats it as something you do, like brushing your teeth or making coffee in the morning.

You don't need a certain amount of muscle or a certain number of months under your belt to claim the second framing. You went to the gym and trained. Repeatedly. That makes you someone who goes to the gym.

## There's no prerequisite

Gym culture has a perception problem. Social media shows you the highlight reel — impressive lifts, aesthetic physiques, complex programs. That's the 1%. The actual gym floor at 6am or 5pm is full of normal people doing basic exercises at modest weights and going home.

The 55-year-old doing leg press and cable rows three days a week is a gym person. The college student squatting twice his body weight is a gym person. The parent doing 30-minute sessions during their lunch break is a gym person. Same club, different chapters.

Age, gender, body type, experience level — none of it determines whether you belong. Showing up does.

## Why this matters for consistency

People who see training as part of their identity handle missed workouts differently. A missed day doesn't feel like proof that "this isn't for me." It feels like a scheduling problem to solve. You don't quit brushing your teeth because you forgot one night.

When the novelty wears off — and it will, around week 3-5 — the people who keep going are usually the ones who stopped thinking of it as something they're "trying" and started thinking of it as something they do.

## You earned this

You walked into a place that felt unfamiliar. You figured out the machines. You pushed through soreness and awkwardness and the voice that said you'd look silly. You came back and did it again. That took more effort than it takes the regular who's been going for years on autopilot.

Own it.`,
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Collection 1: Getting Started — linked from beginner primer */
export const GETTING_STARTED_ARTICLES: ArticleDef[] = [
  yourFirstWeek,
  howToReadYourProgram,
  choosingTheRightWeight,
  warmingUp,
  stayingSafe,
  whenToStop,
  gymEtiquette,
]

/** Collection 2: Building Your Foundation — week 2-4 topics */
export const BUILDING_FOUNDATION_ARTICLES: ArticleDef[] = [
  gettingComfortableWithMachines,
  dumbbellBasics,
  restBetweenSets,
  understandingRIR,
  progressiveOverload,
  whyYourProgramRepeats,
]

/** Collection 3: Making It Stick — surfaced after 3-4 workouts */
export const MAKING_IT_STICK_ARTICLES: ArticleDef[] = [
  makingTheGymEasy,
  youreAGymPerson,
]

/** All articles in seed order */
export const ALL_ARTICLES: ArticleDef[] = [
  ...GETTING_STARTED_ARTICLES,
  ...BUILDING_FOUNDATION_ARTICLES,
  ...MAKING_IT_STICK_ARTICLES,
]

/** Collection definitions for seeding */
export const COLLECTIONS = [
  {
    name: 'Getting Started',
    description:
      'Everything you need to know to walk into the gym and start training with confidence.',
    displayOrder: 1,
    articles: GETTING_STARTED_ARTICLES,
  },
  {
    name: 'Building Your Foundation',
    description:
      'Equipment, rest, intensity, and progression. The stuff that clicks after your first week.',
    displayOrder: 2,
    articles: BUILDING_FOUNDATION_ARTICLES,
  },
  {
    name: 'Making It Stick',
    description:
      'How to keep showing up and start seeing yourself as someone who trains.',
    displayOrder: 3,
    articles: MAKING_IT_STICK_ARTICLES,
  },
] as const

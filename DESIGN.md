---
name: Ripit Fitness
description: A strength training tracker styled as a cartridge-era field guide — warm paper, hard stencil type, gameboy-press buttons, frog mascot.
colors:
  background: "#FBF8F3"
  foreground: "#3A2817"
  card: "#FFFCF7"
  muted: "#F5EFE6"
  muted-foreground: "#78573B"
  border: "#D4C4B0"
  input: "#F5EFE6"
  primary: "#10B981"
  primary-hover: "#059669"
  primary-active: "#047857"
  primary-foreground: "#FFFFFF"
  secondary: "#92400E"
  secondary-foreground: "#FEF3C7"
  warning: "#F59E0B"
  warning-foreground: "#3A2817"
  accent: "#D4930A"
  accent-foreground: "#3A2817"
  success: "#10B981"
  success-foreground: "#FFFFFF"
  error: "#DC2626"
  error-foreground: "#FFFFFF"
  background-dark: "#1A1108"
  foreground-dark: "#FEF3C7"
typography:
  display:
    fontFamily: "Rajdhani, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.75rem, 6vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.1em"
  headline:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.08em"
  title:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.05em"
  body:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.02em"
  label:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.05em"
rounded:
  none: "0"
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.none}"
    padding: "12px 24px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
  button-rare-rounded:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.warning-foreground}"
    rounded: "{rounded.md}"
    padding: "16px 32px"
    typography: "{typography.headline}"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "12px 24px"
    typography: "{typography.label}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "12px 24px"
  card-bracketed:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "16px 20px"
  input-stamped:
    backgroundColor: "{colors.input}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
    typography: "{typography.body}"
  badge-clipped:
    backgroundColor: "{colors.success}"
    textColor: "{colors.success-foreground}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
    typography: "{typography.label}"
  bottom-nav:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.none}"
    height: "56px"
---

# Design System: Ripit Fitness

## 1. Overview

**Creative North Star: "The Cartridge-Era Field Guide"**

Ripit is styled as a warm paper field guide a grown-up would reach for to learn a new physical skill, with cartridge-era (NES → SNES → GBA) detailing carried in the geometry, textures, and tactility. The page background is warm cream (`#FBF8F3`) with dark-brown body text (`#3A2817`). Cards sit as flat parchment panels with sharp L-bracket corners. Buttons feel like physical printed buttons that press 4px when you tap them. Headings are uppercase stenciled Rajdhani with positive letter-spacing. The frog mascot is the guide's illustrator's signature — present on the splash and at empty states, never decorating the workout data itself.

The system explicitly refuses three lanes documented in PRODUCT.md: **gym-bro / influencer-culture aesthetics** (no macho neon, no carbon-fiber, no shirtless-influencer photography, no "BEAST MODE" copy); **generic clean-white SaaS** (no Apple-Fitness thin-sans-on-white, no abstract gradients, no `rounded-lg` everywhere); and **stock illustration / beauty-shot photography** (exercise demos are real photos of real people in real gyms).

**Ripit ships twelve named themes** as a first-class personalization feature — a deliberate point of difference from every other fitness app in the category. The colors documented in this spec are the canonical `ripit` default (Donkey-Kong jungle: warm cream, jungle emerald, banana gold, barrel brown). Eleven alternates are user-selectable in settings, ranging from the original DOOM dark/hell-fire-orange aesthetic to ports of well-known developer themes (Catppuccin, Dracula, Synthwave '84, GitHub) to original creations (Cyber, Forest, Clyde, 90s Kid, Blossom) plus OKABE — a peer-shipped color-blind-safe palette. Every theme implements the same CSS-custom-property role schema (`--primary`, `--background`, `--card`, `--accent`, etc.), so every component, named rule, and behavioral pattern in this spec applies *theme-agnostically*. The roles are stable; only the hex values rotate.

The single load-bearing tension is **friendly enough for a gym newcomer + serious enough for an adult who's never trained**. We solve it by keeping the playful retro language in the *chrome around the data* and keeping the *data itself* — sets, reps, weights, history — plain, legible, and trustworthy.

**Key Characteristics:**
- Twelve user-selectable themes, all implementing the same role schema (`ripit` is the canonical default; see Colors §Theme System)
- Warm cream `#FBF8F3` page with rich-brown `#3A2817` text in the default — never `#fff`, never `#000`
- Emerald `#10B981` (DK jungle green) primary; banana gold `#D4930A` accent; barrel brown `#92400E` secondary; DK-tie red `#DC2626` error in the default theme
- Rajdhani everywhere — uppercase with positive letter-spacing for headings/labels, sentence-case for body
- Sharp 0-radius corners by default; rounded corners are a deliberate exception, used as an eye-draw signal
- Cards framed by `doom-corners` L-brackets in primary green
- Buttons press with `doom-button-3d` — 4px hard shadow that translates on `:active`
- Glow and animated pulse reserved for state changes (in-progress, completed, focus), never decorative
- Real photos of real lifters in real gyms — no stock illustration, no studio lighting

### Named Rules

**The Field-Guide-Not-the-Game Rule.** Retro language lives in the geometry, textures, and chrome. The data (sets, reps, weights, history) stays plain, legible, and serious. If a screen reads as "playing a game" rather than "consulting a manual about training," roll it back.

**The Adult-Newcomer Rule.** Two readers have to feel at home: (a) a gym newcomer who's never trained, and (b) an older adult new to the app. Anything that reads as "for kids" or "for gamers" — chunky pixel fonts in the data layer, cartoon mascots inside workout cards, scoreboard-style copy — has failed the test. The frog is allowed on splashes, empty states, and the loading screen; not inside the workout itself.

## 2. Colors

The palette is a warm parchment foundation pulled toward Donkey Kong Country's jungle palette (emerald primary, barrel brown secondary, banana gold accent, DK-tie red for error) — never neon, never carbon fiber, never SaaS blue. **The colors documented in this section are the canonical `ripit` default.** Eleven alternate themes ship with their own palettes; see "Theme System" below for the full set and the role-stability contract that lets every component work across all twelve.

### Theme System

Twelve named themes ship as a first-class user-selectable feature. Each defines a complete palette through the same CSS-custom-property role schema (`--background`, `--foreground`, `--card`, `--muted`, `--border`, `--primary` (+ hover/active/muted), `--secondary`, `--accent`, `--success`, `--warning`, `--error`, plus `*-foreground` text-pair variants and `*-rgb` channel triplets for shadow/glow math). Every theme implements every role in both light and dark mode. The role schema is the contract; components, rules, and behavioral patterns in this spec are written against the schema, not against any particular palette.

| Theme | Character | Lineage |
|---|---|---|
| **ripit** *(default)* | Warm cream + Jungle Emerald + Banana Gold + Barrel Brown | Donkey Kong Country / Battletoads |
| **doom** | Brutal stone-gray + Hell-Fire Orange + Toxic Green + Blood Red | DOOM (1993); the original Ripit aesthetic before the pivot |
| **catppuccin** | Soft pastel "Latte" + mauve/red/teal | Port of [Catppuccin](https://github.com/catppuccin/catppuccin) (MIT) |
| **cyber** | Dark blue-black + Ice Blue text | Original; cyberpunk register |
| **forest** | Warm off-white + Deep Forest Green | Original; outdoor / mountain-cabin register |
| **synthwave** | Magenta + Cyan on midnight | Port of [Synthwave '84](https://github.com/robb0wen/synthwave-vscode) (MIT) |
| **dracula** | Plum-purple + pastel highlights | Port of [Dracula](https://draculatheme.com) (MIT) |
| **github** | Familiar GitHub Primer neutrals | Port of [Primer](https://primer.style) (MIT) |
| **clyde** | Near-black on warm cream | Original; high-contrast editorial |
| **ninety** *(90s KID)* | Light teal tint + deep teal-navy | Original; 1990s Trapper-Keeper-meets-vaporwave |
| **blossom** | Soft Pink / Floral + Deep Plum dark mode | Original; floral / soft / explicitly feminine register |
| **okabe** | [Okabe-Ito](https://jfly.uni-koeln.de/color/) color-blind-safe palette | Original; ships as a *peer* of the default, not an afterthought |

The DOOM, Synthwave '84, Catppuccin, Dracula, and GitHub themes are ports of well-known developer color schemes (their authors and licenses are credited in `docs/STYLING.md`). The rest are original to Ripit. The OKABE theme is the load-bearing accessibility commitment: it ships as a first-class peer of `ripit`, not as a "high contrast" toggle buried in advanced settings, because color-blind users deserve a complete palette designed for them, not a degraded fallback.

This multiplicity is **deliberately a fun-nerdy feature** — fitness apps overwhelmingly ship one palette and call it "modern." Ripit ships twelve and lets the user pick the one that fits their training mood. That's part of the "quirky" personality declared in PRODUCT.md.

### Primary

### Primary
- **Jungle Emerald** (`#10B981`): The single dominant action color. Primary buttons, completed-state borders and gradients, success badges, the `doom-corners` L-bracket frames on cards, focus outlines, "in-progress" success cues. Hovers to `#059669`, presses to `#047857`. Carries 5–15% of any given screen.

### Secondary
- **Barrel Brown** (`#92400E`): The structural support color. Logging-mode header bars (the brown header in the exercise view), secondary buttons, brown-on-cream signage. Reads as printed-ink rather than UI-chrome. Used sparingly to ground compositions when a screen needs gravity.

### Tertiary
- **Banana Gold** (`#D4930A`): The accent color. Reserved for the *rare round-cornered button*, BragStrip stat highlights, "active page" underlines in nav, golden focus-ring outer halo, and the warning state (`#F59E0B` is the warning-action variant). Carries ≤5% of any given screen. Its rarity is the point.

### Neutral
- **Warm Cream** (`#FBF8F3`): Page background. Warmer than `#fff`, tinted toward brown. The parchment.
- **Card Cream** (`#FFFCF7`): Card background — slightly warmer-white, sits visibly on top of the page cream.
- **Warm Tan** (`#F5EFE6`): Muted surface for nested sections and input backgrounds.
- **Rich Brown** (`#3A2817`): Primary body text. Never `#000`. The "ink" of the field guide.
- **Medium Brown** (`#78573B`): Muted/secondary text. For metadata, captions, descriptions.
- **Sandy Brown** (`#D4C4B0`): Standard border and divider color.

### Dark Mode (Night Jungle)
- **Deep Brown** (`#1A1108`): Page background — dark warm brown, never pure black.
- **Warm Cream** (`#FEF3C7`): Foreground — same family as the light-mode page cream, used here as text.
- All other roles maintain hue family from light mode; emerald primary stays `#10B981`, accent shifts to `#FBBF24` golden yellow for dark-bg contrast.

### Named Rules

**The Role-Stability Rule.** Component code, named rules, and screen designs in this spec target *token roles* (`--primary`, `--background`, `--accent`, etc.), never specific hex values. Hard-coding `#10B981` into a component is forbidden; reference `var(--color-primary)` (or the corresponding Tailwind utility class like `bg-primary` / `text-foreground`) so the component renders correctly across all twelve themes. New themes added later inherit the entire component library for free.

**The Warm-Neutrals Rule.** In the canonical `ripit` palette: no `#fff`, no `#000`, no carbon-gray. Every neutral carries warm-brown chroma. The page is cream, the card is cream, the text is brown, the border is sandy. Cold neutrals are a `doom`-theme thing (and `cyber`, and `dracula`, and a few others — separate opt-in palettes) — they don't belong in the canonical `ripit` look.

**The 10% Primary Rule.** The primary role carries roughly 5–15% of any given screen, regardless of theme. It marks actions and active state; it never fills large surface areas. A screen filled with primary has failed the test — whether that primary is `ripit`'s Jungle Emerald, `doom`'s Hell-Fire Orange, or `blossom`'s Hot Pink.

**The Rarity-Is-The-Point Rule.** The accent role appears on ≤5% of any screen and only on elements meant to attract the eye (rare round-cornered CTAs, active-tab underlines). Saturate it across cards or borders and the eye-draw signal collapses — again, theme-agnostic.

## 3. Typography

**Display Font:** Rajdhani (weights 500, 600, 700) — with `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` fallback.
**Body Font:** Rajdhani — same family, same fallback. Rajdhani is used everywhere; there is no separate body face.
**Mono Font:** Geist Mono — loaded but reserved for tabular numerics and code blocks in the Learn tab.

**Character:** Rajdhani is a wide, slightly geometric, semi-condensed sans with a military / stencil / scoreboard heritage. It carries the cartridge-era stenciled-typography promise without crossing into pixel-font territory (which would tip "toy"). The single-family system gives every screen a unified voice; the hierarchy comes entirely from weight, size, casing, and letter-spacing.

### Hierarchy
- **Display** (700, `clamp(1.75rem, 6vw, 2.5rem)`, line-height 1.05, letter-spacing 0.1em, UPPERCASE): Program / page titles ("TRAINING", "WEEK 4 OF 5"). Often shown with `text-shadow` for the stenciled-stamped feel.
- **Headline** (700, 1.5rem, line-height 1.1, letter-spacing 0.08em, UPPERCASE): Section headers and workout-day titles ("DAY 1: MACHINE WORKOUT").
- **Title** (600, 1.125rem, line-height 1.2, letter-spacing 0.05em, UPPERCASE): Card titles, badge labels, button labels.
- **Body** (500, 1rem, line-height 1.5, letter-spacing 0.02em, **sentence case**): Workout descriptions, instructional copy, paragraph text. Cap line length at 65–75ch in long-form (Learn tab).
- **Label** (600, 0.75rem, line-height 1.2, letter-spacing 0.05em, UPPERCASE): Form labels, captions, badge text, nav labels.

### Named Rules

**The UPPERCASE-Stenciled-Headings Rule.** Display, headline, title, and label styles are uppercase with positive letter-spacing (0.05–0.1em). Body and prose stay sentence case. Mixing them produces flat hierarchy; respecting them produces the field-guide voice.

**The Tabular-Numerics Rule.** Any number the user reads to act on (weights, reps, sets, durations, history) renders with `font-variant-numeric: tabular-nums`. Visual alignment of stacked numbers is part of the trust contract.

**The No-Decorative-Type Rule.** No gradient text. No outlined letters. No animated character reveals on workout data. Rajdhani's own weight and tracking carries all the expression we need. (See the cross-register absolute ban on gradient text.)

## 4. Elevation

This system is a **hybrid**: flat by default, with two specific lifts that earn their depth.

The first lift is the **gameboy press** on primary buttons (`doom-button-3d`): a 4px hard offset shadow in the primary's `--primary-active` darker shade, plus a soft ambient drop-shadow underneath, plus an inset top-edge highlight to fake plastic curvature. On `:hover`, an outer glow in the primary RGB at 60% opacity adds emphasis without changing the press geometry. On `:active`, the button `translateY(4px)` and the hard offset shadow collapses to zero — the button "presses in" tactilely. This is the core arcade-cabinet feedback that makes the app feel physical.

The second lift is **glow-on-state** on cards: at rest, cards are flat parchment panels with sandy-brown borders and L-bracket corner accents. On state change, an outer box-shadow in the relevant role color (success-green for completed, warning-amber for in-progress) appears, often paired with a gradient overlay across the surface. The pulse animation (`doom-pulse`) modulates this glow on in-progress workouts.

The third treatment — the bracketed card frame itself (`doom-corners`) — is **not elevation** in the shadow sense. It's a structural frame applied via two pseudo-elements drawing 16×16px L-brackets in the corners. It signals "this is a contained, addressable region" without lifting the surface off the page. Cards stay flat in their plane.

### Shadow Vocabulary

- **Button 3D press** (`box-shadow: 0 4px 0 var(--primary-active), 0 6px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)`): Default primary-button rest state.
- **Button hover glow** (`box-shadow: 0 4px 0 var(--primary-active), 0 0 30px rgba(var(--primary-rgb), 0.6), inset 0 1px 0 rgba(255,255,255,0.3)`): Primary button on `:hover`.
- **Button pressed-in** (`box-shadow: 0 0 0 var(--primary-active), 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)`): Primary button on `:active` with `translateY(4px)`.
- **Completed card** (`box-shadow: 0 0 20px rgba(var(--success-rgb), 0.3), inset 0 1px 0 rgba(var(--success-rgb), 0.1)`): Card with workout-complete state.
- **In-progress card** (animated, oscillating between 20px and 40px outer glow in warning RGB): Card with workout-in-progress state.
- **Focus ring** (`box-shadow: 0 0 0 3px var(--background), 0 0 0 6px var(--primary), 0 0 20px rgba(var(--primary-rgb), 0.6)`): Keyboard focus on any interactive element.

### Named Rules

**The Flat-Until-State Rule.** Cards and surfaces are flat at rest. Shadows and glows arrive only as a response to state — hover, focus, in-progress, completed. No ambient drop-shadows on resting surfaces. Decorative shadow is forbidden.

**The Press-Means-Press Rule.** Primary buttons must `translateY(4px)` on `:active` and collapse their offset shadow to zero. The tactile feedback is load-bearing — it's how a button reads as a *physical thing* rather than a styled `<div>`. Skipping this treatment on a primary button is a regression.

## 5. Components

### Buttons

The default button is the **gameboy-pressed primary**: solid emerald background, white uppercase Rajdhani label, hard 0-radius corners, 4px offset hard-shadow that collapses on `:active`. Hover adds an outer emerald glow at 60% RGB opacity.

- **Shape:** Sharp 0-radius corners by default. Eye-draw exception: rounded `12px` only on rare, deliberately-highlighted CTAs (e.g. the PWA install button, the primary CTA at the end of a long flow). Rounded buttons must be paired with the gold accent or a shimmer animation — never used silently.
- **Primary:** Emerald `#10B981` background, white text, padding `12px 24px`, uppercase Rajdhani 600 with 0.05em letter-spacing. Hover → `#059669` + outer emerald glow. Active → `#047857` + `translateY(4px)` + collapsed shadow.
- **Secondary:** Warm-tan `#F5EFE6` background, brown text. Same shape, no 3D press treatment. For non-primary actions inside a flow.
- **Ghost:** Transparent background, brown text, no border at rest. Hover adds warm-tan background fill. For tertiary actions, especially inside modals.
- **Outline:** 2px sandy-brown border, transparent background, brown text. Used in form contexts where ghost would feel too light.
- **Rare-rounded CTA:** Banana gold `#F59E0B` background, brown text, `rounded-md` (8px) or `rounded-lg` (12px), often paired with a slow shimmer animation. Used at most once per screen, deliberately.

### Cards (Bracketed Panels)

- **Corner Style:** Sharp 0-radius. Two 16×16px L-bracket pseudo-elements applied via the `doom-corners` utility — top-left and bottom-right, drawn in the primary emerald at 3px stroke. This is the signature card frame.
- **Background:** Card cream `#FFFCF7` on top of the warm-cream page. Visible separation despite both being cream-family.
- **Border:** 1px or 2px sandy brown `#D4C4B0` at rest. Border color shifts to the state role color (success-green, warning-amber, error-red) when the card carries state.
- **Internal Padding:** `16px 20px` baseline; `24px` for larger panels.
- **Texture (optional):** The `doom-noise` utility overlays a low-opacity (≈3%) SVG fractal noise pattern on the surface to give the parchment its paper grain. Apply on hero panels and modal surfaces, skip on dense list items.

### Inputs

- **Shape:** Sharp 0-radius. 2px sandy-brown border at rest. Warm-tan `#F5EFE6` background.
- **Padding:** `12px 16px`.
- **Focus:** Border shifts to emerald primary `#10B981`, outer 20px emerald glow at 30% opacity, background shifts to card-cream. The transition is 0.3s ease.
- **Placeholder:** UPPERCASE Rajdhani at 0.875rem with 0.05em letter-spacing, muted-brown color. Placeholders themselves carry the field-guide voice.
- **Error State:** Border shifts to DK-tie red `#DC2626`; helper text in red sits 4px below.

### Badges (Status Chips)

- **Shape:** Hard 0-radius. Uses a `clip-path: polygon()` for a subtle parallelogram chamfer (4px off the top-left and bottom-right corners) — the same shape language as the bracketed cards, in chip form.
- **Style:** Solid background in the state role color, light text, uppercase Rajdhani 700 at 0.75rem with 0.1em letter-spacing.
- **Completed:** Emerald background, white text, soft outer glow.
- **In-progress:** Banana-gold background, brown text, slow pulse animation.
- **Skipped / inert:** Barrel-brown background, cream text.

### BottomNav (Mobile-First)

Fixed bottom nav at `md:hidden` breakpoint. Four tabs: Training, Programs, Learn, Settings, each rendered as icon-above-label, ~14px label in `text-[11px] font-medium`. Active tab text shifts to banana-gold accent (`text-accent`) with a 3px golden underline (`border-bottom: 3px solid #FBBF24`). Inactive tabs use muted-brown text. Container is warm-tan with a 2px top border and a backdrop blur. Honors `env(safe-area-inset-bottom)` for iOS PWAs.

### TopNav (Desktop)

Hidden below `md`. Logo + nav links + theme selector + user menu in a flat warm-card-cream bar with sandy-brown bottom border. Links are uppercase Rajdhani at 0.875rem with `tracking-wider` (0.05em+). Active link gets a 2px banana-gold bottom underline.

### Signature Component: The Workout Card

A card-bracketed panel listing a workout day. Title in uppercase Rajdhani 700 ("DAY 1: MACHINE WORKOUT"). Exercise count + date in medium-brown body type below. A completed-state badge (clipped chip) on the right edge. The card's left and right vertical edges carry a subtle 4px-wide vertical brown strip (`border-l-4` in `secondary` color) only when the card is the *current* workout — never decoratively. Tapping the card slides into the logging view.

## 6. Do's and Don'ts

### Do:

- **Do** default to sharp 0-radius corners on every element. Cards, buttons, inputs, modals, badges — hard edges are the system's default voice.
- **Do** use rounded corners as a *rare* eye-draw signal — primarily the PWA install button, the occasional end-of-flow CTA, and indicator pills meant to interrupt the visual rhythm. Their incongruence is the signal.
- **Do** apply `doom-corners` L-brackets to addressable card regions in the primary emerald. The frame is the brand.
- **Do** keep numbers in `font-variant-numeric: tabular-nums` so logged sets stack cleanly.
- **Do** translate primary buttons `4px` on `:active` and collapse their offset shadow. The press is load-bearing.
- **Do** keep the warm-brown chroma in every neutral (`#FBF8F3` cream, `#3A2817` brown, `#D4C4B0` sandy border) — even at scale.
- **Do** use real photos of real lifters in real gyms for exercise demonstrations.
- **Do** reserve glow and pulse animations for *state changes* — completed, in-progress, focused, just-logged — never decoratively on resting surfaces.
- **Do** use UPPERCASE Rajdhani with 0.05–0.1em letter-spacing on every title, label, and button. Reserve sentence case for body and prose.
- **Do** preserve the OKABE color-blind-safe theme as a peer of the default — never an afterthought.
- **Do** reference token roles (`var(--color-primary)`, `bg-primary`, `text-foreground`) instead of hex values in component code. The twelve-theme contract requires it.

### Don't:

- **Don't** use macho-neon palettes, carbon-fiber backgrounds, shirtless-influencer photography, or "BEAST MODE" copy. The system explicitly rejects gym-bro and influencer-culture aesthetics (PRODUCT.md, Anti-references §1).
- **Don't** make Ripit look like Apple Fitness, Centr, or Peloton's app — generic clean-white SaaS with thin sans on `#fff`, blue accents, abstract gradients, and `rounded-lg` everywhere is the second lane we refuse (PRODUCT.md, Anti-references §2).
- **Don't** use stock illustration, mascots-doing-yoga vectors, or studio-lit beauty photography for exercise demos. Real people, real gyms, or nothing (PRODUCT.md, Anti-references §3).
- **Don't** use pure `#000` or `#fff` anywhere. The neutrals carry warm-brown chroma.
- **Don't** put rounded corners on cards, inputs, or the workout-list items. Round is reserved.
- **Don't** put gradient text on headings. Rajdhani's weight and tracking carries all the expression we need.
- **Don't** use side-stripe `border-left` or `border-right` accents greater than 1px as a colored stripe on cards or list items as decoration. The 4px secondary-brown strip on the *current* workout card is the only allowed use; everywhere else it's banned.
- **Don't** apply ambient drop-shadows to cards at rest. Shadows arrive with state.
- **Don't** drop the frog mascot inside workout data. The frog belongs on splash, empty states, and the loading screen. Never on a logged set.
- **Don't** game-ify the data layer — no XP bars, no streak fireworks, no scoreboard styling on weights. The Field-Guide-Not-the-Game Rule governs every screen.
- **Don't** use em dashes (—) in UI copy. Use commas, colons, semicolons, or periods. (And not `--` either.)
- **Don't** mock up new components in `rounded-lg` "because it looks clean." Hard edges are the default; cleanness is not the brand goal.
- **Don't** hard-code hex values into components. Reference token roles instead. Hard-coded hex breaks the twelve-theme contract — see The Role-Stability Rule.

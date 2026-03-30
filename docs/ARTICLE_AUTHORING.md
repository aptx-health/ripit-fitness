# Article Authoring Guide

Reference for writing and formatting articles in the Learn tab. Articles are stored as markdown in the database and rendered with `react-markdown` + `remark-gfm` + `rehype-raw`.

## Markdown Features

Standard markdown plus GitHub-Flavored Markdown (tables, strikethrough, task lists) is supported. Raw HTML is also supported via `rehype-raw`, which enables layout control beyond what plain markdown offers.

## Layout Patterns

### Image Sizing

Markdown `![alt](url)` renders full-width. Use HTML for specific sizes:

```html
<img src="/path/to/image.jpg" alt="Bench press form" width="400" />
```

### Image with Text Wrap

Float an image so body text wraps around it:

```html
<img src="/path/to/image.jpg" alt="Squat depth" width="250" style="float: right; margin: 0 0 1rem 1rem;" />

Your paragraph text here wraps around the image naturally. This works well
for form cues or equipment photos that accompany explanatory text.
```

Use `float: left` with `margin: 0 1rem 1rem 0` for left-aligned images.

**Clear the float** after the wrapping section if needed:

```html
<div style="clear: both;"></div>
```

### Side-by-Side Comparison

Two images or content blocks next to each other:

```html
<div style="display: flex; gap: 1rem; margin: 1rem 0;">
  <div style="flex: 1;">
    <img src="/good-form.jpg" alt="Correct form" width="100%" />
    <p><strong>Correct:</strong> Neutral spine, chest up</p>
  </div>
  <div style="flex: 1;">
    <img src="/bad-form.jpg" alt="Incorrect form" width="100%" />
    <p><strong>Incorrect:</strong> Rounded back, head down</p>
  </div>
</div>
```

### Callout / Highlight Box

Draw attention to safety tips, key points, or warnings:

```html
<div style="border-left: 3px solid var(--primary); padding: 0.75rem 1rem; margin: 1rem 0; background: var(--muted);">

**Key Point:** Always brace your core before initiating the lift. This applies to every compound movement, not just squats and deadlifts.

</div>
```

For warnings, use a red accent:

```html
<div style="border-left: 3px solid #ef4444; padding: 0.75rem 1rem; margin: 1rem 0; background: var(--muted);">

**Warning:** Never sacrifice form for heavier weight. If you can't maintain proper technique, reduce the load.

</div>
```

### Centered Content

Center a single image, caption, or block:

```html
<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/diagram.jpg" alt="Muscle groups" width="500" />
  <p style="font-size: 0.8rem; color: var(--muted-foreground); margin-top: 0.5rem;">Primary muscles targeted in the conventional deadlift</p>
</div>
```

### Compact Table Alternative

For simple key-value data where a full GFM table feels heavy:

```html
<dl style="display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 1rem; margin: 1rem 0;">
  <dt><strong>Sets</strong></dt><dd>3-4</dd>
  <dt><strong>Reps</strong></dt><dd>8-12</dd>
  <dt><strong>Rest</strong></dt><dd>60-90 seconds</dd>
  <dt><strong>RPE</strong></dt><dd>7-8</dd>
</dl>
```

## Styling Notes

- The article body renders inside a `.prose-learn` container (see `app/globals.css`)
- Use CSS variables (`var(--primary)`, `var(--muted)`, `var(--border)`, `var(--foreground)`, `var(--muted-foreground)`) for theme-aware colors
- Avoid hardcoded colors except for semantic meaning (red for warnings, green for success)
- Images from MinIO use URLs from the media uploader in the admin panel
- Max content width is `max-w-2xl` (672px) — images wider than this will be constrained

## Writing Style

Articles are fitness education content for people who are new to or progressing in strength training. Write clearly and directly.

### Voice and Tone

- Write in second person ("you") when giving instructions
- Be direct. State the thing, then explain why if needed
- Assume the reader is motivated but may lack context — explain the "why" without being condescending
- Use concrete numbers and examples over vague guidance ("rest 2-3 minutes between heavy sets" not "rest adequately")

### AI Writing Tropes to Avoid

When using AI to draft or edit articles, watch for and remove these patterns:

#### Word choice
- **Magic adverbs**: "quietly", "deeply", "fundamentally", "remarkably". Cut them.
- **"Delve" and friends**: "delve", "utilize", "leverage", "robust", "streamline", "harness". Use plain words.
- **Grandiose nouns**: "tapestry", "landscape", "paradigm", "synergy", "ecosystem". Say what you mean.
- **"Serves as" dodge**: Replacing "is" with "serves as", "stands as", "marks", "represents". Just use "is".

#### Sentence structure
- **Negative parallelism**: "It's not X -- it's Y." One per article max. Ten is insulting.
- **Dramatic countdown**: "Not X. Not Y. Just Z."
- **Self-answered questions**: "The result? Devastating." Nobody asked.
- **Anaphora abuse**: "They could expose... They could offer... They could provide..." Vary your openings.
- **Tricolon abuse**: Groups of three are fine. Five back-to-back tricolons are not.
- **Filler transitions**: "It's worth noting", "Importantly", "Interestingly", "Notably". Delete them.
- **Superficial "-ing" analysis**: "highlighting its importance", "reflecting broader trends", "underscoring its role". These say nothing.
- **False ranges**: "From X to Y" where X and Y aren't on a real scale.

#### Paragraph structure
- **Short punchy fragments**: One-sentence paragraphs for fake emphasis. "Platforms do." Don't.
- **Listicle in a trench coat**: "The first takeaway... The second takeaway... The third takeaway..." Just use a list or write real paragraphs.

#### Tone
- **"Here's the kicker"**: False suspense. Also "Here's the thing", "Here's where it gets interesting".
- **Patronizing analogies**: "Think of it as a highway for data." If the concept is clear, skip the metaphor.
- **"Imagine a world where..."**: Don't open with this. Ever.
- **False vulnerability**: "And yes, I'm openly in love with..." Performative honesty is worse than none.
- **"The truth is simple"**: If you have to say it's obvious, it isn't.
- **Stakes inflation**: Not everything is "fundamentally reshaping how we think about everything."
- **"Let's break this down"**: Don't narrate your own structure. Just write it.
- **Vague attributions**: "Experts say", "Industry reports suggest". Name the source or cut the claim.
- **Invented labels**: "The supervision paradox", "the acceleration trap". If it's not an established term, don't coin one.

#### Formatting
- **Em-dash addiction**: 2-3 per article is fine. 20 is AI slop.
- **Bold-first bullets**: Not every list item needs a bold keyword prefix.
- **Unicode arrows**: Use `->` not `→`. Write like someone typing, not typesetting.

#### Composition
- **Fractal summaries**: Don't introduce what you're about to say, then summarize what you said.
- **Dead metaphors**: Don't use the same metaphor 10 times. Use it once, move on.
- **Historical analogy stacking**: "Apple didn't build Uber. Facebook didn't build Spotify." Stop.
- **One-point dilution**: One argument restated 10 ways is still one argument. Keep it tight.
- **Signposted conclusions**: "In conclusion..." The reader knows it's the end. Just end.
- **"Despite its challenges..."**: Acknowledging problems only to immediately dismiss them.

**The rule**: Any of these used once might be fine. Multiple tropes together or repeated use of one is the problem. Write varied, imperfect, specific prose.

Source: [tropes.fyi](https://tropes.fyi)

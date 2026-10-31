# Training page: 3 directions (050)

Rough static mockups at 390px, in the default Ripit theme (colours, Rajdhani and `doom-*` styles from `DESIGN.md` and `app/globals.css`). They use the data from the wt2 preview. The sections and their order are the same in all three: Coach Suggestions (3), Up Next, Pinned (2), Recent (3), Current Program.

| File | What |
|---|---|
| `current.png` | Today's page, from `assets/048/training-suggestions-many.png` |
| `mockup-a.html` / `.png` | A: Folder tabs |
| `mockup-b.html` / `.png` | B: Hero and quiet lists |
| `mockup-c.html` / `.png` | C: Do now / Your stuff |

The bottom nav sits at the end of each page so it shows once in a full-page shot; in the app it stays fixed. No app code was changed.

## A: Folder tabs

Every section is a folder: a tab with the section name sticks up from the top-left of its card, and the tab carries the colour.

**Headers:** tabs at 15px, bold, with an icon and a count. They read as places to go, like the folder tabs Dustin described.

**Suggestion card:** it sits in a gold "From your coach · 3" folder with "Your coach suggests" and a stamped "Waiting on you". The newest shows a type chip (WORKOUT), its title, the coach's reason as a quote, and a gold "Review suggestion" button. The other two are rows below, each with a gold pending dot and a type label.

**Hierarchy:** only two tabs are filled: gold for the coach and green for Up Next. Pinned, Recent and Current Program get quiet tan tabs, so the eye goes to "what needs me" and "what's next" first.

**Trade-off:** every section is still a boxed card, so the page stays about as long as today and the lower half is still a stack of boxes, just better labelled.

## B: Hero and quiet lists

One loud thing, Up Next, and everything below it calms down. The coach's suggestions arrive as mail.

**Headers:** the lower sections drop their boxes. Each gets a large plain title (20px) on a heavy rule with flat ruled rows, like a field guide's chapter heads. A one-line status sits under the page title ("3 suggestions waiting, workout ready").

**Suggestion card:** an envelope ("From your coach", with an envelope icon, a faint flap, and two letters stacked behind). It shows a "● Waiting on you" badge, the type and size, the title, the reason as a letter, "Suggested today by your coach", and Review. The other two are summarised as "+2 more" with a link.

**Hierarchy:** Up Next is a brown hero with a big name and a large Start button, so it is clearly the main action. Pinned, Recent and Current Program are quiet text lists with small green action links.

**Trade-off:** it moves furthest from Dustin's tab idea, and the other two suggestions collapse into one line, so a program suggestion is easy to miss until you open the list.

## C: Do now / Your stuff

The page splits into two zones with full-width banded headers, like the Library's segmented control. Inside, sections get medium headers with count pills, and the "Your stuff" sections can collapse.

**Headers:** two levels. The zone bands are big: "DO NOW" in green, "YOUR STUFF" in tan. The section headers inside them are 16px bold with a count pill. Pinned, Recent and Current Program collapse (`<details>`); Recent is shown collapsed with "Last: Full Body, Oct 24".

**Suggestion card:** a coach's clipboard (a brown clip on top, "From your coach · 3 waiting on you"). All three suggestions are listed with a type tag and a "Needs your review" status. The newest is expanded with its reason and Review.

**Hierarchy:** the zones answer "what should I do?" (suggestions and Up Next) before "what do I have?". Collapsing lets Dustin hide sections he doesn't use, and the page gets shorter.

**Trade-off:** it adds the most structure: two header levels, pills and collapse state that has to be remembered per user. That's the furthest from "calm", and collapse needs real JS and storage in the app.

## Recommendation

**A, borrowing B's flat lists for the bottom three sections.**

A answers both of Dustin's asks directly. The tabs make the sections read as places, and the gold folder plus "Your coach suggests" and "Waiting on you" makes a suggestion unmistakable, with all three still visible.

The coloured-versus-quiet tabs give the hierarchy without new structure. If the lower half still feels like a stack of boxes, drop the boxes under the quiet tabs (B's ruled rows) and keep the tabs.

It is also the cheapest to build: a tab header component and a restyled suggestion card. No new state is needed.

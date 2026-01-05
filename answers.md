1. Wizard: I think we should collect basic info in a form like page: Name, Type (just strength for now), Notes [No week count]
- That creates the program placeholder. Then the user can add a week. To the week they can add workouts and to workouts exercises. They can duplicate days and/or weeks.
- No prepopulation. No default week count. It's all open ended and built up from scratch.

2. Library and Search UX
- Yeah we can start with search. That way we can go through aliases too.
- I'm thinking about how this'd be displayed.. I guess it'd be a modal. Say the user clicks "add exercise" in a workout. 
Then they can do a search or filter based on Functional Aesthetic Units. Clicking on an exercise will open a quick preview with the name, primary and secondary muscles, and MAYBE a visual indicator. Not as important.
- No suggestions at this point
- CUSTOM EXERCISE is an important item to consider. It's basically allowing a user to create a new item in the exercise library and there may be overlap with the built-ins. Also we need to think about how this form would look. So maybe table this for later?

3. Week Building
- Auto generate names to default to Day 1, 2, etc. but the user should be able to modify each day's name
- They shoudl be able to duplicate a workout between weeks.
- No templates at this point.

4. Mscle Group Viz
- I think we show this in the program creation/management dashboard for the selected/focused week. That way we can quickly get an idea of the volume distribution
- Granular down to the functional aesthetic unit. Not down to the muscles. So we'll need to define these units ahead of time.
- No warnings.
- Yes real time updates

5. Week Duplication
- There is no "complete" for a week. A week can be copied as long as it has one workout with one exercise.
- Yes duplicate everything
- No workflows right now

6. Mobile
- I think we should focus on desktop browser for building programs. However, quick modifications of existing workouts. Like changing out one exercise could be doable in mobile. I just don't want to build out the mobile version for program creation.
- If we don't go mobile, it might mean the Wizard isn't as necessary. It'd just be a form with week creations, etc.

Single page might make sense in the context of the desktop browser.
I guess modal for exercise selection
I think a realtime sidebar for muscle visualization makes sense
Progressive validation

V1 should focus on simplicity with the ability to build out from there. We can break this up so it's not all in one effort!
Blank slate! for now
I think we've gotta hae muscle groups (FAUs) ready so we can do the volume measurements per FAU. So I think we'll have what we need to filter.
Yes! Build basic first.

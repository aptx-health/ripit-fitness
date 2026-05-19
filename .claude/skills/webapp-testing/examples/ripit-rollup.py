"""Drive a freestyle workout to surface the post-workout rollup modal.

Example of using the webapp-testing skill against Ripit Fitness specifically.
See docs/PLAYWRIGHT_RECIPES.md for the full reference.

Usage:
    uv run --with playwright python .claude/skills/webapp-testing/examples/ripit-rollup.py
"""

from playwright.sync_api import sync_playwright

# Query the local DB if this id rots: SELECT id, name FROM "ExerciseDefinition" WHERE name ILIKE '%bench%';
EX_DEF = 'cmiz7vjju0000vr0m4b1o6bec'  # Barbell Bench Press


def run() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={'width': 390, 'height': 844})
        page = ctx.new_page()

        # 1. Login (session cookies attach to ctx.request from here on)
        page.goto('http://localhost:3700/login')
        page.wait_for_load_state('networkidle')
        page.fill('#email', 'dmays@test.com')
        page.fill('#password', 'password')
        page.click('button:has-text("Sign in")')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500)

        # 2. Seed a draft + one exercise + one set via API (faster than UI)
        r = ctx.request.post('http://localhost:3700/api/workouts/adhoc')
        if r.status == 409:
            # Existing draft — re-use it
            completion_id = r.json()['draft']['completionId']
        else:
            completion_id = r.json()['completion']['id']
        print(f'Draft: {completion_id}')

        r = ctx.request.post(
            f'http://localhost:3700/api/workouts/adhoc/{completion_id}/exercises',
            data={'exerciseDefinitionId': EX_DEF, 'name': 'Barbell Bench Press'},
        )
        ex_id = r.json()['exercise']['id']

        ctx.request.post(
            f'http://localhost:3700/api/workouts/adhoc/{completion_id}/sets',
            data={
                'exerciseId': ex_id,
                'setNumber': 1,
                'reps': 5,
                'weight': 135,
                'weightUnit': 'lbs',
            },
        )

        # 3. Navigate to the logger and finish the workout (rollup is set in
        #    component state on completion — no direct URL).
        page.goto(f'http://localhost:3700/training/adhoc/{completion_id}')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500)

        page.locator('button:has-text("Finish")').click()
        page.wait_for_timeout(500)
        page.locator('button:has-text("Confirm")').click()
        page.wait_for_timeout(3000)

        # 4. Scroll modal to bottom so the footer is in frame
        page.evaluate("""() => {
            const cs = document.querySelectorAll('[class*="overflow"]');
            for (const c of cs) {
                if (c.scrollHeight > c.clientHeight) c.scrollTop = c.scrollHeight;
            }
        }""")
        page.wait_for_timeout(400)

        page.screenshot(path='/tmp/ripit-rollup.png', full_page=False)
        print('Screenshot: /tmp/ripit-rollup.png')

        browser.close()


if __name__ == '__main__':
    run()

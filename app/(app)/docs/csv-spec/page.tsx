import Link from 'next/link'

export default function CsvSpecPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/programs"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Programs
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 prose prose-blue max-w-none">
          <h1>CSV Import Format Guide</h1>

          <h2>Overview</h2>
          <p>
            FitCSV imports strength training programs from standard CSV files. The format is designed to work seamlessly with Excel, Google Sheets, and any text editor.
          </p>

          <h2>Required Columns</h2>
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>Description</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>week</code></td>
                <td>Integer</td>
                <td>Week number in program</td>
                <td>1, 2, 3</td>
              </tr>
              <tr>
                <td><code>day</code></td>
                <td>Integer</td>
                <td>Day number within week</td>
                <td>1, 2, 3</td>
              </tr>
              <tr>
                <td><code>workout_name</code></td>
                <td>String</td>
                <td>Name of the workout</td>
                <td>Upper Power, Push Day</td>
              </tr>
              <tr>
                <td><code>exercise</code></td>
                <td>String</td>
                <td>Exercise name</td>
                <td>Bench Press, Squat</td>
              </tr>
              <tr>
                <td><code>set</code></td>
                <td>Integer</td>
                <td>Set number</td>
                <td>1, 2, 3</td>
              </tr>
              <tr>
                <td><code>reps</code></td>
                <td>String</td>
                <td>Target reps (number or range)</td>
                <td>5, 10, 8-12</td>
              </tr>
              <tr>
                <td><code>weight</code></td>
                <td>String</td>
                <td>Target weight</td>
                <td>135lbs, 60kg, bodyweight</td>
              </tr>
            </tbody>
          </table>

          <h2>Optional Columns</h2>
          <p>These columns are auto-detected if present:</p>
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>Description</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>rir</code></td>
                <td>Integer</td>
                <td>Reps in Reserve (0-5)</td>
                <td>2, 1, 0</td>
              </tr>
              <tr>
                <td><code>rpe</code></td>
                <td>Integer</td>
                <td>Rate of Perceived Exertion (1-10)</td>
                <td>7, 8, 9</td>
              </tr>
              <tr>
                <td><code>notes</code></td>
                <td>String</td>
                <td>Exercise-specific notes</td>
                <td>Pause at bottom</td>
              </tr>
              <tr>
                <td><code>exercise_group</code></td>
                <td>String</td>
                <td>Groups exercises for supersets</td>
                <td>A, B, C</td>
              </tr>
            </tbody>
          </table>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
            <p className="text-sm font-semibold text-yellow-800 mb-1">Important:</p>
            <p className="text-sm text-yellow-800 m-0">
              Use either <code>rir</code> OR <code>rpe</code>, not both in the same CSV file.
            </p>
          </div>

          <h2>Example: Basic Program</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            <code>{`week,day,workout_name,exercise,set,reps,weight
1,1,Push Day,Barbell Bench Press,1,8-12,135lbs
1,1,Push Day,Barbell Bench Press,2,8-12,135lbs
1,1,Push Day,Barbell Bench Press,3,8-12,135lbs
1,1,Push Day,Overhead Press,1,10,65lbs
1,1,Push Day,Overhead Press,2,10,65lbs
1,2,Pull Day,Barbell Row,1,8-12,95lbs
1,2,Pull Day,Barbell Row,2,8-12,95lbs
1,2,Pull Day,Barbell Row,3,8-12,95lbs`}</code>
          </pre>

          <h2>Example: With RIR and Supersets</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            <code>{`week,day,workout_name,exercise,set,reps,weight,rir,exercise_group
1,1,Upper,Bench Press,1,8-12,135lbs,2,
1,1,Upper,Bench Press,2,8-12,135lbs,2,
1,1,Upper,Pull-ups,1,8,bodyweight,2,A
1,1,Upper,Dips,1,10,bodyweight,2,A
1,1,Upper,Pull-ups,2,8,bodyweight,2,A
1,1,Upper,Dips,2,10,bodyweight,2,A`}</code>
          </pre>

          <h2>Exercise Name Matching</h2>
          <p>
            FitCSV automatically matches exercise names to a built-in exercise library:
          </p>
          <ol>
            <li>
              <strong>Exact match:</strong> Checks for exact name match (case-insensitive)
              <br />
              Example: &quot;Barbell Bench Press&quot; matches system exercise
            </li>
            <li>
              <strong>Alias match:</strong> Checks against common aliases
              <br />
              Example: &quot;Bench Press&quot;, &quot;bench&quot;, &quot;flat bench&quot; all match &quot;Barbell Bench Press&quot;
            </li>
            <li>
              <strong>Auto-create:</strong> Unknown exercises are automatically added as custom exercises
              <br />
              Example: &quot;My Custom Exercise&quot; creates a new exercise definition
            </li>
          </ol>

          <h2>Validation Rules</h2>
          <ul>
            <li><code>week</code>: Must be positive integer (≥ 1)</li>
            <li><code>day</code>: Must be positive integer (≥ 1)</li>
            <li><code>workout_name</code>: Cannot be empty</li>
            <li><code>exercise</code>: Cannot be empty</li>
            <li><code>set</code>: Must be positive integer (≥ 1)</li>
            <li><code>reps</code>: Must be a positive integer (e.g., 10) or a range (e.g., 8-12)</li>
            <li><code>weight</code>: Cannot be empty</li>
            <li><code>rir</code>: If present, must be integer 0-5</li>
            <li><code>rpe</code>: If present, must be integer 1-10</li>
          </ul>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
            <p className="text-sm font-semibold text-blue-800 mb-2">💡 Tips:</p>
            <ul className="text-sm text-blue-800 space-y-1 m-0">
              <li>Program name is automatically derived from the filename</li>
              <li>Exercises with the same <code>exercise_group</code> value are performed as supersets</li>
              <li>Rep ranges (e.g., 8-12) give you flexibility during workouts</li>
              <li>Your last performance for each exercise is shown when logging workouts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

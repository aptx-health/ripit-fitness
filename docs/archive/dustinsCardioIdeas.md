# Dustin's Cardio Ideas

## Overview
Looking to add cardio training to the strength training application, but don't want a Strava clone. Focus on simplicity and utility without intense biometrics, routes, or social components.

## Core Concept
- Program-based approach: types of workouts, duration, intensity ratings/markers
- Calendar view (month + week) showing prescribed cardio
- Simple, straightforward data entry tailored to cardio type

## Example Logging Scenarios

### Standard Cardio
- Exercise bike (machine)
- Duration
- Calories (optional)
- Watts (optional)
- Average HR (optional)
- Peak HR (optional)

### HIIT Cardio
- Airbike (machine)
- Duration
- Total watts (optional)
- Max duration time (how much time spent all-out sprinting)
- Peak HR (optional)
- Average HR (optional)

## Calendar View Requirements
- Month or week view
- Show both strength workouts and cardio workouts with details
- Examples: "Push strength" (from active program), "Cardio Zone 2"
- **Important**: Pulling from current workout programs should be optional
- Want ability to manually type in calendar entries without tying to program
- Need flexibility to skip workouts, switch cardio/strength, or do deload days

## Design Goals
1. Prescribed cardio and logged cardio data tables should align well with strength training model
2. Logical layout that could support future LLM-assisted program development
3. Logical layout that could support future LLM-assisted logged-data analysis

## What We DON'T Want
- Strava clone
- Intense biometrics
- Route tracking
- Social components

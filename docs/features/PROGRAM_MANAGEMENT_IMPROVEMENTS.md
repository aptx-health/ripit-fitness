# Program Management Improvements

**Status**: Planning
**Priority**: High (immediate value for daily usage)
**Created**: 2026-01-15
**Updated**: 2026-01-15

## Overview

This document outlines improvements to program creation and management workflows in FitCSV. These changes focus on backend/API improvements and desktop UX enhancements that will transfer to the upcoming Expo mobile app.

## Strategic Context

**Next Major Initiative**: Expo/React Native mobile app

**This Phase Goal**: Build reusable backend logic and improve desktop experience. Avoid web-specific mobile polish that won't transfer to React Native.

**Work Classification**:
- ✅ **Do Now**: Backend APIs, desktop UX improvements
- ⏸️ **Defer to Expo**: Mobile-specific web optimizations (gestures, layout polish)

## Key Changes

### 1. Remove CSV Import
- **Rationale**: Moving away from CSV-based workflow
- **Scope**: Remove all CSV parsing code, routes, and UI
- **Files affected**:
  - `/lib/csv/*`
  - CSV import routes
  - CSV upload UI components

### 2. Set Duplication Feature
- **Current**: Manually create each set with same parameters
- **New**: First set has a "+" button that duplicates it
- **Behavior**: Copies reps, weight, RIR/RPE from previous set
- **Edit**: User can modify duplicated set values inline

### 3. Week Controls Consolidation
- **Current**: Multiple buttons scattered
- **New**: Hamburger menu with organized actions
- **Actions**:
  - Add Workout (keep as primary button)
  - Delete Week (requires confirmation modal)
  - Duplicate Week (appends to end of program)

### 4. Workout Controls Consolidation
- **Current**: Multiple buttons scattered
- **New**: Hamburger menu with organized actions
- **Actions**:
  - Add Exercise (keep as primary button)
  - Rename Workout
  - Delete Workout (requires confirmation)
  - Duplicate Workout (modal: "Which week?")
  - Swap Workout (modal: "Swap with which workout?")

### 5. Drag-and-Drop Reordering (Desktop)
**Exercises within Workout**
- Visual drag handle (desktop only)
- Reorder exercises within same workout
- Backend: API endpoint to update `order` field

**Workouts within Week**
- Visual drag handle (desktop only)
- Reorder workouts within same week
- Backend: API endpoint to update `order` field

**Implementation**:
- Backend: Reusable reordering API (transfers to Expo)
- Frontend: `@dnd-kit/core` for web (Expo will use React Native DnD libraries)

**Note**: Focus on API first. Desktop drag-and-drop UI is nice-to-have.

### 6. Program Duplication
- **Action**: "Duplicate Program" button/menu item
- **Behavior**: Creates full copy of program (weeks, workouts, exercises, prescribed sets)
- **Naming**: Appends " (Copy)" or " (2)" to name
- **Status**: New program starts inactive

### 7. Centralized Programs Page
- **Current**: Separate cardio/strength pages
- **New**: Single `/programs` page showing both types
- **Layout**: Tabs or sections for Cardio vs Strength
- **Actions**:
  - "New Program" button → type selection modal (Cardio/Strength)
  - Routes to respective creation forms

### 8. Visual Styling (Optional)
- **Direction**: Hard edges, less rounded corners (doom aesthetic)
- **Scope**: Desktop only, if time permits
- **Note**: Can be applied quickly with Tailwind class updates
- **Priority**: Low (nice-to-have)

## Implementation Phases

**Focus**: Backend APIs + Desktop UX (work that transfers to Expo)

### Phase 1: Cleanup & Foundation
**Goal**: Remove legacy code, clean slate
- [ ] Remove CSV import functionality (code, routes, UI)
- [ ] Remove CSV-related dependencies

### Phase 2: Backend APIs (High Priority - Transfers to Expo)
**Goal**: Build reusable backend logic
- [ ] Set duplication API endpoint
- [ ] Program duplication API endpoint
- [ ] Week duplication API endpoint
- [ ] Workout duplication API endpoint
- [ ] Workout swap API endpoint
- [ ] Exercise reordering API endpoint (update `order` field)
- [ ] Workout reordering API endpoint (update `order` field)

### Phase 3: Desktop UX Improvements
**Goal**: Better workflow on desktop
- [ ] Set duplication UI (+ button)
- [ ] Week controls consolidation (hamburger menu)
  - Delete week (with confirmation)
  - Duplicate week
- [ ] Workout controls consolidation (hamburger menu)
  - Rename workout
  - Delete workout (with confirmation)
  - Duplicate workout (with week selector)
  - Swap workout (with workout selector)
- [ ] Program duplication button/menu item
- [ ] Centralized programs page (cardio + strength)
- [ ] Program type selection on creation

### Phase 4: Advanced Desktop Features (Optional)
**Goal**: Nice-to-have desktop improvements
- [ ] Install and configure @dnd-kit/core
- [ ] Drag-and-drop for exercises (desktop only)
- [ ] Drag-and-drop for workouts (desktop only)
- [ ] Doom styling (hard edges)

### Next Initiative: Expo Mobile App
**Deferred to Expo** (web-specific mobile work that won't transfer):
- Mobile layout optimizations
- Web gesture libraries (horizontal swipes)
- Mobile-specific styling

**Will Reuse from This Phase**:
- All backend APIs from Phase 2
- Business logic for duplication/swapping/reordering

## Database Considerations

### Required Fields
- Programs, Weeks, Workouts, Exercises already have `order` fields
- Ensure these are properly maintained during drag-and-drop

### New Operations
- Program duplication: Deep copy with new IDs
- Workout swap: Update `weekId` for both workouts
- Week duplication: Copy week + all children

## Deferred Features

### Deferred to Expo Phase
- Mobile layout optimizations
- Web gesture libraries (horizontal swipes)
- Mobile-specific UI polish

### Future Nice-to-Haves
(Beyond current scope)
- Export to XLSX
- Import from XLSX
- Program templates/library
- Exercise substitution suggestions
- Analytics (volume tracking, exercise history, body part grouping)

## Notes
- **Strategy**: Build backend APIs first, then desktop UX, then pivot to Expo
- **Rationale**: Avoid throwaway web-specific mobile work
- **Desktop assumption**: Primary use case for program creation/management
- **Mobile app**: Will focus on workout logging experience, reuse all APIs
- **Analytics**: Deferred until after Expo app is complete

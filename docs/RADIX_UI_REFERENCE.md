# Radix UI Reference Guide

This document contains important information about using Radix UI components in the Ripit Fitness project, including common issues and solutions.

## Table of Contents
- [Core Principles](#core-principles)
- [Z-Index Management](#z-index-management)
- [Dialog Positioning](#dialog-positioning)
- [DOOM Theme Integration](#doom-theme-integration)
- [Common Issues](#common-issues)

---

## Core Principles

### 1. Radix UI Does Not Set Z-Index Automatically
Starting from recent versions, **Radix UI no longer sets z-index values on portaled components** (Dialog, AlertDialog, Popover, etc.). This gives developers full control over layering but requires explicit z-index management.

**Reference:**
- [Z-index issues when combining Dialog.Portal with Popover, Dropdown, etc. · Issue #1317](https://github.com/radix-ui/primitives/issues/1317)

### 2. Portal Components Render Outside the DOM Hierarchy
Components like Dialog, AlertDialog, and Popover use `Portal` to render outside their parent DOM hierarchy, typically at the document body level. This prevents CSS inheritance issues but requires careful z-index management.

---

## Z-Index Management

### Z-Index Hierarchy in Ripit Fitness

```
z-[70]  - Radix Dialog/AlertDialog (confirmation modals)
z-[60]  - Manual confirmation modals (legacy)
z-50    - Main workout logging modal
z-40    - (Available)
z-30    - (Available)
z-20    - (Available)
z-10    - Dropdowns, tooltips
```

### Setting Z-Index on Radix Components

When creating Radix wrapper components, **always explicitly set z-index** on both the Overlay and Content:

```typescript
// ✅ CORRECT - Explicit z-index
const DialogOverlay = React.forwardRef<...>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-[70] backdrop-blur-md bg-black/40 ${className}`}
    {...props}
  />
))

const DialogContent = React.forwardRef<...>(({ className = '', ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={`z-[70] bg-zinc-800 border-2 border-orange-600 ${className}`}
      {...props}
    />
  </DialogPortal>
))
```

```typescript
// ❌ WRONG - No z-index (will cause layering issues)
className={`fixed inset-0 backdrop-blur-md bg-black/40 ${className}`}
```

### Nested Modals

When rendering a Radix Dialog/AlertDialog **inside** another modal (e.g., exit confirmation inside workout logging modal):

1. **Move the Radix component outside the parent modal** - Render it as a sibling at the same level
2. **Set higher z-index** - Use `z-[70]` or higher to appear above parent modal's `z-50`
3. **Control visibility with state** - Use `open={showModal}` prop, not conditional rendering inside parent

```typescript
// ✅ CORRECT - Radix Dialog outside parent modal
<>
  {/* Parent Modal */}
  <div className="fixed inset-0 z-50">
    {/* ... parent modal content ... */}
  </div>

  {/* Radix Dialog - sibling to parent, higher z-index */}
  <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
    <DialogContent>...</DialogContent>
  </Dialog>
</>
```

```typescript
// ❌ WRONG - Radix Dialog inside parent modal
<div className="fixed inset-0 z-50">
  {/* Parent modal content */}

  {/* This will cause z-index conflicts */}
  <Dialog open={showExitConfirm}>
    <DialogContent>...</DialogContent>
  </Dialog>
</div>
```

---

## Dialog Positioning

### The Problem with Tailwind Transform Classes

Using Tailwind classes for centering can cause issues:
- `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` may not work reliably
- `left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]` can cause subpixel rendering/blurring

**Reference:**
- [Centering a dialog like the primitive example makes the dialog blurred · Discussion #271](https://github.com/radix-ui/themes/discussions/271)

### The Solution: Inline Styles

**Use inline styles for positioning** to ensure consistent centering:

```typescript
const DialogContent = React.forwardRef<...>(({ className = '', ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }}
      className={`z-[70] bg-zinc-800 border-2 border-orange-600 ${className}`}
      {...props}
    />
  </DialogPortal>
))
```

**Why inline styles work:**
- Higher CSS specificity than utility classes
- Not affected by Tailwind class ordering
- Consistent browser rendering
- No subpixel issues

### Alternative: CSS Grid on Overlay (Advanced)

For more complex layouts, you can center using the overlay:

```typescript
// Overlay with grid centering
const DialogOverlay = React.forwardRef<...>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-[70] grid place-items-center backdrop-blur-md ${className}`}
    {...props}
  />
))

// Content with no positioning (centered by overlay)
const DialogContent = React.forwardRef<...>(({ className = '', children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay>
      <DialogPrimitive.Content
        ref={ref}
        className={`z-[70] bg-zinc-800 w-[90vw] max-w-lg ${className}`}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogOverlay>
  </DialogPortal>
))
```

**Note:** This requires nesting Content inside Overlay, which is different from the default Radix structure where they're siblings.

---

## DOOM Theme Integration

### Required Classes for DOOM Styling

All Radix wrapper components should include these classes for theme consistency:

```typescript
// Backgrounds
bg-zinc-800           // Card background
bg-zinc-900           // Darker background (nested sections)
bg-black              // Darkest background

// Borders
border-2              // Standard border width
border-orange-600     // Primary border color
border-zinc-700       // Secondary border color

// Text
text-orange-50        // Primary text
text-zinc-300         // Secondary text
text-zinc-400         // Muted text

// Special Effects
doom-noise            // Noise texture background
doom-corners          // Angled corners

// Backdrop
backdrop-blur-md      // Modal overlay blur
bg-black/40           // Light mode backdrop
dark:bg-black/60      // Dark mode backdrop
```

### Example: Dialog with DOOM Theme

```typescript
const DialogContent = React.forwardRef<...>(({ className = '', ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      className={`z-[70] w-[90vw] max-w-lg flex flex-col bg-zinc-800 border-2 border-orange-600 doom-noise doom-corners shadow-xl ${className}`}
      {...props}
    />
  </DialogPortal>
))

const DialogHeader = ({ className = '', ...props }) => (
  <div
    className={`flex flex-col space-y-1.5 bg-orange-600 text-white px-4 py-3 border-b-2 border-orange-700 ${className}`}
    {...props}
  />
)

const DialogFooter = ({ className = '', ...props }) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-4 border-t border-zinc-700 ${className}`}
    {...props}
  />
)
```

---

## Common Issues

### Issue 1: Dialog Not Visible (Off-Screen or Behind Parent)

**Symptoms:**
- Dialog overlay shows (dark backdrop) but content is invisible
- Content appears at wrong position (top-left, bottom, etc.)
- Dialog appears behind parent modal

**Solutions:**
1. Check z-index - ensure Dialog has higher z-index than parent (`z-[70]` vs `z-50`)
2. Use inline styles for positioning (see [Dialog Positioning](#dialog-positioning))
3. Render Dialog outside parent modal as sibling (see [Nested Modals](#nested-modals))
4. Verify both Overlay AND Content have z-index set

### Issue 2: Dialog Appears Blurry

**Symptoms:**
- Dialog content looks slightly blurred
- Text rendering is fuzzy

**Solution:**
Use inline styles instead of Tailwind bracket notation:

```typescript
// ✅ CORRECT
style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}

// ❌ WRONG - Can cause subpixel rendering
className="left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]"
```

### Issue 3: Select/Dropdown Not Showing Inside Dialog

**Symptoms:**
- Radix Select dropdown doesn't appear when opened inside Dialog
- Dropdown menu items invisible

**Solutions:**
1. Ensure Select portal has proper z-index
2. Check for conflicting `pointer-events` styles
3. Verify all Radix packages are compatible versions

**Reference:**
- [[Select] Select content not showing in Dialog due to z-index · Issue #2773](https://github.com/radix-ui/primitives/issues/2773)

### Issue 4: Dialog Closes When Clicking Inside

**Symptoms:**
- Dialog closes unexpectedly when clicking buttons/inputs inside

**Solution:**
Ensure proper event handling - Radix handles this automatically, but check for custom `onClick` handlers that might call `onOpenChange(false)`.

---

## Best Practices

### 1. Always Use Wrapper Components
Create styled wrapper components in `/components/ui/radix/` instead of using Radix primitives directly. This ensures:
- Consistent DOOM theme styling
- Centralized z-index management
- Easier maintenance

### 2. Test on Multiple Screen Sizes
Always test Radix components on:
- Mobile (< 640px)
- Tablet (640px - 1024px)
- Desktop (> 1024px)

### 3. Use TypeScript Strict Mode
Radix components have excellent TypeScript support. Enable strict mode to catch type errors early.

### 4. Prefer Dialog Over AlertDialog for Complex UIs
- **Dialog**: More flexible, supports any content, custom buttons
- **AlertDialog**: Opinionated structure (title, description, cancel, action), less flexible

Use Dialog when you need custom layouts or multiple action buttons.

### 5. Keep z-index Values Documented
Update the [Z-Index Hierarchy](#z-index-hierarchy-in-ripit-fitness) section when adding new layers.

---

## Debugging Checklist

When a Radix component isn't working:

- [ ] Is z-index explicitly set on both Overlay and Content?
- [ ] Is z-index higher than parent modal (if nested)?
- [ ] Is positioning using inline styles instead of Tailwind classes?
- [ ] Is component rendered outside parent modal (as sibling)?
- [ ] Are all Radix packages at compatible versions?
- [ ] Is `doom-noise` and `doom-corners` applied for theme consistency?
- [ ] Does the component have proper DOOM color classes?
- [ ] Is the component tested on mobile and desktop?

---

## Resources

### Official Documentation
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Dialog Component](https://www.radix-ui.com/primitives/docs/components/dialog)
- [AlertDialog Component](https://www.radix-ui.com/primitives/docs/components/alert-dialog)

### Key GitHub Issues
- [Z-index issues with Dialog.Portal](https://github.com/radix-ui/primitives/issues/1317)
- [Dialog centering causes blur](https://github.com/radix-ui/themes/discussions/271)
- [Select not showing in Dialog](https://github.com/radix-ui/primitives/issues/2773)

### Project-Specific
- `/components/ui/radix/` - Radix wrapper components with DOOM theme
- `/docs/STYLING.md` - DOOM theme color reference
- This document - Radix UI best practices and troubleshooting

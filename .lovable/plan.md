# Design consistency audit and normalization

## Audit summary

The active bill splitter has a clear design language: a saturated teal canvas, white lifted payer cards, rounded pill controls, Plus Jakarta Sans, large tabular settlement values, palette-colored avatars, and progressive disclosure for expenses. The chooser and settlement tiles carry the bold tool personality most strongly.

The main inconsistencies are implementation drift rather than a need for visual redesign.

## Findings to address

### High priority

1. **Fix the mobile header overflow**
   - At 390px, the bill-name and currency controls extend about 7px beyond the viewport.
   - Preserve both controls, but make their widths flex within the available header space and keep the product mark readable.
   - Verify the chooser and populated bill states at phone and desktop widths.

2. **Make the settlement transfer rows resilient**
   - Replace the fixed-width sender-name slot with a layout that accommodates longer names without colliding with the amount or recipient.
   - Preserve the arrow-led payment sentence and prominent tabular amount.

### Medium priority

3. **Unify active button treatments**
   - Route app buttons through the branded button wrapper, or give the shared button variants the app’s pill treatments once.
   - Keep three intentional levels: white inverted primary pills, tonal icon/step controls, and compact white secondary action pills.
   - Preserve destructive actions and existing labels.

4. **Consolidate tinted surfaces and colors into tokens**
   - Extract the duplicated subtle white panel gradient used by the chooser and `ResultHero` into a shared semantic style.
   - Replace one-off visual color values in active UI/export code with the established tint or palette tokens where the rendering context allows it.
   - Normalize the amber warning badge/marker to the palette system.

5. **Normalize elevation and radius usage**
   - Use the existing elevation styles instead of repeating a raw payer-card shadow.
   - Keep the intentional hierarchy: large chooser/result panels, standard payer cards, pill controls, and smaller nested rows.
   - Remove accidental radius differences while retaining parent/child visual hierarchy.

### Low priority

6. **Align icon sizing conventions**
   - Use utility-based icon sizing consistently rather than mixing icon props and classes.
   - Retain larger stepper icons as an intentional size tier.

7. **Clarify typography roles**
   - Keep display classes for the chooser and settlement answers.
   - Use one consistent label treatment for section headings and settlement labels.
   - Preserve tabular numerals for all financial values and avoid shrinking primary settlement information.

8. **Tighten interaction consistency**
   - Apply consistent press/focus feedback across chooser actions, create controls, share actions, and icon buttons.
   - Keep reduced-motion behavior and current keyboard/ARIA support.
   - Make the “last sharer” explanation remain accessible without relying only on a timed tooltip.

## Preserve

- Teal identity tint and single-hue canvas
- Query-string chooser/bill decision
- Live recalculation and all splitting logic
- Existing progressive disclosure and one-open-expense behavior
- White payer cards, palette avatars, amber unequal-share signal
- Large responsive settlement values and two-tile result layout
- Current copy, actions, routes, and data behavior

## Verification

- Check populated and empty bills at 390px, 768px, and 1280px widths.
- Confirm no horizontal overflow, clipped names, control collisions, or value overflow.
- Confirm keyboard focus, menus, sharer toggles, and reduced-motion behavior remain intact.
- Run the build, TypeScript check, and tests after any approved normalization work.

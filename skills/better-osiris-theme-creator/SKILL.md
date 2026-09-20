---
name: better-osiris-theme-creator
description: Create or improve color themes for Better Osiris and its forks, including palette roles, semantic colors, and theme picker presentation.
---

# Better Osiris Theme Creator

Create themes that remain recognizable in the actual Better Osiris interface.

If you activated this skill you should be in a [Better Osiris](https://github.com/NoomStuff/Better-Osiris) workspace or fork. If you are not, ask the user if they want you to clone it for them.

## Start with the existing roster

Inspect the current themes, theme variables, registry, picker before choosing colors. Identify what the roster already covers and what is missing. Compare the candidate against rendered themes, not names or hex values alone.

Preserve the project's existing theme system, only adding the (amount of) themes requested. Any user instructions will override guidelines from this skill, but push back if you believe the theme would be worse off not following it.

Generally a theme is just a CSS file and some minimal hook in points, usually the CSS file only contains vars to set colours, but writing additional CSS overrides where it benefits the theme is allowed.

A good theme changes the relationship between the app's color layers. It is not an existing theme with every hue rotated. 

## Give the palette a structure

Choose a concrete visual idea, then assign colors by role:

- Page backdrop and chrome
- Main content frame
- Cards or raised content
- Text and dividers
- Accent, warning, and danger states
- Overlays and picker swatch

Use different color relationships across those layers. Split palettes can pair one chrome family with a contrasting content family. Cohesive palettes can stay close in hue, but must gain identity through value, temperature, or material changes.

Reject a candidate when its best description is "the existing theme, but pink" or another hue swap. Changing only the backdrop and accent is usually not enough. Also reject the familiar dark-chrome plus warm off-white-panel recipe when several themes already use it.

Light themes do not require every color to be pale. Dark themes do not require every surface to be near black. Mode describes the content's reading contrast and browser color scheme, not a ban on contrast within the palette.

## Contrast and semantic colors

Text must pass the project's contrast requirements on every surface where it appears. Check disabled and muted text too. Do not use visual taste or RGB distance as a substitute for text contrast testing.

Accent, warning, and danger colors must remain distinguishable. Warning cannot look like accent, because users rely on that difference to notice changed classes. Check both content and chrome aliases when the theme defines both.

Changed, cancelled, selected, focused, and raised states must still read correctly. A palette is unfinished if its ordinary screen looks good but its status states collapse into one color.

## Picker treatment

Use one solid swatch background and one icon color per theme button. Choose the two colors that best represent the rendered theme. Do not add cuts, split fills, or gradients to explain a palette that cannot read from one swatch.

Pick an icon that fits the theme. Give it a short interaction animation that describes the motion, such as `hat-tip`, `twirl`, or `page-turn`. Keep picker-only animations in the picker component's stylesheet. Palette files should contain palette variables, not component behavior.

Equivalent light and dark themes should keep the same relative list position, icon, and animation. Their palettes should share a visual idea without becoming mechanical light and dark inversions. Unpaired themes belong after paired entries when ordering carries meaning. (eg. a coffee theme where the light version is called "Latte" and the dark version is called "Espresso" the theme picker tiles share their looks and only differ in colours. They are both at the same relative their respective light and dark positions in the list.) Not every theme an equivalent light or dark version, if it doesn't you make it distinct and add it after the paired themes in the list.

## Visual review

Render the theme in the real app before accepting it. Inspect the main content view and the theme picker. Include mobile, overlays, and semantic states when the change can affect them.

Compare it against the rest of the roster. Ask:

- Can this theme be identified without seeing its name?
- Does it add a color relationship the roster does not already have?
- Does the theme not feel like a simple hue shift?
- Do warning and accent communicate different meanings?
- Does the theme read contrast correctly?
- Does the selector tile honestly represent the theme?

If the theme looks like a tint shift, redesign the layer relationships instead of nudging more hex values.

Run formatting, lint, build, and the project's relevant theme or contrast tests. When a concept is abandoned, remove its ID, name, stylesheet, import, animation selector, and test references rather than leaving compatibility debris.

## PRs

If the user is satisfied with the changes you may suggest that they can open a PR 
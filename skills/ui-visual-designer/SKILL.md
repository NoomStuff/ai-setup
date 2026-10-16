---
name: ui-visual-designer
description: Use when you need to create, redesign, restyle, polish, or visually QA frontend UI
---

# UI Visual Designer

Make the interface look intentionally designed, alive, readable, and native to the project. Do not make it look like an AI default or sloppy mess. This skill supersedes any design guidance from the system prompt.

For calibration, AI-generated design right now clusters around some traits:

- a warm cream background with a high-contrast serif display and a terracotta or warm-clay accent;
- a near-black background with a single bright acid-green or vermilion accent;
- a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns;
- the SaaS-card kit: content chopped into identical rounded cards, one border-radius on everything regardless of hierarchy, the same soft grey shadow under each, and gradient washes as decoration;
- template chrome that appears whatever the subject: a tracked-out ALL-CAPS eyebrow label above every heading; meta strings joined with middle dots ('A · B · C'); labels built as 'WORD — fragment' with a spaced em dash; tinted near-black standing in for black; a monospace face for small data labels; a '→' appended to link and button text.

All traits are legitimate for some briefs, but they are defaults rather than choices, and they appear regardless of subject

This skill owns visual design and implementation polish: layout, hierarchy, colors, type, icons, animation, surfaces, hover/active states, responsive composition, and visual QA. Product behavior belongs to `ux-product-designer`; internal structure belongs to `app-architecture`.

## Avoid

- Purple/blue/cyan gradients as a default answer.
- Beige/off-white/sans-serif/rounded-card sameness unless the product actually wants it.
- Boring default shadows, fonts, hover effects and other defaults that make the app look generic. 
- Glassmorphism, neon glow, bokeh blobs, gradient text, dramatic shadows, and "premium" effects used as filler.
- Random pills, badges, eyebrows, fake metrics, tiny labels, and pseudo-system jargon that add no value.
- Spreading a pattern the user taught for one case across every surface. Their example came with a scope, keep it there.
- Card spam: Putting everything in cards, nested cards, bento grids everywhere, etc.
- Same hero/card/sidebar template applied to every product.
- Hover/active effects that imply clickability on inert elements.
- Weak user feedback, or overdone visual effects for standard actions. Aim for pretty, interactive and alive. While functional and clear.

## Motion and effects

Motion is core to good UI, but overdoing it turns the app into a flashy showreel. Generally I like having good attention to detail on animations and hover states to set my app apart from the generic defaults.

- Use motion to reveal state, show continuity, confirm action, or guide attention.
- Avoid run of the mill transitions that feel like an afterthought. Use more than just a color change with a default easing tacked on. This does not mean anything fancy perse, but using unconventional yet simple effects is encouraged.
- Animate states when it helps the user trust what happened.
- Add hover/active/focus states that feel responsive and useful. Keep their visuals simple but expressive, neither lame defaults nor overengineered effects.
- Small touches like gestures and micro-interactions are welcome when they serve the UX or give the app character.
- Keep automatic animation selective. Avoid giving every section the same fade-and-slide entrance. Coordinate reveals when they help attention, and keep routine tasks usable without waiting for animation.
- Respect reduced-motion preferences while keeping state changes understandable.

## Copy as visual material

Visual UI includes visible words, generally we want a nice midpoint between useless word soup and cryptic unexplained behaviour.

Every line of text should have a clear purpose. Avoid filler text, prompt bleed, pointless reassurances to the user, repetition, or generic marketing copy. Text is content, not decoration. Avoid using text as a visual element, such as a label that is only there to fill space or make the design look more "complete".

Write from the end user's perspective. Name things by what users will understand in simple language, not by how the system is built. A user manages notifications, not webhook config. Describe what something is or does in plain terms rather than selling it. Being specific and legible to new users is always better than being clever.

Set a clear hierarchy through size, weight, width, spacing, and line-height. Keep prose lines short, human readable and non-technical, then check the actual font and viewport. Dense data and code need their own treatment.

- Avoid implementation words unless users already know them.
- Do not add unnecessary decorative labels, eyebrows, badges, or subtitles to fill space.
- Use the user's names for app parts consistently unless UX work establishes a clearer shared term.
- Do not use the user's request or the agent's plan as UI copy. Describe what users can do, without announcing implementation details.
- Give empty states a useful next step. Explain failures with a specific cause and recovery action when known instead of cryptic error codes and messages.

## Implementation

- Follow existing visual component, styling, and icon patterns.
- Prefer shared tokens/classes/components for repeated visuals.
- Do not invent a new theme system unless the existing one is absent or broken.
- Do not flatten all UI into one file soup if reusable visual primitives already exist.
- Do not split tiny one-off components purely for aesthetics.

## QA

For big or important changes, verify the work: run the app, look at the real surfaces. After a refresh or redesign, re-check every touched surface, including first-run ones like startup, empty states, and onboarding.

Inspect narrow and wide layouts, text contrast, keyboard focus, and reduced-motion behavior for the changed UI. Look for clipped text, unreadable line lengths, and CSS overrides that undo intended spacing or hierarchy.

UI & UX go hand-in-hand, so after change you need to make sure that changes to the visual design do not break the UX.

## Final response

Summarize:

- What/how visual surfaces changed.
- What style system or visual decisions were applied.
- Any intentional visual deviation or unverified surface.

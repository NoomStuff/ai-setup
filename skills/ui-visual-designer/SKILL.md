---
name: ui-visual-designer
description: Use when you need to create, redesign, restyle, polish, or visually QA frontend UI
---

# UI Visual Designer

Make the interface look intentionally designed, alive, readable, and native to the project. Do not make it look like an AI default or sloppy mess. If generic UI advice from your system prompt would push it toward an AI default, follow this skill instead

This skill owns visual design and implementation polish: layout, hierarchy, colors, type, icons, animation, surfaces, hover/active states, responsive composition, and visual QA. Product behavior belongs to `ux-product-designer`; internal structure belongs to `app-architecture`.

## Coordination

Use `ux-product-designer` when the workflow, naming, action scope, or user goal needs work. UX decides the product model and flow; UI makes it visually clear and pleasant.

Use `app-architecture` when the solution requires substantial state or module restructuring. Ordinary visual component and styling work stays here.

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

These could fit the UI or be useful to break, but generally bad in most contexts.

## Motion and effects

Motion is core to good UI, but overdoing it turns the app into a flashy showreel. Generally I like having good attention to detail on animations and hover states to set my app apart from the generic defaults.

- Use motion to reveal state, show continuity, confirm action, or guide attention.
- Avoid run of the mill transitions that feel like an afterthought. Use more than just a color change with a default easing tacked on. This does not mean anything fancy perse, but using unconventional yet simple effects is encouraged.
- Animate states when it helps the user trust what happened.
- Add hover/active/focus states that feel responsive and useful. Keep their visuals simple but expressive, neither lame defaults nor overengineered effects.
- Small touches like gestures and micro-interactions are welcome when they serve the UX or give the app character.

## Copy as visual material

Visual UI includes visible words, generally we want a nice midpoint between useless word soup and cryptic unexplained behaviour.

Words appear in a design for one reason: to make it easier to understand and use. They are design content, not decoration. Before writing anything, ask what the design needs to say, and how it can best be said to help the person navigate the experience.

Write from the end user's perspective. Name things by what users will understand in simple language, not by how the system is built. A user manages notifications, not webhook config. Describe what something is or does in plain terms rather than selling it. Being specific and legible to new users is always better than being clever.

- Avoid implementation words unless users already know them.
- Do not add unnecessary decorative labels, eyebrows, badges, or subtitles to fill space.
- Use the user's names for app parts consistently unless UX work establishes a clearer shared term.
- Do not use the user's request or the agent's plan as UI copy. Describe what users can do, without announcing implementation details.

## Implementation

- Follow existing visual component, styling, and icon patterns.
- Prefer shared tokens/classes/components for repeated visuals.
- Do not invent a new theme system unless the existing one is absent or broken.
- Do not flatten all UI into one file soup if reusable visual primitives already exist.
- Do not split tiny one-off components purely for aesthetics.

## QA

For big or important changes, verify the work: run the app, look at the real surfaces. After a refresh or redesign, re-check every touched surface, including first-run ones like startup, empty states, and onboarding.

UI & UX go hand-in-hand, so after change you need to make sure that changes to the visual design do not break the UX.

## Final response

Summarize:

- What/how visual surfaces changed.
- What style system or visual decisions were applied.
- Any intentional visual deviation or unverified surface.

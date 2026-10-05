# AGENTS.md — UI/UX Design Agent Rules

Operating rules for any AI design agent (Figma Make, Figma Agent, Google Stitch, or any other AGENTS.md-aware tool) working on this product's interface.

> **Core principle:** never optimize a design to look impressive. Optimize it to solve the user's actual problem clearly, consistently, and usably — with a defensible reason behind every major visual decision. If you can't state why an element exists, it shouldn't exist.

## How to use this file
- **Figma Make** — paste the content into `Guidelines.md` (Code tab → file explorer → `guidelines/Guidelines.md`).
- **Figma Agent** — add as project-level instructions or a Skill so it's applied automatically to every design generated in this file. (Figma Agent's Skills/Connectors system is still rolling out — check your current Figma settings for the exact mechanism.)
- **Google Stitch** — paste into the project's custom instructions field so it's applied to new generations; re-paste per session if your version of Stitch doesn't yet persist instructions across a whole project.
- **Any other AGENTS.md-aware agent** — keep this file at the project root; it should be picked up automatically.

### Rule types used below
- `[HARD]` — never violate, no exceptions.
- `[DEFAULT]` — the standard approach here; deviate only when the brief, or an existing brand/design system the user supplies, explicitly calls for something else — and note that you did.
- `[CHECK]` — verify before calling a screen finished.

---

## 1. Before You Draw Anything — Design Decision Process `[HARD]`
Don't generate a visual layout before establishing:
1. What the product is and who the primary user is.
2. The primary task this screen/flow needs to accomplish.
3. Information priority order — what the user must see first, second, third.
4. Which interactions are essential vs. secondary.
5. What must change between mobile and desktop, and what must not.
6. Which existing components/tokens can be reused vs. what's genuinely new.

If the brief doesn't answer these, state your working assumption in one line and proceed. Don't block the task on it, and don't silently guess without saying so.

## 2. Information Hierarchy & Layout `[DEFAULT]`
- Every screen has one primary focus. Rank content Primary / Secondary / Tertiary and design accordingly.
- Build hierarchy through type scale, spacing, size, contrast, alignment, and grouping — not by making everything bold, colorful, or the same size.
- Structural devices (numbers, dividers, eyebrow labels, borders) must encode real information. A numbered sequence (01/02/03) is only appropriate for genuinely sequential content — check before using it.
- Use a defined grid (e.g. 12-column, a stated max content width) and a deliberate alignment choice (left / center / justified) rather than defaulting to centered-everything.

## 3. Responsive Design `[HARD requirement — behaviors below are DEFAULT]`
Build **one adaptive layout system**, not two unrelated designs that happen to look similar. Changing the frame/viewport width should reveal the right version on its own — that's the point of building it this way instead of redesigning per device.

Reference breakpoints (adjust to the product, but define explicit ones):

| Breakpoint | Width |
|---|---|
| Mobile | ~360–767px |
| Tablet | ~768–1023px |
| Desktop | ~1024px+ (define a max content width — don't just let it stretch) |

Define what actually changes at each breakpoint, not just "gets smaller":
- **Fluid sizing** — relative units, min/max-width constraints, no fixed-pixel containers that break on resize.
- **Reflow** — columns stack, wrap, or reorder as width shrinks (a 4-column grid → 2 → 1).
- **Navigation transformation** — a desktop sidebar doesn't just shrink, it becomes a bottom nav, hamburger menu, or bottom sheet on mobile. Decide and document the transformation; don't leave it implicit.
- **Hide/show, not just shrink** — secondary content can collapse behind a control instead of surviving at illegible sizes.
- **Typography & spacing scale down on defined tokens** (§4), not arbitrary per-breakpoint values.
- **Touch targets** ≥ 44×44px on mobile/tablet.
- Use auto-layout / layout constraints (or the equivalent flex/grid behavior in code output) on every frame and component — avoid absolute positioning that only works at one size.
- If the tool genuinely can't produce fluid behavior (a static, single-size mock only), produce explicit mobile + desktop frames built from the exact same token and component set — and say so. Don't silently let them diverge into two different-looking products.

`[CHECK]` Resize across the full range, not just the two endpoints, and confirm nothing overlaps, truncates unexpectedly, or gets orphaned.

## 4. Design System (Tokens) `[HARD — derive values from tokens, don't invent one-offs]`
- **Color** — primary, secondary, background, surface, border, text-primary, text-secondary, success, warning, error. One dominant accent; add a second only if the brief needs it.
- **Typography** — display, heading-1/2/3, body, body-small, caption, label. One or two typefaces, chosen deliberately for the subject (see §9 on what "deliberate" rules out).
- **Spacing** — a consistent scale, e.g. 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.
- **Radius** — small / medium / large / full, applied by hierarchy, not uniformly on everything.
- **Elevation** — none / low / medium / high.

Every component pulls its values from these tokens. A one-off pixel value or an off-palette color is a sign something's wrong.

## 5. Component Architecture `[DEFAULT]`
- Reuse an existing component before creating a new one.
- Express differences as variants/properties, not new components — `Button(variant: primary, size: large)`, not `PrimaryButton`, `HeroButton`, `BigCTAButton` as separate things.
- A component isn't finished until its states are defined — see §6.

## 6. Interaction & Component States `[HARD — don't ship default-state-only components]`
At minimum, every interactive component needs these states designed, not just listed:
- **Buttons** — default, hover, pressed, focus, disabled, loading.
- **Inputs** — default, focus, filled, error, disabled, success.
- **Navigation** — default, active, hover, collapsed/mobile.
- **Any custom multi-value control** (role switch, tabs, segmented control, etc.) — one explicit state per value, not just whichever one happened to be on screen.

**Capture each state as its own artifact, isolated from the page frame — not a full page re-capture per state.**
- Scope each artifact to the component, or its immediate component group when the state only reads correctly in context (e.g. a role switch shown with all roles, one highlighted as selected).
- More artifacts is fine — completeness for the downstream coding agent matters more than generation efficiency.
- Name each one `component_state` (e.g. `role-toggle_admin-selected.png`, `dropdown_expanded.png`) so a coding agent can map artifact to state without guessing.
- Working natively in Figma: build each state as its own frame, then select them together and use Combine as Variants to turn them into a real component set.

**Transitions get a written spec, not enumerated frames.** Continuous motion (a dropdown easing open, a toggle sliding) can't be captured as images, and trying to enumerate every frame of it wastes effort for no gain. Document it as a spec attached to the two states it connects instead:

| From → To | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| Dropdown: collapsed → expanded | Click | height, opacity | 200ms | ease-out |
| Toggle: off → on | Click | thumb position, track color | 150ms | ease-in-out |

This is the same vocabulary Figma's own prototyping already uses (Trigger, Action, Smart Animate) and it maps directly onto a CSS transition for a coding agent — so it's usable whichever direction the file goes next.

## 7. Accessibility `[HARD]`
- Sufficient color contrast; never rely on color alone to carry meaning.
- Visible keyboard focus state on every interactive element.
- Semantic structure and real accessible labels, not just a visual approximation.
- Touch target size ≥ 44×44px.
- Respect reduced-motion preferences.
- Text stays legible at larger system font sizes.

## 8. Content & UX Writing `[DEFAULT]`
- Real, product-specific content. No lorem ipsum, no fabricated stats, no "Acme Inc." / "John Doe" testimonials.
- Labels name the exact action — "Create new project" beats a bare "Get Started" if that's literally what it does.
- Active voice; an action keeps the same name through the whole flow (a "Publish" button produces a "Published" confirmation, not "Submitted").
- Error and empty states say what happened and what to do next, in the product's voice — never vague, never apologetic filler.

## 9. Visual Language & Anti-Slop Rules `[DEFAULT — conditional, not a blocklist]`
**Governing rule:** no visual pattern is banned outright. Gradients, glassmorphism, 3D elements, bento grids, rounded cards, animation — all fine *when they serve hierarchy, usability, brand identity, information grouping, or interaction feedback.* What's not allowed is reaching for a pattern **only because it's common in AI-generated output or currently trendy**, with no reason tied to this specific product.

Patterns to treat as things to justify, not defaults to reach for automatically — these are the most consistently documented tells of unconstrained AI-generated UI:
- Purple-to-blue gradient washes or glow used as decoration with no semantic meaning.
- Glassmorphism applied without a functional reason (real depth or layering).
- Three identical rounded cards — same icon-headline-text structure, same soft shadow — used reflexively for any group of three things.
- The fixed "SaaS landing page" skeleton (navbar → hero → 3 cards → logo strip → feature cards → testimonials → pricing → CTA → footer) applied regardless of whether the product is a dashboard, a portfolio, or a store.
- Default typefaces (Inter, Roboto, Arial, Geist, Plus Jakarta Sans, system-ui) chosen because they're safe, not because they fit the subject.
- Tracked-out ALL-CAPS eyebrow labels, middle-dot-joined meta strings, or "WORD — fragment" em-dash labels used as chrome on every heading.
- Decorative sequence numbers (01/02/03) on content that isn't actually a sequence.
- A `→` appended to every link or button by default.
- One uniform corner radius applied to everything, regardless of hierarchy.
- Scattered motion — a fade-and-slide-up on every section, a hover-lift on every card — instead of one deliberate moment.
- Accenting a single word in a headline (italic / bold / color) as a stock move.
- "Live" / "New" pulsing badges attached to things that are neither.

**Whitespace is not a problem to solve.** Don't add a card, stat, icon, or gradient just because an area looks empty — empty space can be the intentional choice.

**Motion**: one orchestrated moment (a load sequence, a single reveal) reads as more considered than the same small animation repeated on every element. Motion should respond to what the user just did, or draw attention exactly once — not decorate by default.

**Spend boldness in one place.** Let one element per screen be the memorable one; keep everything around it disciplined.

## 10. Simplicity `[DEFAULT]`
Use the simplest design and component set that satisfies the actual requirement. Don't add components, variants, modals, states, or animation without a concrete user, product, or technical reason. A request for "a simple landing page" shouldn't turn into 14 components and 6 modals.

## 11. When the Brief Is Incomplete or Conflicts with This File `[DEFAULT]`
- An explicit instruction in the brief, or an existing brand/design system the user provides, overrides the defaults in §4 and §9.
- If requirements are ambiguous, state the assumption you're making in one line and continue. Don't stall, and don't guess silently.

## 12. Delivery Checklist `[CHECK — before marking any screen done]`
- [ ] Primary user task is understandable at a glance.
- [ ] Information hierarchy is clear — Primary/Secondary/Tertiary is visibly distinct.
- [ ] Layout has been resized across the full breakpoint range, not just checked at two sizes.
- [ ] Components reuse existing variants; no near-duplicate components.
- [ ] All values — color, type, spacing, radius — come from tokens.
- [ ] Interactive components define their real states, not just default — each state exists as its own captured artifact, not only a description.
- [ ] Accessibility floor is met (contrast, focus, labels, touch targets, reduced motion).
- [ ] Content is real/representative — no lorem ipsum, no fabricated data.
- [ ] Every decorative or structural element has a stated purpose; nothing exists just to fill space.
- [ ] No pattern from §9 appears without a reason you could explain if asked.

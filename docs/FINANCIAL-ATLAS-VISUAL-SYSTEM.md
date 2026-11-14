# EnterpriseOS — Financial Atlas Visual System

**Version:** Spatial field increment  
**Scope:** Public-facing Financial Atlas landing page  
**Status:** Design specification aligned with the implemented CSS and React components. Values marked as aspirational are not presented as shipped behavior.

## 1. Art direction

The visual metaphor is a **financial cartography instrument**: an editorial atlas translated into a precision decision workspace. The interface should feel like a crafted instrument rather than a generic SaaS dashboard. Its visual vocabulary combines visible measurement lines, topographic contours, restrained light, dense labels and calm typographic contrast.

The composition follows a 90 / 8 / 2 principle:
- **90%** warm paper, mineral neutrals and deep ink.
- **8%** structural contrast: midnight surfaces, graphite lines and muted secondary text.
- **2%** high-attention accents: periwinkle for navigation and focus, sage for positive/active states, clay only for restrained warning context.

No client marks, awards, certifications, server coordinates, live status or customer outcomes may be introduced without evidence.

## 2. Four typographic voices

| Voice | Typeface | Use | Working treatment |
|---|---|---|---|
| Display | Space Grotesk variable | Hero, section headlines, product statements | 500–600; tight leading 0.84–0.97; tracking −0.075em to −0.09em |
| Editorial serif | Instrument Serif italic | Contrast words, emphasis, moments of pause | 400 italic; optical scale relative to display |
| Functional grotesque | General Sans | Paragraphs, navigation, interface labels | 400–600; body line-height 1.6–1.85 |
| Telemetry mono | IBM Plex Mono | Indices, units, captions, states and technical annotations | 500; uppercase tracking 0.7–1.15px |

The type scale is fluid, not a fixed set of desktop sizes:
- Hero: `clamp(3.45rem, 15.4vw, 8.9rem)`, tuned by breakpoint.
- Display: `clamp(2.8rem, 12vw, 6.5rem)`.
- Section headings: `clamp(2.35rem, 10.6vw, 4.7rem)`.
- Body: approximately 0.875–1rem.
- Technical labels: approximately 6–9px, with legibility reviewed at actual device scale.

Do not apply expanded tracking to every label indiscriminately. Use uppercase tracking only for short technical strings; keep long copy at normal tracking.

## 3. Color and material tokens

| Token | HEX / value | Role |
|---|---|---|
| `--atlas-canvas` | `#F0EEE8` | Main warm canvas |
| `--atlas-paper` | `#FAF9F5` | Raised paper / navigation |
| `--atlas-stone` | `#E8E9E3` | Secondary editorial surface |
| `--atlas-ink` | `#121B2A` | Primary ink |
| `--atlas-midnight` | `#14243B` | Deep instrument surface |
| `--atlas-ink-muted` | `#6E7884` | Body secondary |
| `--atlas-ink-faint` | `#87909B` | Metadata; never use for essential long copy |
| `--atlas-line` | `rgba(18,27,42,.15)` | 1px structural grid |
| `--atlas-line-inverse` | `rgba(250,249,245,.16)` | Lines on dark surfaces |
| `--atlas-periwinkle` | `#A6B6FF` | Primary interaction accent |
| `--atlas-sage` | `#5CBA99` | Positive / active accent |
| `--atlas-clay` | `#D58B65` | Restrained contrast accent |

### Surface construction
- Paper surfaces stay matte; avoid blanket glassmorphism.
- Blur is reserved for the floating mobile dock, where it has a functional separation role.
- Topographic hero: deep radial field, 1px grid, restrained noise, contour strokes and layered coordinate labels.
- Cards: one-pixel borders, subtle local light, restrained elevation and no gratuitous gradients.
- Shadows use large, low-opacity layers rather than hard black drop shadows.
- Grain must remain subtle enough not to reduce text contrast or create image noise on mobile.

## 4. Spatial system

- Desktop: 12-column editorial logic, asymmetrical spans and consistent outer gutters.
- Tablet: reduce gutter and preserve the main reading order before collapsing columns.
- Mobile: one primary column, compact metadata, horizontally grouped micro-information and stacked interactive panels.
- Hairlines use 1px CSS borders with low-opacity ink. Crosshair intersections are decorative only; they must not resemble controls.
- Dense composition means purposeful relationships between modules, not filling every pixel. Preserve breathing room around headlines, live product controls and financial figures.

### Spatial field interaction (implemented)

The hero's topographic field now responds to mouse and pen input:
- Pointer coordinates map to a restrained X/Y rotation, capped at approximately 3.2° / 4.2°.
- A localized radial specular highlight follows the pointer; the contour layer shifts independently to create differential parallax.
- Coordinate readouts and telemetry labels occupy a higher transform layer than the contour SVG.
- The field uses CSS perspective and transforms. It is **not WebGL**, does not contain a physically simulated glass shader and does not claim 360° object manipulation.
- Touch devices receive a static, readable composition rather than simulated pointer tracking.
- Pointer state resets on exit. Reduced-motion preferences remove transforms and transitions.

## 5. Motion and interaction

| Interaction | Treatment | Constraint |
|---|---|---|
| Scroll reveal | Short upward reveal using view-timeline where supported | Static fallback; disabled for reduced motion |
| Bento spotlight | Soft radial edge light on hover | Pointer-capable devices only |
| Card lift | 2px elevation with long deceleration | No scaling or bouncing |
| CTA response | Restrained highlight sweep and arrow translation | No cursor-following movement |
| Hero field | Pointer-driven perspective, localized light and contour parallax | CSS spatial effect, not WebGL; no live-data implication |
| Mobile dock | Fixed instrument rail with translucent paper surface | Safe-area inset and keyboard focus preserved |

The native pointer is intentionally retained. A custom cursor that replaces browser affordances, follows the pointer on touch devices or advertises nonexistent 360° interactions is not part of the current implementation. A true magnetic interaction should only be introduced with pointer-capability detection, reduced-motion handling and keyboard-equivalent behavior.

## 6. Mobile art direction

At widths up to 720px:
- Navigation collapses to the accessible menu already present.
- The new bottom dock provides direct routes to Product, Simulator, Scenario Comparison and Workspace.
- Dock respects `env(safe-area-inset-bottom)`, remains within the viewport width and uses visible focus states.
- The product X-ray rail changes from a sticky side rail to a three-column horizontal sequence above the live preview.
- Scenario cards stack vertically to keep metrics readable; no essential figures are hidden in swipe-only carousels.
- The footer receives extra bottom clearance so the dock does not cover the last line of content.
- Reduced-motion preferences disable transitions and reveal animations.
- The hero field does not tilt or track touch input.

## 7. Product truth and visual integrity

All scenario numbers shown in the landing page are synthetic illustrative values. The product showcase uses the real PlanningWorkspace component in temporary sample-data mode. Manual treasury inputs, manual cost-centre tracking, local persistence and the absence of a live bank connection must remain disclosed. Do not add a fake uptime indicator, geographic coordinates, client logos, awards, integrations, testimonials or a non-functional lead form.

## 8. Quality gate

Before merge or publication:
1. Run lint, TypeScript, unit tests and static production build.
2. Review at 1440px, 1024px, 768px, 390px and 320px widths.
3. Verify dock clearance, focus visibility, contrast, text wrapping and no horizontal overflow.
4. Verify keyboard navigation and `prefers-reduced-motion`.
5. Capture browser screenshots for visual QA; a passing build alone is not proof of visual correctness.


## Spatial Field — pointer performance and accessibility

The hero field updates its six spatial CSS custom properties directly on the pointer target. Pointer movement does not trigger React state updates or re-render the contour SVG and financial labels. Pointer leave and cancellation remove the active class and restore the CSS defaults. Touch input is intentionally ignored; the mobile composition remains static. The reduced-motion mode disables the moving spotlight and spatial transforms rather than merely shortening their duration. This is a CSS 3D interaction, not a WebGL scene or a physically based refraction simulation.


## Spatial bento and product chassis

Capability modules use a shared 3D perspective context with restrained elevation, a machined hairline rim, layered shadows, and distinct Z positions for metadata, visual instrument, and copy. Their miniature diagrams sit on inset translucent surfaces; module labels remain readable and disclose manual or MVP scope. Hover elevation is limited to fine pointers, while touch layouts remain static and reduced-motion removes transforms.

The product showcase treats the actual planning workspace as an instrument mounted inside a layered chassis. The X-ray rail, workspace surface, and outer frame occupy separate visual planes. This is CSS perspective and layered compositing, not a WebGL model. The live workspace remains the real application component and keeps its existing temporary sample-data behavior.


## Spatial conversion and footer

The conversion surface uses a restrained radial key light, a layered dark chassis, and a raised glass-like brand seal. The footer receives a low-contrast architectural grid and recessed typographic treatment. The CTA remains readable and functional without requiring pointer interaction; mobile removes the spatial transforms and reduced-motion disables them. No fake live telemetry, awards, customer marks, or unsupported contact form has been introduced.


## Scenario matrix — pointer materiality

The three scenario selectors use pointer-local CSS variables for a restrained 3D tilt and radial key light on fine pointers. Coordinates are written directly to the selected button (no React state or rerender); touch input remains static. Pointer leave/cancel clears the transient variables. The selected state, scenario values, keyboard operation, and live-region feedback remain the source of truth. Reduced-motion disables the transform. This is CSS perspective/compositing, not WebGL or physically simulated material.


## Decision field — instrumented financial output

The decision simulator's result surface uses pointer-local CSS variables for a low-amplitude perspective response and radial key light on fine pointers. It writes directly to the panel element, avoiding React state churn; touch remains static and pointer leave/cancel clears transient state. Existing scenario selection, illustrative figures, relative-index bars, and synthetic-data disclosure are unchanged. Reduced-motion removes transforms and transitions. The effect is CSS perspective and compositing, not WebGL or physically simulated optics.


## Financial reasoning architecture — spatial instrument

The “From input to decision” section now presents the four-stage model as a layered instrument rather than a flat row of labels:
- Inputs: manual drivers and assumptions.
- Model: financial relationships, P&L, budget and variance.
- Outlook: scenarios and the 13-week cash view.
- Decision: management performance and exposure.

The four stages are semantic ordered-list items. Each carries a stage index, operating mode and representative output vocabulary. Their staggered Z-depth, restrained elevation, inset highlights, connecting markers and material frame reinforce the direction of financial reasoning without implying an automated data pipeline or capabilities outside the current MVP. The mobile layout flattens the depth and becomes a two-column sequence; reduced-motion preferences remove transforms and transitions.

# Graphite UI Kit v3.2

## Purpose and agent quick start

A complete visual specification for sophisticated dark desktop applications, AI workspaces, analytics products, and enterprise control interfaces. This revision expands the supplied **Complete Dark UI Color Kit** into a system of composition, materials, interaction, and behavior. Its identity remains graphite neutrals, warm ivory typography, slate-blue actions, and restrained secondary accents. The v3 sections add finer surface steps and a complete card/developer-surface catalogue.

Use this document with **graphite-ui.css**, the scoped reference stylesheet. The document is the design and behavior contract; the stylesheet implements foundational tokens and common visual recipes. It is not a complete component library: positioning, focus management, form validation, chart rendering, and asynchronous state belong to application components.

Agent implementation order:

1. Identify the page's task, primary action, information hierarchy, density, and expected screen sizes.
2. Assign each region a surface role before styling individual components.
3. Establish typography, spacing, alignment, and responsive composition.
4. Implement components through shared variants and semantic tokens.
5. Complete hover, focus, pressed, selected, disabled, loading, error, and empty states.
6. Add restrained depth and motion only where they clarify the interface.
7. Validate a composed screen with realistic content, keyboard use, reduced motion, and small viewports.

Do not treat a request for polish as permission to add unrelated content, excessive panels, permanent animation, or decorative dashboards. Good hierarchy should be apparent before effects are added.

## 1. What changes in v3

Graphite v3 preserves the original warm graphite identity, while giving implementing agents a much more complete grammar for depth. The surfaces use balanced graphite midway between the original cool and revised warm palette; slate remains an action accent rather than tinting every background. The goal is a precise, composed application rather than a wall of identical charcoal rectangles.

| Area | v3 improvement |
| --- | --- |
| Depth | Seven named structural planes, plus dedicated recessed, code and terminal materials |
| Typography | Manrope headings + Inter interface text + IBM Plex Mono for literal data |
| Cards | Six materials, five edge options, and eight named composition recipes |
| Child regions | Explicit section, inset, well and raised recipes with nesting limits |
| Controls | Soft and gradient actions, explicit sizes, stable loading labels, stronger field boundaries |
| Developer surfaces | Code viewer, inline code, keycaps, diff lines, terminal and log contracts |
| Composition | Material compatibility, effects budget, nested geometry and semantic color rules |
| Delivery | Scoped CSS, this implementation contract, and an offline HTML showcase |

The stylesheet includes the v2 base followed by clearly marked v3 overrides. Load **only the delivered stylesheet**. Existing class names continue to work, but surface colors, heading family and panel radii change. This is a visual migration, not a promise of pixel compatibility.

## 2. Visual direction

**Quiet precision with tactile depth.** Design for a user who needs to inspect, compare, decide, and act.

- Neutral materials establish structure. Contrast and spacing establish reading order.
- Warm ivory marks important content; the brightest white is reserved for key values and occasional headings.
- Slate blue identifies the principal action, focus, links, and selected controls.
- Cards feel slightly raised. Fields feel inset. Floating UI clearly interrupts the underlying plane.
- Corners are softened but architectural. Use 5px controls, 10px panels, and 8px overlays as defaults.
- Effects are small enough that their absence would not break understanding.
- Distinctive details include a faint top edge, controlled metric-card wash, near-black tooltip, and a brief active edge on a running operation.

Avoid an all-black flat interface, blurred glass on every surface, excessive large-radius cards, ornamental monospace everywhere, neon halos, tiny gray typography, and gradients used to manufacture importance.

Neutral surfaces should dominate visually. The original percentage guidance is a compositional heuristic, not a pixel quota. Color-rich charts may legitimately occupy a large region; do not distort their encoding to satisfy a percentage.

## 3. Surface architecture and nesting

**There are more available levels, but not every child moves up a level.** Assign a physical relationship: contained, recessed, independent or floating. This is separate from DOM depth and z-index.

### Structural planes

| Plane | Token | Face | Default edge / depth | Purpose |
| --- | --- | --- | --- | --- |
| P0 foundation | `--surface-root` | `#101012` | None | Overall canvas |
| P1 chrome | `--surface-chrome` | `#16181a` | Quiet separator | Navigation, application frame |
| P2 workspace | `--surface-workspace` | `#1d1f22` | None | Working region behind cards |
| P3 card | `--surface-panel` | `#24272a` | Default border + rest shadow | Independent content group |
| P4 section | `--surface-section` | `#2c2e32` | Subtle border, no drop shadow | Group within a card, toolbar strip |
| P5 raised | `--surface-raised` | `#32363a` | Default border + top light + raised shadow | Emphasized independent object |
| P6 overlay | `--surface-overlay` | `#363a3f` | Strong border + floating shadow | Popup or dropdown |

These are role names, not a requirement to stack seven boxes. A modal uses the panel face and a broad shadow above a scrim; the tooltip deliberately uses a near-black face.

### Recessed and state materials

| Role | Token | Face | Use |
| --- | --- | --- | --- |
| Deep | `--surface-deep` | `#0a0b0c` | Large ambient recess, never an ordinary field |
| Inset | `--surface-inset` | `#181a1c` | Inputs, editable children |
| Well | `--surface-well` | `#121417` | Deep result region within a section |
| Code | `--surface-code` | `#14161a` | Code, JSON, configuration and snippets |
| Terminal | `--surface-terminal` | `#0e1012` | Shell transcript or task output |
| Hover | `--surface-hover` | `#3e4248` | Temporary control highlight |
| Selected | `--surface-selected` | `#2a3b4f` | Persistent selection with a check/rail |
| Tooltip | `--surface-tooltip` | `#080808` | Brief supplemental explanation |

### Parent → child decision table

| Parent | Child meaning | Child recipe |
| --- | --- | --- |
| Workspace | Independent object | `.g-card` with panel face |
| Card | Ordinary heading + copy | No additional box; use spacing |
| Card | Grouped configuration | `.g-surface[data-surface="section"]` or `.g-fieldset` |
| Card / section | User-editable value | `.g-field`, inset face + control border |
| Section | Raw payload | `.g-code` or well, rather than a brighter mini-card |
| Card | Independently actionable object | `.g-card[data-material="raised"]` used sparingly |
| Input | Open choices | Opaque floating overlay outside overflow clipping |
| Overlay | Selected option | Selected fill + check, not another raised object |

**Complex composition:** workspace → parent card → section group → inset field or code well. A menu opened by that field jumps to the overlay plane. Keep four persistent material changes as a practical local ceiling; add space, dividers, disclosure or navigation before adding a fifth nested panel. Chrome outside the working region does not count toward this local ceiling.

**Simple composition:** workspace → card → field. Do not force a section wrapper around one field merely to show all available levels.

**Geometry:** outer card 10px radius / 16px padding; section 7px radius / 12px padding; field 5px radius / 10px horizontal padding. Compact is the only density. Derive closely nested radii from the parent radius minus inset, with a 3px minimum. Avoid repeating an oversized radius on every layer.

`.g-surface` is visual only. Use semantic `<section>`, `<fieldset>` and headings where the relationship matters. Never use a decorative border as the only grouping label.

## 4. Typography: family, size, color and intensity

Use **Manrope + Inter + IBM Plex Mono**. Manrope gives the larger headings a composed geometric character; Inter carries dense interface content; IBM Plex Mono clearly separates code, paths and machine-readable values. This pairing is a design choice. Official family sources: [Manrope](https://fonts.google.com/specimen/Manrope), [Inter](https://rsms.me/inter/), [IBM Plex](https://github.com/IBM/plex).

| Token | Family stack | Scope |
| --- | --- | --- |
| `--font-heading` | Manrope, Inter, Segoe UI, sans-serif | Page / section / card headings and large metrics |
| `--font-ui` | Inter, Segoe UI, system-ui, sans-serif | Body, labels, buttons, tables, dropdowns, quotes |
| `--font-mono` | IBM Plex Mono, Cascadia Code, ui-monospace, monospace | Code, commands, identifiers, paths and keycaps |

The stylesheet does not make network requests. Self-host licensed WOFF2 assets through your build system, retaining each font's license, and use `font-display: swap`. Load only the weights actually used. The companion showcase embeds its font assets and license notices for offline inspection. An application can use system fallbacks until font loading is configured.

### Type scale

| Role / class | Size / line height | Weight | Color | Rules |
| --- | --- | --- | --- | --- |
| Display / `.g-display` | 32–52px / 1.12 | 600 | Display | Overview or feature opening, not every screen |
| Page title / `.g-title` | 24–32px / 1.25 | 600 | Heading | One clear page title |
| Section / `.g-section-title` | 20px / 28px | 600 | Heading | Major group |
| Card / `.g-heading` | 16px / 24px | 600 | Heading | Short sentence case heading |
| Subleader / `.g-subleader` | 16px / 26.4px | 400 | Secondary | Purpose statement immediately below title |
| Body / `.g-body` | 14px / 22.4px | 400 | Primary | Main explanation and values |
| Supporting / `.g-caption` | 13px / 20px | 400 | Secondary | Context, helper text, secondary descriptions |
| Metadata / `.g-meta` | 12px / 18px | 400 | Tertiary | Time, size, source and auxiliary details |
| Eyebrow / `.g-eyebrow` | 12px / 18px | 600 | Tertiary | Short category; uppercase + .09em tracking |
| Quote / `.g-quote` | 17px / 28.9px | 400 | Quote | Upright, left rule; attribution 12px below |
| Metric / `.g-number` | 32px / 38.4px | 600 | Display | Tabular figures; explicit unit nearby |
| Code / `.g-mono` | 13px / component dependent | 400 | Primary or syntax | Literal data; ligatures off |

These classes set visual roles; choose heading levels according to document structure, not their apparent size. Do not skip from h1 to h4 to obtain a smaller heading.

### Foreground hierarchy

| Token | Color | How to use |
| --- | --- | --- |
| `--text-display` | `#f5f2ea` | Highest salience: one key metric or display heading |
| `--text-heading` | `#e9e5da` | Titles and strong labels |
| `--text-primary` | `#d2d0ca` | Values, body and primary reading content |
| `--text-secondary` | `#bcbbba` | Subleaders, descriptions, helper text |
| `--text-tertiary` | `#b3b4b3` | Metadata and secondary navigation |
| `--text-quote` | `#cacac8` | Quoted statement, separated by a left rule |
| `--text-placeholder` | `#a3a4a4` | Examples inside inset fields only |
| `--text-disabled` | `#848688` | Truly unavailable controls, never useful helper text |
| `--text-decorative` | `#716f6a` | Noninformational ornament only |
| `--text-inverse` | `#191a22` | Text on bright primary / destructive fills |

Do not lower opacity on a text container to create hierarchy: it unpredictably changes text, children and icons together. Choose the semantic color token directly. Hierarchy combines placement, spacing, size, weight and color; do not dim a small caption further just because it is low priority.

Use warm neutral headings by default. Blue text means a link, selection or information; violet means AI provenance; semantic red/green/brass describe actual states. Do not assign each heading level a different accent color. Avoid gradient-filled essential text.

Keep readable prose around 45–75 characters per line. Do not track body text or code; reserve negative tracking for larger headings, and positive tracking for short eyebrows. Use UI text with tabular numbers for data tables; use monospace only when character alignment or literal identity matters. Quotes use Inter upright so a fourth family or fabricated italic face is unnecessary.

## 5. Spacing, density, and geometry

Use a 4px spacing unit. Standard steps: 4, 8, 12, 16, 20, 24, 32, 40, and 48px. Reserve 2px for optical correction, not arbitrary layout spacing.

| Relationship | Default |
| --- | --- |
| Icon to label | 8px |
| Label to input | 6px |
| Input to helper/error | 6px |
| Related controls | 8–12px |
| Form fields | 12–16px |
| Panel padding | 16px |
| Major section gap | 20–24px |
| Workspace gutter | 24px desktop; 14–16px narrow |

Default desktop controls are 32px high with 13px button text, 10px horizontal button padding and 5px vertical padding. Small actions are 28px; large actions are 36px. Keep 44px effective targets for coarse pointers. Data rows are 36px minimum. Wrapped content expands these sizes. Comfortable density is removed.

Use 3px radii for tiny details, 4px for menu items and ordinary badges, 5px for controls, 10px for panels, 7px for child sections, 8px for overlays, and a pill radius only for chips or intentionally capsule-shaped statuses. Nested radii should appear concentric where edges closely follow one another; do not assign the same large radius to every nested box.

Align label baselines, card headers, numeric columns, and repeated toolbar controls. Keep button padding consistent across siblings. Let text determine width unless comparing genuinely equivalent options.

## 6. Borders, highlights and shadow discipline

| Token | Value | Use |
| --- | --- | --- |
| `--border-subtle` | `#383d42` | Decorative separators and section outlines |
| `--border-default` | `#4b5056` | Ordinary card boundaries |
| `--border-strong` | `#6b7178` | Strong perimeter or floating overlay |
| `--border-control` | `#969ca0` | Functional input/button boundary |
| `--border-control-hover` | `#b3b8bc` | Editable-control hover |
| `--border-focus` | `#bed6f4` | Keyboard outline |
| `--edge-light` | Neutral white at 7%, 1px inset top | Top lighting, not a surrounding glow |

Decorative card borders can be subtle. Borders that identify a control need greater contrast. Do not use a gradient ring as a field boundary or error indicator. Invalid inputs use the semantic indicator and a message; focus brightens the existing border while the error message stays visible.

| Elevation | Shadow token | Recipe / use |
| --- | --- | --- |
| Recessed | `--shadow-inset` | `inset 0 1px 3px rgb(0 0 0 / .28)`; fields and wells |
| Rest | `--shadow-rest` | Tight 1px shadow + 4px ambient; ordinary cards |
| Raised | `--shadow-raised` | Tight 2px shadow + 12px ambient; emphasized object |
| Lift | `--shadow-lift` | Reserved legacy depth token; not used for card hover |
| Floating | `--shadow-floating` | Tight 6px shadow + 24px ambient; menus/popovers |
| Modal | `--shadow-modal` | Broad 28px ambient behind dialog and scrim |
| Tooltip | `--shadow-tooltip` | Near shadow + 12px ambient behind compact near-black tip |

CSS holds the exact multi-shadow recipes. Ambient shadows are dark, diffuse and negatively spread. Pair them with an appropriate face and edge: a black shadow alone cannot establish depth on black.

**Rules:** only independent or overlapping objects cast exterior shadows. Internal section groups use an edge or face change. A field uses an inset shadow. Two adjacent ordinary cards use the same elevation. All cards may receive a stationary edge brightening and a faint warm sheen on hover. Native interactive cards keep their real link/button semantics. No card or button scales or translates during hover or press.

Default perimeter is 1px. Selection uses the existing 1px border plus a check; semantic rails are 3px. Never make an entire card border thicker on hover because that changes layout. Selected cards change the existing border color; keyboard focus brightens that same perimeter. Avoid stacked inner and outer rings. Do not clip outlines with `overflow:hidden` on card shells. Clip artwork in its own wrapper instead.

## 7. Accent and semantic roles

| Family | Primary meaning | Surface / text / indicator |
| --- | --- | --- |
| Slate blue | Action, selection, focus | `#2a3b4f` / `#bfd4ee` / `#9bb8da` |
| Information | Informational badge or notice | `#293747` / `#b6c7d9` / `#9bb2cc` |
| Brass | Review required, degraded state, warning | `#342a19` / `#d1b985` / `#c9ad70` |
| Green | Successful, healthy, approved | `#253328` / `#a9c5ae` / `#8eb397` |
| Red | Failed, destructive, critical | `#351b1b` / `#d7a2a2` / `#c47d7d` |
| Violet | AI provenance, inferred or generated content | `#272331` / `#b9b2d2` / `#a49bbd` |
| Teal | Synchronization, streaming or integration activity | `#1b2d2b` / `#9fc3bf` / `#83afaa` |

The v3 blue action fill is `#9bb8da`, hover `#b1cbea`, pressed `#86a5ca`, with dark `#191a22` text throughout. Never automatically place ivory text on these bright fills.

Meaning rules:

- AI-generated does not mean successful. Show provenance with violet and success with a green status if both are needed.
- Live data does not mean healthy. Teal can indicate freshness while a red error indicates an unsuccessful operation.
- Ordinary queued work is neutral. Use brass when delay, review, or attention matters.
- Avoid brass for “premium” inside an operational interface that already uses brass for warnings. Prefer a neutral outlined “Pro” badge. If a product uses brass for premium elsewhere, keep it outside status contexts.
- Critical failures may outrank the normal primary action. The visual order is contextual, not an unconditional action-first ranking.
- Pair semantic color with text and, when helpful, a symbol. An unlabeled colored dot is insufficient.

## 8. Interaction state model

| State | Visual contract | Behavior contract |
| --- | --- | --- |
| Default | Stable material and clear affordance | Available action |
| Hover | Small face or edge change | Fine-pointer preview of interactivity |
| Focus-visible | Single 1px existing control border, brightened | Keyboard location remains visible |
| Pressed | Slightly darker face, inset shadow, no translation | Only during activation gesture |
| Selected | Persistent tint or neutral face plus check, rail, or underline | State survives pointer exit |
| Disabled | Dimmed foreground, quiet face, no hover or motion | Truly unavailable |
| Read-only | Readable value, minimal depth change | Can inspect, select, or copy, but not edit |
| Loading | Stable footprint, activity label or spinner | Prevent duplicate action, preserve context |
| Invalid | Bright red boundary plus icon/text explanation | Describes the error and recovery |
| Dragging | Raised shadow, drag preview, clear destination | Provide a keyboard alternative |

State composition order: disabled blocks activation; loading blocks duplicate submission; selected provides the persistent base; hover modifies that base; pressed is momentary. Focus is an independent overlay and remains visible over selected, invalid, or loading states. Error messaging remains present while the field has focus; the focus border takes precedence over the error border until blur.

Static cards may brighten their edge and receive a faint sheen on hover; keep their cursor unchanged. If a whole card is interactive, use an actual link or button with a clear name. If a card contains multiple controls, keep the container noninteractive and give those controls their own targets.

## 9. Button system

| Variant | Default | Hover / pressed | Intended use |
| --- | --- | --- | --- |
| Primary | Blue fill, inverse text, minimal border | Lighter blue / darker blue | One dominant action per task region |
| Soft | Deep blue face, pale blue text, blue edge | Brighter tint / deep tint | Supporting action associated with the primary task |
| Secondary | Section face, ivory, functional edge | Hover face / pressed face | Standard alternate action |
| Outline | Transparent face, readable edge | Neutral fill / inset dark | Low-weight secondary action |
| Ghost | Transparent, secondary text | Neutral fill / darker fill | Toolbars and contextual actions |
| Link | Underlined blue text | Brighter text | Navigation or inline action |
| Destructive subtle | Dark red face, rose text, red indicator edge | `#482323` / `#251313` | Destructive option among safe actions |
| Destructive solid | `#d7a2a2` fill, inverse text | `#e4b4b4` / `#c48b8b` | Final destructive confirmation |
| Success | Dark green, pale green text | `#304335` / `#18221a` | Explicit approval, when green has a clear meaning |
| Toggle | Neutral default; blue-tinted selected face and marker | Preserve selection during hover | Persistent binary control |

Use `.g-button` alone or `.g-button--secondary` for the secondary variant; other variants append their class. `.g-button--soft` is the tinted supporting action, `.g-button--link` is a button styled as an inline action, and `.g-link` is a navigation link. Use `data-size="sm"` for 28px, the default for 32px, and `data-size="lg"` for 36px minimum height. On coarse pointers, all control variants retain at least 44px effective targets. Split actions are two adjacent buttons with separate accessible names, not a clickable arrow nested inside a button.

Use action labels: “Save changes,” “Run workflow,” “Delete connection.” Keep icons 16–18px and match stroke weight across the product. Use 8px between icon and label. Icon-only buttons require accessible names, adequate targets, and optional tooltips.

Loading must preserve width: reserve an icon slot or layer loading content over a measured label. Use “Saving…” instead of an unlabeled spinner. The stylesheet's `aria-busy` treatment is visual only. Application code must prevent duplicate activation. For native disabled buttons, supply the reason nearby; do not make a tooltip on an unfocusable disabled button the only explanation.

An `aria-disabled` element remains focusable and is not automatically prevented from running. Explicitly block its handler. Never infer behavior from CSS classes alone.

## 10. Forms and editable regions

Fields use an inset face, primary value text, a readable label, and a functional boundary. Hover strengthens the border without making the field look selected. Focus brightens the existing 1px border. The persistent label remains present when a value is entered.

- Default input height: 32px; touch: at least 44px.
- Textareas resize vertically and start at a useful multi-line height.
- Placeholder is an example, not a replacement for the label.
- Prefixes, suffixes, and units use secondary text. Interactive suffix icons need separate buttons.
- Error state includes a specific message connected with `aria-describedby`; apply `aria-invalid="true"`.
- Validate at a meaningful moment, usually blur or submission, rather than marking untouched fields red.
- Read-only values remain legible and copyable. Disabled fields clearly communicate why they cannot be used.
- Required markers must have a text explanation; do not rely on a red asterisk alone.
- Native checkbox/radio controls may inherit the blue accent. Pair them with a generous clickable label.
- Switches represent immediate on/off state; use a checkbox for a choice submitted later. Expose checked state using the appropriate native or ARIA semantics.
- Sliders show their value and unit, provide keyboard adjustment, and include direct numeric entry when precision matters.
- Custom date/file controls require the same state and keyboard coverage as the platform controls they replace.

Example using the reference CSS:

```html
<div class="graphite-ui">
  <section class="g-panel g-stack" aria-labelledby="connection-heading">
    <h2 class="g-heading" id="connection-heading">Connection settings</h2>
    <label class="g-label" for="connection-name">
      Connection name
      <input class="g-field" id="connection-name" name="name"
        placeholder="Production warehouse" aria-describedby="name-help">
    </label>
    <span class="g-meta" id="name-help">Use a name your team will recognize.</span>
    <div class="g-row">
      <button class="g-button g-button--primary" type="button">Save changes</button>
      <button class="g-button g-button--ghost" type="button">Cancel</button>
    </div>
  </section>
</div>
```

## 11. Dropdowns, menus, comboboxes, and popovers

All floating surfaces are opaque. Default face is `#363a3f`; border `#6b7178`; floating shadow; 8px outer radius with 4px menu-item radii. Use 6px shell padding and 8–12px item padding. Items are at least the current control height.

Use an 8px anchor gap, at least 8–12px viewport clearance, collision detection, and a bounded list height with internal scrolling. A select popup usually matches or exceeds its trigger width; a contextual menu sizes to its content. Keep focused items visible while scrolling.

Distinguish:

- **Select/listbox:** chooses a value; selected item shows a check. Expose selection and keyboard highlight independently.
- **Combobox:** text entry plus suggestions; supports input, navigation, selection, and an empty-results state.
- **Menu:** commands, including destructive actions; no value-selection semantics unless using an appropriate checked menu item.
- **Popover:** rich content or controls; use dialog/popover behavior suitable to the content.

Use existing accessible primitives from the project's stack. Wire arrows, Home/End where appropriate, Enter/Space activation, Escape, typeahead, focus return, and outside dismissal according to the component pattern. A native select popup is browser/OS controlled; the reference CSS styles the trigger but does not promise identical option rendering across platforms.

Use a checkmark for selection and a separate neutral background for keyboard highlight. Do not use a bright fill for every hovered menu item. Persistent selection must remain identifiable when highlight moves elsewhere.

## 12. Hover and focus tooltips

Preserve the original dark tooltip identity, but reduce the ordinary border from bright primary blue to `#58718d`. Bright blue on every tooltip would compete with actual keyboard focus. An explicitly emphasized tip may use the primary edge, sparingly.

| Property | Default |
| --- | --- |
| Face | `#080808` |
| Text | `#ebe6d6`, 12px / 18px |
| Border | 1px `#58718d` |
| Radius | 6px |
| Padding | 8px vertical / 10px horizontal |
| Maximum width | 288px; always fit the viewport |
| Gap | 8px from trigger |
| Delay | 400ms hover open; immediate keyboard focus; 100ms close grace |
| Appearance | 120ms opacity, at most 2px movement |

Delay values are kit choices, not accessibility requirements. Tooltips open on hover and keyboard focus, remain visible while trigger or tooltip is hovered, and close on Escape. Allow pointer travel across the gap without premature dismissal. Suppress reopening after Escape until the triggering hover/focus session ends.

Use `role="tooltip"` and associate the trigger using `aria-describedby`. The tooltip supplements a visible or accessible name. It does not receive focus and contains no links or buttons; interactive help belongs in a popover. For touch users, provide an explicit help affordance or inline text for information that matters.

Do not use CSS-only `:hover` or the HTML `title` attribute as the complete tooltip implementation. Collision handling, keyboard access, persistence, and dismissal require behavioral support. Render chart tooltips using the same material, with aligned labels, values, units, and timestamps.

## 13. Badges, chips, tags, and indicators

Badge defaults: 24px minimum height, 12px text, 8px horizontal padding, 6px radius, faint semantic border, semantic surface and readable text. Use short sentence-case labels: “Healthy,” “Review required,” “AI generated,” “Syncing.” A 6px dot or a 12px icon may reinforce the label.

| Component | Purpose | Interaction |
| --- | --- | --- |
| Status badge | Describes a state | Usually static; no hover lift |
| Category tag | Identifies an attribute | Static unless explicitly a filter |
| Filter chip | Changes a persistent filter | Button with selected state |
| Removable chip | Represents an applied selection | Separate labeled remove button |
| Count badge | Indicates quantity | Tabular numerals; label the count's meaning |
| Notification dot | Indicates new content | Accompanied by accessible text |

A chip may look compact while offering a larger hit target. Do not make a 12px close glyph the entire clickable area. Truncated badge text must remain available through its full accessible text and an appropriate visual disclosure if necessary.

Pulse a running indicator briefly on the transition into activity, then leave it steady. Never endlessly pulse all “healthy” or “live” badges. Error badges do not blink.

## 14. Navigation, tabs, lists, and tables

Navigation defaults to readable tertiary text on chrome. Selected navigation uses ivory, a neutral `#333333` face, and a 2px blue rail. Reserve rail space so selection does not shift layout. Hover changes the face and text, but does not imitate selection. Use `aria-current="page"` for current links.

Use underline tabs for flat content divisions and segmented controls for a small, closely related mode choice. Tabs need tab/panel relationships and the expected arrow-key behavior. Do not add `role="tab"` to unrelated navigation links.

Tables use one coherent plane. Header face is slightly darker, body rows are flat, separators quiet. Align numbers to the end; use tabular figures; show units in headers. Right-aligned menus use a consistent action column. Selected rows use tint plus a checkbox or explicit selected marker. Zebra striping is optional and should be very faint; do not combine strong striping with strong hover and selection fills.

Sorting needs a visible direction and `aria-sort` on the active header. Important row actions must be discoverable by keyboard and touch, even if visually de-emphasized until hover/focus. Provide a named scroll region when a table must scroll horizontally. Preserve text size; never squeeze a desktop table into illegible mobile columns.

Keep sticky headers opaque. Show a separation shadow only when content actually passes underneath. Row hover is a shared implementation recipe to add in the application, not an excuse to mark every static row clickable.

## 15. Charts and graphs

Charts are first-class content. Their containing panel establishes grouping; the plot is an inset analytical plane. Use `#181a1c` for the plot, `#333333` for optional grid lines, and readable `#aea99f` labels. Grid lines are structural, while axes or reference lines essential to interpretation need stronger contrast.

### Categorical palette

| Series | Token | Color |
| --- | --- | --- |
| 1 | `--chart-1` | `#86a0bf` |
| 2 | `--chart-2` | `#7fa88a` |
| 3 | `--chart-3` | `#b89a5f` |
| 4 | `--chart-4` | `#8f86a8` |
| 5 | `--chart-5` | `#6f9c97` |
| 6 | `--chart-6` | `#b86f6f` |
| 7 | `--chart-7` | `#a88973` |
| 8 | `--chart-8` | `#8c9a6d` |

These colors contrast with the default plot but are not guaranteed to distinguish every pair or every color-vision condition. Prefer four simultaneous series; above six, use direct labeling, small multiples, filtering, or another encoding. Bind series identity to a stable key, not its current sorted position. Reserve red/green for favorable/unfavorable only when that is the actual meaning.

- Lines: 2px default, 2.5px emphasized; combine solid/dashed styles and markers for identity.
- Bars: clean fills, no bevels, shadows, or decorative outlines; use spacing and direct labels.
- Area fills: 8–16% opacity beneath a sufficiently contrasted line. Fills are supporting, not the only data encoding.
- Selected mark: ring or shape plus label, not just a hue shift.
- Crosshair: quiet but legible, clipped to the plot; tooltip remains outside the clip.
- Tooltip: series label, value, unit, and time/category. Align numeric values; avoid unnecessary precision.
- Missing data: gap or explicit missing state. Do not interpolate silently or turn absence into zero.
- Forecasts: dashed line and a labeled uncertainty band; measured and inferred values remain distinguishable.
- Axis scale: bar charts normally begin at zero. Clearly disclose truncated scales where appropriate for other chart types.
- Heatmaps: use an ordered luminance scale, not the categorical palette. Diverging scales need a meaningful midpoint. Validate those scales for the actual dataset.
- Dark-mode canvas/SVG libraries: resolve the CSS tokens into actual color strings and update them when theme settings change.

Provide a text summary and an accessible data view or equivalent method to inspect values. Keyboard and touch users must be able to access the information exposed through pointer hover. Announce meaningful selection changes, not every crosshair movement.

Do not animate numerical readouts or replay drawing animations after every refresh. Preserve the user's zoom, selected series, and inspection position during incoming data updates. Stop or defer motion while a user is inspecting a specific point.

## 16. Card materials, borders and effects budget

Choose **one material + one edge + one composition**. This explicit API keeps different products consistent:

```html
<article class="g-card g-card--metric"
  data-material="gradient" data-edge="quiet">...</article>
```

### Materials

| `data-material` | Face / construction | Best use | Child treatment |
| --- | --- | --- | --- |
| `flat` | Solid panel, no shadow | Dense records, repeated list cards | Divider or inset |
| omitted | Solid panel + top edge + rest shadow | Default settings and content | Section group → field |
| `raised` | Raised face + raised shadow | Inspector or emphasized independent object | Inset field / dark well |
| `gradient` | `#343a40` → `#24272a` diagonal wash | Metric, summary or overview card | Solid inset children |
| `spotlight` | Muted blue radial wash over graphite | Featured workflow or insight | Solid child groups |
| `glass` | 94%-opaque gradient + 16px backdrop blur | A bounded contextual card above controlled decoration | Opaque inputs and controls |
| `well` | Deep face + inset shadow | Result tray or embedded payload | Flat contents; no child lift |

The default solid plus six explicit materials form the available material family. Glass uses an opaque `#2a2e32` fallback without blur support. Reduced-transparency and effects-off modes use opaque faces. Keep glass to a controlled dark backdrop, cap its area, and avoid multiple stacked blurred layers. The high opacity is intentional: typography should remain stable. Glass over bright photography is a new composition requiring fresh contrast checks. Menus, tooltips and dialogs remain opaque.

### Edge variants

| `data-edge` | Appearance | Use |
| --- | --- | --- |
| omitted | Default solid 1px | Ordinary independent card |
| `quiet` | Subtle 1px | Dense, repeated static content |
| `strong` | Stronger slate 1px | Deliberate separation |
| `dashed` | Dashed 1px | Empty drop zone or optional slot |
| `rail` | 3px leading accent rail | Review, provenance or operational state; include text |
| `gradient` | Blue → muted violet → teal 1px ring | One featured or selected artifact, with explicit text |

`data-edge="gradient"` supplies its own opaque graphite face to keep the ring from bleeding through. Therefore pair it only with an omitted material or `flat`; do not combine with glass, spotlight or the gradient-face material. This avoids invisible overrides and stacking effects. Use `--card-accent` for a rail, or apply `data-tone` to select a semantic indicator. Dashed decoration does not implement drag-and-drop; provide an actual upload button and error states.

**Effects budget:** an ordinary card gets face + edge + rest shadow. A featured card may add **one** conspicuous treatment: a gradient face, spotlight, glass or gradient border. Its children stay solid. One such card per task region is the default; a gallery may display all variants for comparison. Do not animate gradient stops, add rotating rings, glow every edge, or mix strong blur with large shadows on all nested panels.

**Button finish:** `data-finish="gradient"` is only for `.g-button--primary`; it uses a subtle bright blue tonal ramp and dark text. Do not apply it to danger, success, ghost or selected-toggle variants. Hover lightens the ramp, press becomes a darker solid, and disabled/busy controls fall back to their ordinary fill. The gradient is optional, not the default action style.

## 17. Motion and animated accents

| Event | Duration | Movement / easing |
| --- | --- | --- |
| Hover or border change | 120ms | Color only |
| Press feedback | 80–120ms | Color/shadow feedback only; no translation |
| Menu/popover entry | 160–220ms | Opacity plus at most 4px from anchor |
| Exit | 100–140ms | Opacity, shorter than entry |
| Dialog entry | 220ms | Opacity plus 4–6px movement |
| Accordion expansion | 180–220ms | Measured height; preserve reading position |
| Reordering | 180–240ms | Positional continuity, no bouncing |
| Active edge | Two 2-second cycles | Small opacity shift; ends steady |
| Skeleton cue | Three 1.4-second cycles | Low-amplitude opacity; ends static |

Default easing: `cubic-bezier(.2, 0, 0, 1)`. Entrance easing: `cubic-bezier(.16, 1, .3, 1)`. Avoid spring overshoot for dense operational tools.

Animate transform and opacity when possible. Transition only named properties; do not use `transition: all`. Do not move table rows on hover. Do not animate every card when the page loads. Background polling must not restart entrance animations.

A spinner can run while a task is actually pending, accompanied by a clear text status. Determinate work uses a progress value; do not fabricate a percentage. Reduced motion removes movement and looping effects while leaving a static indicator and status text. Pause nonessential animations when offscreen or when the document is hidden. A user preference to disable ambient effects is appropriate if a product uses them frequently.

Animated accents must correspond to state transitions or real work. They must not imply data freshness, model reasoning, confidence, or network activity that the system has not established.

## 18. Modals, drawers, toasts, and stacking

Default z-index bands: content 0, sticky 10, dropdown 30, scrim 40, modal 50, toast 60, tooltip 70. These are **bands within the same stacking context**, not a universal ordering guarantee.

Transforms, opacity, isolation, and positioned ancestors can create stacking contexts. Use a deliberate overlay root. Mount modal-owned popups within the modal's permitted scope. Browser top-layer dialogs and popovers are ordered by the platform; a high z-index outside the top layer cannot leap above them.

Dialogs need a clear title, sensible initial focus, focus containment, background inertness, dismissal behavior appropriate to the task, and focus return. Preserve a visible close action. For destructive confirmation, explain the consequence and name the action precisely. Do not default focus to the destructive choice.

Drawers use a directional shadow toward the underlying workspace. Choose modal versus nonmodal behavior intentionally; a persistent inspector need not block its parent workspace. Keep independent scrolling clear and avoid trapping the user in stacked scroll areas.

Toasts communicate brief outcomes, usually with a neutral elevated face and a semantic icon or edge. Use a polite live region for routine outcomes. Pause timeout while hovered or focused. If a message contains an important action or error recovery, keep it until dismissed or persist the same information elsewhere. Avoid obscuring form controls, focused elements, or primary mobile navigation.

Do not announce both an inline update and an identical toast through competing live regions.

## 19. Loading, empty, error, offline, and partial states

| State | Display |
| --- | --- |
| First load | Skeleton matching the eventual geometry; one loading label |
| Background refresh | Preserve existing data, show a small refresh indicator |
| Empty product state | Explain what belongs here and provide the next useful action |
| Empty search result | Preserve query/filter controls; offer clear/reset |
| Recoverable error | Local message with cause where known and a retry/correction action |
| Partial data | Keep successful regions; mark unavailable sections explicitly |
| Offline or stale | Show last-updated time and clear freshness status |
| Permission restriction | Explain access requirements; avoid making missing data look like zero |

Reserve layout space to avoid jumping controls and charts. Do not use fake placeholder numbers. Error messaging should name what failed, what remains available, and what the user can do next.

## 20. Responsive behavior and accessibility

Use content-driven breakpoints. A typical application may use 240px navigation, a flexible workspace, and a 320px inspector on wide screens. Collapse the inspector first when working space becomes insufficient; navigation may then become a drawer. Do not force these dimensions into a project with different needs.

At narrow widths, use one-column forms, wrap toolbars, preserve primary actions, and move secondary actions into a labeled menu when appropriate. Let long headings wrap. Use deliberate horizontal scrolling for inherently wide tables. Test at 320, 360, 768, 1024, and 1440 CSS pixels, and test zoom independently.

Accessibility requirements underlying this kit:

- Normal text, including useful metadata and placeholders, should reach 4.5:1 contrast; large text has a 3:1 threshold. Disabled-component and purely decorative exceptions do not include ordinary unselected navigation. [W3C: text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- Visual information required to identify controls and states should meet the applicable 3:1 non-text contrast criterion. Subtle decorative separators are a different role. [W3C: non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Hover/focus content must meet the applicable dismissible, hoverable, and persistent behavior requirements. [W3C: hover or focus content](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)
- WCAG 2.2's AA target-size criterion uses 24×24 CSS pixels with specified exceptions; this kit chooses larger default controls and approximately 44px touch targets. [W3C: target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

Also validate keyboard order, visible/unobscured focus, accessible names, text alternatives, screen-reader state announcements, 200% text resizing, 400% zoom/reflow where applicable, and user-selected forced colors. Honor reduced motion. These are product-level checks: a palette alone cannot establish conformance.

Contrast must be evaluated against the actual rendered background, including hover, selection, gradient stops, overlays, and disabled-state boundaries where applicable. When essential text fails, brighten it or darken its background. Do not “fix” readability by giving all labels heavy weight or enlarging every small annotation.

## 21. Implementation and token governance

Apply `.graphite-ui` to a common ancestor of app content and overlay roots. The stylesheet is scoped, sets `color-scheme: dark`, and does not globally restyle unrelated pages. If portal content escapes the scope, it will not inherit the kit. Attach the scope to the appropriate shared ancestor rather than duplicating token values in components.

Token architecture:

1. **Primitives:** raw neutral and palette values.
2. **Semantic tokens:** surface, text, border, action, status, chart, and motion roles.
3. **Component recipes:** button variants, fields, panels, badges, and overlays.

Application components should consume semantic tokens; adding raw hex values in individual features requires a documented new role. Component variants should be explicit APIs such as `variant="primary"`, `tone="warning"`, `density="compact"`, or `elevation="raised"`. Adapt names to the project's conventions.

Reference CSS coverage: three-family typography, material cards, nested sections, code/terminal recipes, typography helpers, panels, inset regions, button variants and states, inputs, native accent controls, navigation, badges, alerts, overlay materials, tooltip material, native-dialog styling, tables, chart plot surface, loading indicators, finite accent animations, reduced motion, and forced-color support.

Behavior still to implement: tooltip timing/positioning, menu/combobox keyboard models, tabs, custom switches, validation, loading action guards, focus management, dialogs, chart rendering and inspection, toast lifecycle, and drag/drop alternatives. Do not ship visually styled markup as if these behaviors were complete.

Map any existing component library to these tokens rather than replacing functioning accessible primitives. For utility CSS, expose semantic theme values and shared variants. Avoid long per-instance class strings that reimplement the design differently on each screen.

### Migration from the original kit

| Original concept | Current mapping |
| --- | --- |
| `--surface-deep: #141414` | `--neutral-925` remains available; deep now explicitly means `#0a0b0c` |
| `--surface-recessed` | `--surface-inset` for content; `--surface-chrome` for navigation |
| `--surface-structure` and neighboring workspace grays | Usually `--surface-workspace`; use spacing for subdivisions |
| `--text-muted` for inactive items | `--text-tertiary`; decorative dim text becomes `--text-decorative` |
| `--state-active-neutral` and selected neutral | Pressed becomes temporary; selection uses a persistent explicit recipe |
| `--input-border: #333333` | `--border-control` where boundary identifies the field |
| `--shadow-panel` | Choose rest or raised according to actual component role |
| Bright blue tooltip border | Subtler primary border for ordinary tips |
| AI in blue, violet, and brass | Blue for actions; violet for provenance; brass for review required |
| Chart axis `#716f6a` | Readable axis/label tokens; retain faint grid separately |

Existing consumers may require aliases during migration. Audit each old token's actual use before aliasing: `surface-recessed` used for a sidebar and a text field describes two distinct semantic roles. Do not blindly replace all occurrences with one new meaning.

## 22. Acceptance checklist for implementing agents

Before claiming a UI is polished, verify:

- [ ] A new viewer can identify the page's main task and primary action.
- [ ] Parent surfaces, child fields, cards, and floating elements read as different relationships.
- [ ] At least one composed screen includes a field inside a card, an open dropdown, and a tooltip above content.
- [ ] Repeated elements use consistent spacing, typography, radii, icons, and state behavior.
- [ ] Static objects do not falsely advertise clickability.
- [ ] Hover, focus, pressed, and selected remain distinguishable in combination.
- [ ] Critical states have clear labels, recovery paths, and appropriate visual priority.
- [ ] Tooltip information is available by focus and appropriate touch interaction; Escape and pointer travel work.
- [ ] Menus and dialogs remain visible near viewport edges and within the correct overlay scope.
- [ ] Text and essential non-text contrast are checked in actual rendered states.
- [ ] Long labels, realistic values, empty results, loading, partial failure, and disabled reasons fit.
- [ ] Charts communicate units, missing data, series identity, and values without relying on hover or color alone.
- [ ] Keyboard-only operation, reduced motion, forced colors, narrow layouts, and zoom are exercised.
- [ ] No unbounded decorative animation, repeated shimmer, fake progress, or unnecessary layout shift remains.
- [ ] Screenshots are inspected at desktop and narrow sizes; runtime checks support behavior claims.

## 23. Copyable instruction for an implementation agent

> Implement this interface using Graphite UI Kit v3. Preserve its graphite surfaces, warm ivory text, slate-blue actions, and restrained semantic accents. Begin with the user's task and information hierarchy, then assign surface roles: root/chrome, workspace, panel, inset content, raised object, and floating overlay. Nesting alone must not make a surface brighter. Reuse existing accessible primitives and map them to semantic tokens and shared component variants. Complete all relevant interaction and asynchronous states. Apply subtle top lighting, shadows, gradients, and brief state-driven accents only where they improve depth or feedback. Keep typography readable, layouts disciplined, and controls clearly operable. Validate the composed interface with realistic data, keyboard and touch access, contrast, small screens, zoom, reduced motion, and overlay edge cases. Deliver working behavior and inspected visual output; distinguish any remaining implementation gaps from completed functionality.

## 24. Card composition catalogue

These are compositions of the shared card shell, not unrelated visual languages.

| Design | Recipe | Anatomy and rules |
| --- | --- | --- |
| Standard content | `.g-card` | Header, optional description, body, optional divided footer |
| Layered settings | `.g-card--split` | Section-face header, solid body, fieldset group, inset fields, action footer |
| Metric | `.g-card--metric` + gradient or flat | Caption, primary number, unit, explicit comparison label; no fabricated trend |
| Featured insight | Spotlight or gradient edge | Title, short summary, provenance badge, one related action |
| Contextual glass | Glass material on a controlled backdrop | Small header, description, solid child; never essential controls over transparency |
| Selectable object | Native `button.g-card` | Single label/description, explicit selected text or check, `aria-pressed`; no nested controls |
| Operational state | Rail + `data-tone` | Status label, evidence/time, recovery action; color reinforces the words |
| Empty / upload | Dashed edge | Specific empty message, supported format/limit if known, actual browse/upload control |

Use `.g-card__header`, `.g-card__body`, and `.g-card__footer`. Headers align titles and optional actions; long text wraps. Footer has a top divider, wraps on narrow screens, and maintains a stable gap. Hide empty slots instead of preserving an unexplained blank strip. `.g-card--split` owns its own padding; do not add a second generic padding wrapper.

A whole-card navigation destination uses `<a>`. A single selection uses `<button type="button" aria-pressed="...">`. A container with several actions uses `<article>` or `<section>` and remains static. Avoid nested links/buttons and click handlers on noninteractive `<div>` elements. Never add hover translation or scaling to any card.

### Layered settings example

```html
<section class="g-card g-card--split" aria-labelledby="config-title">
  <header class="g-card__header">
    <div>
      <h2 class="g-heading" id="config-title">Connection settings</h2>
      <p class="g-caption">Configure the source and refresh behavior.</p>
    </div>
    <span class="g-badge" data-tone="live">Connected</span>
  </header>
  <div class="g-card__body">
    <fieldset class="g-fieldset g-stack">
      <legend>Source details</legend>
      <div class="g-field-group">
        <label for="source-name" class="g-label">Connection name</label>
        <input class="g-field" id="source-name" name="sourceName"
          value="Production warehouse" aria-describedby="source-help">
        <span class="g-meta" id="source-help">Visible to workspace members.</span>
      </div>
      <div class="g-field-group">
        <label for="refresh" class="g-label">Refresh interval</label>
        <select class="g-field" id="refresh" name="refresh">
          <option>Every 15 minutes</option><option>Every hour</option>
        </select>
      </div>
    </fieldset>
    <div class="g-surface" data-surface="well">
      <span class="g-eyebrow">Current source</span>
      <p class="g-mono">warehouse.events</p>
    </div>
  </div>
  <footer class="g-card__footer">
    <button type="button" class="g-button g-button--primary">Save changes</button>
    <button type="button" class="g-button g-button--ghost">Cancel</button>
  </footer>
</section>
```

Use a form and submission/validation handlers when this composition edits persisted data. The example illustrates the hierarchy, not a persistence layer.

## 25. Code snippets, editors, diffs and literal data

A code surface is a recessed instrument, with UI chrome above it. Its face is intentionally different from ordinary fields and terminals. All code remains selectable. Copy actions copy the raw underlying string, not visual line numbers, syntax markup or prompt glyphs.

| Element | Recipe | Contract |
| --- | --- | --- |
| Block viewer | `.g-code` → toolbar + `<pre><code>` | Filename/language at left, copy and optional wrap at right |
| Inline token | `.g-code-inline` | Monospace, small background, modest border; no interactive implication |
| Keycap | `.g-kbd` on `<kbd>` | Describes a real shortcut; never invent platform behavior |
| Wrapping | `data-wrap="true"` on viewer | Soft wrap only; raw string unchanged |
| Diff | `.g-code-line[data-diff="added|removed"]` | Green/red surface plus `+`/`−` or explicit text label |
| Editable code | Existing editor engine | Map editor theme, selection, gutter and diagnostics to kit tokens |

Default code is 13px / 1.8, 16px padding, 2-space tab size, no ligatures. Use a named, keyboard-focusable scroll region for long blocks; preserve horizontal scroll for indentation-sensitive code. Height caps at 26rem by default. Never clip code without a scroll affordance or an expand action. A plain `<pre>` is a viewer, not an editable IDE.

### Syntax mapping

| Class suffix `.g-token--…` | Token | Color | Role |
| --- | --- | --- | --- |
| `keyword` | `--code-keyword` | `#c8b6e8` | Keywords, language constructs |
| `string` | `--code-string` | `#a7d3b1` | String literals |
| `function` | `--code-function` | `#acd1f4` | Function names |
| `number` | `--code-number` | `#e0c194` | Numeric/boolean literals |
| `comment` | `--code-comment` | `#98a7b8` | Comments, still legible |
| `punctuation` | `--code-punctuation` | `#bac4d0` | Braces, separators |
| `property` | `--code-property` | `#a6d4d1` | Object keys, attributes |

Map classes from the actual syntax highlighter; CSS does not tokenize code. Render untrusted code as text or through a trusted escaping highlighter. Never insert unescaped payloads through `innerHTML`. Optional line numbers must be `aria-hidden`, unselectable and outside the copied source. Diff markers must be accessible without color.

```html
<div class="g-code" data-wrap="false">
  <header class="g-code__toolbar">
    <span class="g-mono" id="snippet-label">pipeline.ts</span>
    <button class="g-button g-button--ghost" data-size="sm"
      type="button" aria-label="Copy pipeline.ts">Copy</button>
  </header>
  <pre tabindex="0" role="region" aria-labelledby="snippet-label"><code><span
    class="g-token--keyword">const</span> mode = <span
    class="g-token--string">"review"</span>;</code></pre>
</div>
```

Copy should provide a polite “Copied” status after success and a clear fallback if the clipboard is unavailable. Keep the button width stable. The standalone showcase implements copying and wrapping; production integration owns permissions and error handling.

## 26. Terminal, console and log surfaces

Use `.g-terminal` with toolbar, body and optional footer. Body uses the terminal face; toolbar stays on the section plane. Terminal text is 13px IBM Plex Mono with generous line spacing. Do not render a decorative terminal as if it were connected to a live process.

| Token | Color | Meaning |
| --- | --- | --- |
| `--terminal-prompt` | `#94c9c2` | Prompt symbol / context |
| `--terminal-command` | `#e9e5da` | Entered command |
| `--terminal-output` | `#b8c1cc` | Ordinary result text |
| `--terminal-dim` | `#98a7b8` | Time, path or secondary log metadata |
| `--terminal-success` | `#a7d3b1` | Explicit successful outcome |
| `--terminal-warning` | `#e0c194` | Warning with label |
| `--terminal-error` | `#e4abab` | Failure with label and useful context |

Terminal examples use `g-terminal__prompt`, `__command`, `__dim`, `__success`, `__warning`, and `__error`. Add explicit labels such as `[warn]` and `[error]`. A neutral command/output stream does not become all green. Paths and timestamps remain readable.

For real streaming output: batch screen-reader announcements, keep prior output selectable, stop auto-follow when the user scrolls upward, provide “Jump to latest,” and allow pausing visual updates. Do not turn every token into a live-region event. Mask known secrets and redact sensitive values before output rendering. Logs are text, not executable HTML.

A real terminal emulator owns ANSI parsing, input, selection, process lifecycle and keyboard behavior. Do not implement an interactive terminal as `contenteditable` styled to resemble one. The kit's body is a read-only transcript. Avoid a blinking cursor unless the terminal actually accepts input; reduced motion removes blinking. Status footers identify simulated/static output honestly.

## 27. Dropdown and tooltip implementation details

Use the section 11/12 behavior models. The new styling adds grouped menu labels, option descriptions, selected checks and separators. A menu item can have a 14px primary label and a 12px description; both remain readable on neutral highlight. Keep a selected check visible while keyboard highlight moves. Do not use separators for each row.

- Native `<select>` is the simplest value picker; platform popup rendering varies.
- For custom choices use a proven select/combobox primitive, then map its state attributes to `.g-option`.
- For action menus use command semantics, not listbox semantics.
- For help containing links or buttons use an interactive popover, not `role="tooltip"`.
- Keep popup content opaque even if its trigger card is glass.
- When mounting in a portal, retain the `.graphite-ui` ancestor and inherited density tokens.
- Width, placement, collision handling, scroll containment and keyboard behavior belong to the component implementation. CSS alone does not supply them.

The showcase includes a native select and an illustrative custom listbox. The custom listbox demonstrates selection, arrow navigation, Home/End, typeahead, Escape, outside dismissal and viewport clamping. A native modal demonstrates focus containment and return. They are reference demonstrations, not a packaged framework library.

## 28. Step groups, progressive disclosure and complex workflows

For sequential work use `.g-step-list` and `.g-step`. Display the sequence as an ordered list in the DOM; the custom visual counter does not change ordering semantics. Current step uses `aria-current="step"`, a blue marker and a visible “Current” label. Completed steps use a check and “Complete”; upcoming steps keep readable text. A disabled step is genuinely unavailable, not merely incomplete.

Use steps when work has meaningful progression. For parallel configuration groups, use headings/fieldsets or tabs instead. Expanding every step into a raised card creates false importance. Keep inactive steps compact and expand the active section into fields or a code result where appropriate. Native `<details>` works for simple optional settings; custom accordions need accurate expanded state and focus behavior.

## 29. Integration and migration notes

1. Replace the old stylesheet with `graphite-ui.css`; do not load both versions.
2. Keep `.graphite-ui` on the root that also contains overlays.
3. Adopt `.g-card` for new compositions. Existing `.g-panel` remains supported and uses new surface/radius tokens.
4. Replace one-off grays with the explicit plane or recessed token that matches the role.
5. Map application component variants to material, edge, size and tone; validate unsupported combinations.
6. Supply font assets in production. The showcase embeds fonts; the CSS remains independent of external hosts.
7. Re-check screens relying on old padding, exact color values or heading metrics. Existing classes surviving does not eliminate visual review.

Recommended component API:

```ts
type CardMaterial = 'solid' | 'flat' | 'raised' | 'gradient' | 'spotlight' | 'glass' | 'well';
type CardEdge = 'default' | 'quiet' | 'strong' | 'dashed' | 'rail' | 'gradient';
// Map solid/default to omitted data attributes.
// Reject gradient edge + glass/gradient/spotlight/raised/well material.
// Interactive card = one native link or button; static card may contain controls.
```

The kit provides **visual tokens and reference recipes**, not a React/Vue component package. Application code supplies real submissions, menus, tooltips, editor integration, live streaming, drag/drop and persistence. The HTML showcase implements local demonstrations and labels illustrative data; it makes no external API calls.

## 30. v3 delivery validation

Validation results are recorded after checking the delivered stylesheet and showcase. The palette alone does not certify an application. See the accompanying delivery notes at the end of this document for actual completed checks and remaining product-level work.

**Completed checks:** all CSS variable references resolve; CSS rule delimiters are balanced; JavaScript passes Node's syntax check; the showcase has unique IDs and valid label/ARIA references. Seventy-three solid-color pairings were calculated: normal-text pairings meet 4.5:1 and tested functional borders meet 3:1. The lowest tested normal-text ratio is 4.78:1. The showcase embeds its five font faces and license notices, and has no external script, image, stylesheet or font dependencies.

**Verification limit:** a browser executable was unavailable, and attempts to download one failed. Browser-rendered layout, actual interaction execution, keyboard/screen-reader use, responsive reflow and composited gradient/glass rendering have therefore **not** been verified in this environment. These remain acceptance checks for the consuming product. The HTML implements the stated demonstration behaviors, but that is not a runtime test claim.

**Files:** `graphite-ui.css` is the complete replacement stylesheet; `graphite-ui-kit.md` is the design and implementation contract; `graphite-showcase.html` is a self-contained visual reference. Open the HTML in a modern browser to try the controls. Changes in the showcase last only for the current page session. For application work, load the CSS and map existing accessible components to its classes/tokens.

**Version:** 3.2. **Scope:** dark operational interfaces, desktop-first with responsive rules. A light theme requires its own palette and material validation.


## 31. v3.2 refinement: compact, neutral, precise

This revision removes comfortable density and the “The everyday card” showcase tile. Use compact geometry throughout: 16px card padding, 12px child padding, 14px gallery gaps, and 32px default desktop controls. Small/large buttons are 28/36px; preserve 44px touch targets.

Selected controls use a single existing 1px perimeter with an explicit selected marker. Fields brighten their existing border for keyboard focus, eliminating the mismatched double outline visible in the earlier preview. Forced-colors mode retains a thin system focus outline. Error text remains visible when focus temporarily takes precedence over the error border.

Graphite faces balance the previous cool and warm treatments. Blue belongs to actions and selections. Corners are 10px for cards, 7px for sections, 5px for fields/buttons and 8px for overlays.

Card hover uses edge brightening and a subtle warm surface sheen only. There is no scaling, lifting, vertical translation or expanding shadow. Static cards retain their ordinary cursor and semantics. Gradient-border cards brighten their gradient edge without replacing it with a solid border.

The original 73-pair results above describe v3.0. Updated v3.2 checks are recorded below.

**v3.2 checks:** all 73 text/control contrast pairings pass, with a minimum tested normal-text ratio of 4.85:1. CSS variable references resolve. Showcase JavaScript passes syntax validation; the comfortable selector and removed card are absent. Browser rendering remains unverified in this environment.


## 32. v3.2: persistent borders and balanced temperature

The neutral palette now sits halfway between the cool v3.0 and warm v3.1 palettes. Compact dimensions and corner geometry are unchanged.

Field hover applies only to idle, editable fields. It must not replace a focused, explicitly selected or invalid border. Focus uses the existing 1px bright focus border, selection uses the existing 1px accent border, and invalid fields retain their error border until focus takes precedence. Error text remains visible. Use `data-selected="true"` only when a field has a genuine persistent selection state; normal editing uses native focus. Selected toggle buttons retain their accent border during hover, and keyboard focus takes precedence over selection.

**v3.2 validation:** all 73 contrast pairs pass; CSS references resolve and JavaScript syntax checks pass. Focus is explicitly excluded from the field hover selector. Browser rendering remains unverified.

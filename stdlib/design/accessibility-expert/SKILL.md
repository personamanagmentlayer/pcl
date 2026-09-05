---
name: accessibility-expert
version: 1.0.0
description: >-
  Build interfaces usable by everyone: WCAG 2.2 conformance, semantic HTML, ARIA, keyboard
  navigation, screen readers and accessible forms. Use when the user mentions accessibility,
  a11y, WCAG, ARIA, screen readers, keyboard navigation, colour contrast, focus management,
  the European Accessibility Act or Section 508, or when the task involves making a
  component, form, modal or data table usable without a mouse or with assistive technology.
category: design
tags:
  [
    accessibility,
    a11y,
    wcag,
    aria,
    screen-readers,
    keyboard-navigation,
    contrast,
    inclusive-design,
    forms,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(npm:*, npx:*, node:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: intermediate
---

# Accessibility Expert

Accessibility is a property of the markup and the interaction model, not a layer
added afterwards. Most of it is achieved by using the right element; the rest is
focus, contrast and honest testing.

## Core Concepts

### The Four Principles

WCAG organises everything under POUR:

- **Perceivable** — information must be available to at least one sense that
  works for the user: text alternatives, captions, sufficient contrast.
- **Operable** — every function must be reachable and usable by keyboard, with
  enough time and no seizure triggers.
- **Understandable** — predictable behaviour, readable text, errors that explain
  themselves.
- **Robust** — valid markup and correct semantics, so assistive technology can
  interpret it.

Conformance levels: A (minimum), **AA (the legal and practical target)**, AAA
(specific contexts). Regulation generally requires AA — the European Accessibility
Act applies from 28 June 2025 to consumer-facing digital products and services in
the EU, and Section 508 applies to US federal procurement.

### The Right Element Is Most of the Work

```html
<!-- Not focusable, no role, no keyboard activation, invisible to screen readers -->
<div class="btn" onclick="submit()">Submit</div>

<!-- Focusable, announced as a button, responds to Enter and Space, free -->
<button type="submit">Submit</button>
```

Native elements bring focus behaviour, keyboard handling, state announcement and
platform conventions. Recreating them with `div` and ARIA means reimplementing
all of it, and the reimplementation is where the defects live.

### ARIA's First Rule Is Not to Use It

Use ARIA only when no native element expresses the semantics. Incorrect ARIA is
worse than none: it overrides what the browser would have reported correctly.

## Keyboard

Everything achievable with a mouse must be achievable with a keyboard, in a
sensible order, with a visible focus indicator.

```css
/* Never remove focus indication without replacing it */
:focus-visible {
  outline: 3px solid #0b5fff;
  outline-offset: 2px;
}

/* This is a defect, not a style choice */
*:focus {
  outline: none;
}
```

WCAG 2.2 added **2.4.11 Focus Not Obscured**: the focused element must not be
hidden behind a sticky header or cookie banner. Test by tabbing through the page
with the header visible.

### Focus management

Focus must go somewhere sensible after a view change, and must be trapped inside
a modal while it is open.

```javascript
function openDialog(dialog, invoker) {
  dialog.showModal(); // <dialog> traps focus natively
  dialog.querySelector('[autofocus], button, [href], input')?.focus();

  dialog.addEventListener('close', () => invoker.focus(), { once: true });
}
```

Returning focus to the element that opened the dialog is what keeps a keyboard
user oriented. Losing focus to `<body>` means starting the tab sequence again.

For single-page navigation, move focus to the new page's heading and announce the
change:

```javascript
function onRouteChange(title) {
  document.title = title;
  const heading = document.querySelector('main h1');
  heading.setAttribute('tabindex', '-1'); // focusable programmatically, not by tab
  heading.focus();
}
```

### Skip links

```html
<a class="skip-link" href="#main">Skip to main content</a>
…
<main id="main" tabindex="-1">…</main>
```

```css
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: 1rem;
  top: 1rem;
  position: fixed;
  z-index: 999;
}
```

## Semantics and Structure

```html
<header>
  <nav aria-label="Primary">…</nav>
</header>
<main id="main">
  <h1>Invoices</h1>
  <section aria-labelledby="overdue-heading">
    <h2 id="overdue-heading">Overdue</h2>
    …
  </section>
</main>
<footer>…</footer>
```

- **One `<h1>` per page**, and headings that descend without skipping levels.
  Screen reader users navigate by heading; a broken outline is a broken map.
- **Label repeated landmarks** — several `<nav>` elements need `aria-label` to be
  distinguishable.
- **Lists for lists**, `<table>` for tabular data with `<th scope>` and a
  `<caption>`.

## Images and Media

```html
<!-- Informative: describe the information, not the picture -->
<img
  src="chart.png"
  alt="Revenue grew from €1.2M to €1.8M between January and June 2026"
/>

<!-- Decorative: hide it -->
<img src="divider.svg" alt="" />

<!-- Functional: describe the action -->
<button><img src="trash.svg" alt="Delete invoice INV-2026-0042" /></button>
```

An empty `alt` is correct for decoration; a **missing** `alt` makes the screen
reader read the filename. Never write "image of" — the role is already announced.

Video needs captions (1.2.2) and audio description where visual information is
not in the soundtrack (1.2.5). Auto-generated captions are a starting point, not
conformance.

## Forms

Forms are where accessibility failures cost the most, because they block
completion.

```html
<div class="field">
  <label for="vat">VAT number</label>
  <input
    id="vat"
    name="vat"
    type="text"
    autocomplete="off"
    aria-describedby="vat-hint vat-error"
    aria-invalid="true"
    required
  />
  <p id="vat-hint">Format: two letters followed by up to 12 characters.</p>
  <p id="vat-error" class="error">
    Enter a VAT number, for example DE811907980.
  </p>
</div>

<div role="alert" aria-live="assertive">
  There is 1 problem with this form. <a href="#vat">Enter a VAT number</a>
</div>
```

The rules that matter:

- **Every input has a `<label for>`.** A placeholder is not a label: it disappears
  on input and often fails contrast.
- **Errors are text, associated by `aria-describedby`**, and say how to fix the
  problem. Colour alone fails 1.4.1.
- **Announce the error summary** with `role="alert"` and link each item to its
  field.
- **`autocomplete` tokens** on personal fields satisfy 1.3.5 and help everyone.
- **Do not disable the submit button** while invalid — a screen reader user gets
  no explanation of why nothing happens.

WCAG 2.2 additions relevant here: **3.3.7 Redundant Entry** (do not ask for the
same information twice in a process) and **3.3.8 Accessible Authentication** (no
cognitive test such as transcribing a code, unless an alternative exists).

## Colour and Motion

| Requirement            | Ratio    | Applies to                                     |
| ---------------------- | -------- | ---------------------------------------------- |
| 1.4.3 Contrast (AA)    | 4.5:1    | Text under 24px, or under 19px bold            |
| 1.4.3 Large text       | 3:1      | 24px+, or 19px+ bold                           |
| 1.4.11 Non-text        | 3:1      | Icons, borders, focus indicators, chart series |
| 2.5.8 Target size (AA) | 24×24 px | Interactive targets                            |

Never encode meaning in colour alone (1.4.1): a red border needs an icon or text
beside it. Test with a greyscale filter.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Respecting this is not optional for users with vestibular disorders, for whom
parallax and large transitions cause physical symptoms.

## Dynamic Content

```html
<!-- Polite: announced when the user is idle. For status updates. -->
<div aria-live="polite" aria-atomic="true">3 invoices matched your filter</div>

<!-- Assertive: interrupts. For errors only. -->
<div role="alert">Payment failed. Your card was declined.</div>
```

The live region must exist in the DOM **before** the content changes; injecting
the region and its text together is frequently not announced. Do not make a live
region assertive for routine updates — constant interruption is worse than
silence.

## Testing

Automated tools catch roughly a third of issues. The rest requires a keyboard and
a screen reader.

```bash
npx @axe-core/cli https://localhost:3000 --exit
npx lighthouse https://localhost:3000 --only-categories=accessibility
```

```javascript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('invoice form has no detectable violations', async () => {
  const { container } = render(<InvoiceForm />);
  expect(await axe(container)).toHaveNoViolations();
});
```

Manual checks, in order of value:

1. **Unplug the mouse.** Complete the primary task. Can you reach everything, see
   where focus is, and escape every component?
2. **Zoom to 400 %** (1.4.10). Content must reflow without horizontal scrolling.
3. **Use a screen reader** — NVDA with Firefox on Windows, VoiceOver with Safari
   on macOS. Navigate by heading, by landmark, by form field.
4. **Greyscale** the page and check nothing became ambiguous.

Above all: test with people who use assistive technology daily. Nothing else
finds the difference between technically conformant and actually usable.

## Best Practices

- **Native elements first**, ARIA only for what they cannot express.
- **Design for accessibility**: contrast, focus states and target sizes are
  design decisions made before implementation.
- **Include a11y in the definition of done**, with axe in CI as a floor.
- **Write an accessibility statement** — required under the EAA, and it forces an
  honest inventory.
- **Test with real assistive technology**, not only with linters.
- **Fix the pattern, not the page.** A defect in a shared component is a defect
  everywhere it is used.

## Anti-Patterns

- **`outline: none`** with nothing in its place.
- **`div` with an `onclick`** instead of a button.
- **Placeholder as label.**
- **`aria-label` on an element that already has a visible label**, silently
  overriding it.
- **`role="button"` on a `div`** without `tabindex`, Enter and Space handling.
- **Positive `tabindex`** — breaks the natural order and is unmaintainable.
- **`aria-hidden="true"` on a focusable element** — reachable by keyboard,
  invisible to the screen reader.
- **An automated score treated as conformance.**
- **Announcing an accessibility overlay as compliance** — overlays do not deliver
  it, and are widely opposed by disability advocates.

## Reference Documentation

- [Accessible Components](references/COMPONENTS.md) — correct implementations of
  modals, menus, tabs, comboboxes, data tables and disclosure widgets, with the
  keyboard contract for each

## Resources

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [How to Meet WCAG](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [European Accessibility Act](https://ec.europa.eu/social/main.jsp?catId=1202)
- [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

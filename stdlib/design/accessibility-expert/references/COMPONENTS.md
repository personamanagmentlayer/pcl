# Accessibility — Accessible Components

Reference material for the `accessibility-expert` skill. See [SKILL.md](../SKILL.md).

Each component gives the keyboard contract first, because that is the part most
often missing, then the markup that satisfies it.

## Modal Dialog

**Keyboard contract**

| Key         | Behaviour                          |
| ----------- | ---------------------------------- |
| `Escape`    | Close, return focus to the invoker |
| `Tab`       | Cycle within the dialog only       |
| `Shift+Tab` | Cycle backwards within the dialog  |

```html
<dialog
  id="confirm"
  aria-labelledby="confirm-title"
  aria-describedby="confirm-body"
>
  <h2 id="confirm-title">Delete invoice?</h2>
  <p id="confirm-body">INV-2026-0042 will be permanently removed.</p>
  <button value="cancel" autofocus>Cancel</button>
  <button value="delete" class="danger">Delete</button>
</dialog>
```

```javascript
const dialog = document.getElementById('confirm');

function confirmDelete(invoker) {
  dialog.showModal(); // focus trap, inertness and Escape are native
  dialog.addEventListener(
    'close',
    () => {
      invoker.focus();
      if (dialog.returnValue === 'delete') performDelete();
    },
    { once: true }
  );
}
```

Native `<dialog>` with `showModal()` provides the trap, makes the rest of the page
inert, and handles `Escape`. Hand-rolled modals almost always miss one of the
three. Put initial focus on the least destructive action.

## Disclosure

The simplest pattern, and frequently over-engineered.

```html
<button aria-expanded="false" aria-controls="details-1">Payment details</button>
<div id="details-1" hidden>…</div>
```

```javascript
button.addEventListener('click', () => {
  const open = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!open));
  panel.hidden = open;
});
```

`aria-expanded` on the **trigger**, not the panel. No `role` is needed — it is a
button. `hidden` removes it from the accessibility tree correctly; `display:none`
via a class works equally, but `visibility: hidden` with height zero does not
always.

## Tabs

**Keyboard contract**

| Key                | Behaviour                                        |
| ------------------ | ------------------------------------------------ |
| `Tab`              | Move into the tab list, then to the active panel |
| `Arrow Left/Right` | Move between tabs                                |
| `Home` / `End`     | First / last tab                                 |

```html
<div role="tablist" aria-label="Invoice sections">
  <button
    role="tab"
    id="tab-1"
    aria-selected="true"
    aria-controls="panel-1"
    tabindex="0"
  >
    Summary
  </button>
  <button
    role="tab"
    id="tab-2"
    aria-selected="false"
    aria-controls="panel-2"
    tabindex="-1"
  >
    Lines
  </button>
</div>

<div role="tabpanel" id="panel-1" aria-labelledby="tab-1" tabindex="0">…</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" tabindex="0" hidden>
  …
</div>
```

```javascript
tablist.addEventListener('keydown', (event) => {
  const tabs = [...tablist.querySelectorAll('[role=tab]')];
  const index = tabs.indexOf(document.activeElement);
  const next = {
    ArrowRight: (index + 1) % tabs.length,
    ArrowLeft: (index - 1 + tabs.length) % tabs.length,
    Home: 0,
    End: tabs.length - 1,
  }[event.key];

  if (next === undefined) return;
  event.preventDefault();
  select(tabs[next]);
  tabs[next].focus();
});
```

Roving `tabindex` is the point: exactly one tab is in the tab sequence, so a
keyboard user reaches the tab list once and then uses arrows. Ten tabs must not
mean ten tab stops.

## Menu Button

Distinct from a `<select>` and from navigation links. Use a real menu only for
**actions**; for navigation, use a list of links.

**Keyboard contract**

| Key                            | Behaviour                          |
| ------------------------------ | ---------------------------------- |
| `Enter`, `Space`, `Arrow Down` | Open, focus first item             |
| `Arrow Up`/`Down`              | Move between items                 |
| `Escape`                       | Close, focus returns to the button |
| `Tab`                          | Close and move on                  |

```html
<button
  id="actions"
  aria-haspopup="true"
  aria-expanded="false"
  aria-controls="actions-menu"
>
  Actions
</button>
<ul id="actions-menu" role="menu" aria-labelledby="actions" hidden>
  <li role="none"><button role="menuitem" tabindex="-1">Duplicate</button></li>
  <li role="none"><button role="menuitem" tabindex="-1">Export</button></li>
  <li role="none"><button role="menuitem" tabindex="-1">Delete</button></li>
</ul>
```

`role="none"` on the `<li>` removes the list semantics that would otherwise
conflict with the menu role.

## Combobox with Autocomplete

The most error-prone pattern. Consider whether a native `<select>`, or an
`<input list>` with `<datalist>`, is sufficient before building this.

```html
<label for="country">Country</label>
<input
  id="country"
  role="combobox"
  aria-expanded="false"
  aria-controls="country-listbox"
  aria-autocomplete="list"
  aria-activedescendant=""
  autocomplete="off"
/>
<ul id="country-listbox" role="listbox" hidden>
  <li role="option" id="opt-fr" aria-selected="false">France</li>
  <li role="option" id="opt-de" aria-selected="false">Germany</li>
</ul>
<div aria-live="polite" class="visually-hidden">2 results available</div>
```

Focus stays in the input throughout; `aria-activedescendant` points at the
highlighted option. Moving actual focus into the list breaks typing. Announce the
result count in a polite live region so a screen reader user knows the list
changed.

## Data Table

```html
<table>
  <caption>
    Overdue invoices, September 2026
  </caption>
  <thead>
    <tr>
      <th scope="col"><button aria-sort="ascending">Invoice</button></th>
      <th scope="col">Customer</th>
      <th scope="col" class="numeric">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">INV-2026-0042</th>
      <td>Acme SARL</td>
      <td class="numeric">€1,234.50</td>
    </tr>
  </tbody>
</table>
```

`<caption>` names the table for anyone navigating between tables. `scope` on
header cells is what lets a screen reader announce "Customer: Acme SARL" when
moving across a row. `aria-sort` goes on the header cell, and only one column
carries it at a time.

For a table that scrolls horizontally, make the container focusable so a keyboard
user can scroll it:

```html
<div
  class="table-wrap"
  tabindex="0"
  role="region"
  aria-label="Overdue invoices"
>
  <table>
    …
  </table>
</div>
```

## Toast and Status Messages

```html
<!-- Present in the DOM from page load; only the text changes -->
<div id="status" role="status" aria-live="polite" aria-atomic="true"></div>
```

```javascript
function announce(message) {
  const region = document.getElementById('status');
  region.textContent = ''; // force a change event
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
```

Two failures to avoid: creating the live region and its content in the same
update, which is often not announced; and using `assertive` for routine
confirmations, which interrupts whatever the user was reading.

A toast that disappears after three seconds fails WCAG 2.2 **2.2.1** for users
who read slowly. Either persist it until dismissed, or duplicate the information
somewhere permanent.

## Loading States

```html
<button aria-busy="true" aria-describedby="save-status">Save</button>
<span id="save-status" role="status">Saving…</span>
```

Do not disable the button and leave it silent — the user gets no feedback that
anything happened. `aria-busy` plus a status message states what is occurring.

For skeleton screens, hide the placeholder from assistive technology and announce
the state instead:

```html
<div aria-hidden="true" class="skeleton">…</div>
<div role="status" class="visually-hidden">Loading invoices</div>
```

## Icon-Only Controls

```html
<!-- Accessible name from visually hidden text: survives icon-font failure -->
<button>
  <svg aria-hidden="true" focusable="false">…</svg>
  <span class="visually-hidden">Delete invoice INV-2026-0042</span>
</button>
```

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

Never use `display: none` for text intended for screen readers — it is removed
from the accessibility tree too. The name should identify _which_ item the action
applies to, or a list of ten delete buttons all announce identically.

## Form Validation

```javascript
function showErrors(form, errors) {
  const summary = form.querySelector('#error-summary');
  summary.innerHTML = `
    <h2>There ${errors.length === 1 ? 'is 1 problem' : `are ${errors.length} problems`}</h2>
    <ul>${errors.map((e) => `<li><a href="#${e.field}">${e.message}</a></li>`).join('')}</ul>`;

  for (const error of errors) {
    const input = form.querySelector(`#${error.field}`);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute(
      'aria-describedby',
      `${input.dataset.hintId ?? ''} ${error.field}-error`.trim()
    );
    form.querySelector(`#${error.field}-error`).textContent = error.message;
  }

  summary.focus(); // summary has tabindex="-1"
}
```

Moving focus to the summary is what makes the errors discoverable. Each summary
item links to its field, so a keyboard user reaches the problem in one activation.

Validate on submit, not on every keystroke: announcing an error while someone is
still typing their email is hostile.

# Dynamic Tiptap Extensions

djangocms-text ships a registry that lets third-party packages contribute
Tiptap extensions (nodes, marks, functional extensions) to the editor
without having to fork or rebuild djangocms-text itself.

Extensions are registered at runtime through a small global API and are
built into a fresh instance for every editor that is created on the page.

## How it works

1. `cms.tiptap.js` exposes a registry on `window.CMS_Editor.tiptap`.
2. A third-party script registers a factory function by name.
3. When `CMSTipTapPlugin.create()` instantiates a new editor, it calls
   every registered factory, passes in the host's Tiptap primitives, and
   appends the resulting extensions to the editor's extension list.

The registry lives in `private/js/cms.tiptap.registry.js`; the contract
object handed to factories is defined in `private/js/cms.tiptap.api.js`.

## The contract

Factories receive a frozen object with the Tiptap primitives they need:

```js
{
    version: 1,                 // TIPTAP_API_VERSION
    Editor,                     // from @tiptap/core
    Node,
    Mark,
    Extension,
    mergeAttributes,
    pm: {                       // ProseMirror primitives
        Plugin,
        PluginKey,
        TextSelection,
        Decoration,
        DecorationSet,
    },
}
```

**A third-party extension must never `import` from `@tiptap/core` or
`prosemirror-*` itself.** Doing so ships a second copy of ProseMirror in
the page, which breaks schema identity, `instanceof` checks and
`PluginKey` lookups. Always use the classes received through the
contract.

## Registering an extension

A third-party script, loaded after `cms.tiptap.js` via `<script defer>`,
calls `register()`:

```js
(function () {
    const api = window.CMS_Editor.tiptap;

    api.register('acme-callout', ({ Node, mergeAttributes }) => Node.create({
        name: 'acmeCallout',
        group: 'block',
        content: 'inline*',
        parseHTML: () => [{ tag: 'div.acme-callout' }],
        renderHTML: ({ HTMLAttributes }) => [
            'div',
            mergeAttributes(HTMLAttributes, { class: 'acme-callout' }),
            0,
        ],
    }), { apiVersion: 1 });
})();
```

`register(name, factory, { apiVersion })`:

- `name` — unique string. Re-registering the same name overrides the
  previous factory and logs a warning.
- `factory(api) => extension` — called once per editor. Must return a
  Tiptap node, mark, or extension (or a falsy value to opt out at
  runtime, e.g. when the current page does not need it).
- `apiVersion` — the API version the extension was written against. If
  it exceeds the host's `TIPTAP_API_VERSION`, the extension is skipped
  and a warning is logged.

`unregister(name)` removes a factory; rarely needed in production but
useful during development.

## Loading extensions from a Django package

Because Django already knows which apps are installed at template
rendering time, there is no runtime JS loader — deliver extension
scripts through the regular static-file pipeline. The cleanest place to
add them is the default editor's `RTEConfig.js` tuple, which
`widgets.py` and the CMS toolbar both consume. See
`djangocms_text/contrib/youtube/__init__.py` for a minimal example.

### Load-order independence

The registry is **resilient to script order**. `cms.editor.js` installs
a small queuing stub on `window.CMS_Editor.tiptap` before anything
else; the tiptap bundle replaces that stub with the real registry on
load and drains any `register()` / `registerToolbarItem()` calls that
were queued in the meantime. In practice this means an extension
script can be injected through any mechanism that places it **after**
`bundle.editor.min.js` — ordering relative to `bundle.tiptap.min.js`
does not matter, and `defer` / `async` attributes are not required.

Django's `forms.Media` does merge and can reorder scripts across
widgets; the queuing stub is what makes that safe.

## Extending the toolbar

A dynamic Tiptap extension often comes with a toolbar button. Register
the button definition on the same API:

```js
api.registerToolbarItem('AcmeCallout', {
    type: 'block',                              // 'mark' | 'block'
    icon: '<svg>…</svg>',
    title: 'Callout',
    action: (editor) => editor.chain().focus()
        .insertContent({ type: 'acmeCallout' }).run(),
    enabled: (editor) => editor.can()
        .insertContent({ type: 'acmeCallout' }),
    active: (editor) => editor.isActive('acmeCallout'),
});
```

The record is stored in the host's internal `TiptapToolbar` map under
the given name. Supported fields mirror what the built-in items use:
`action`, `enabled`, `active`, `type`, `icon`, `title`, `items`,
`insitu`, `render`, `formAction`, `attributes`. Only `action` is
strictly required; the rest fills in behavior as needed.

### Making the button appear

Registering the item exposes a capability. Whether the button is
actually shown depends on two things:

1. **Toolbar configuration** — the item name must appear in the
   toolbar array (e.g. `['Bold', 'Italic', '|', 'AcmeCallout']`).
   Inject it server-side next to your other contributions; see
   `djangocms_text/contrib/youtube/__init__.py` for the pattern of
   appending to `DEFAULT_TOOLBAR_CMS` / `DEFAULT_TOOLBAR_HTMLField`.
2. **Server-side label** — `_getRepresentation()` only renders an item
   that has a matching entry in the per-page `lang` config. Contribute
   the title (and optionally `icon`) server-side via
   `djangocms_text.editors.register_toolbar_labels()`:

   ```python
   from django.utils.translation import gettext_lazy as _
   from djangocms_text.editors import register_toolbar_labels

   register_toolbar_labels({"AcmeCallout": {"title": _("Callout")}})
   ```

   This keeps translations on the server where Django's gettext
   pipeline applies. The client-side `title`/`icon` from
   `registerToolbarItem()` act as fallbacks when a field is missing
   from the lang entry, so you don't have to repeat both.

### Extension + toolbar together

Register both on the same script, in any order:

```js
api.register('acme-callout', ({ Node }) => Node.create({
    name: 'acmeCallout',
    group: 'block',
    content: 'inline*',
    parseHTML: () => [{ tag: 'div.acme-callout' }],
    renderHTML: ({ HTMLAttributes }) => ['div', HTMLAttributes, 0],
}), { apiVersion: 1 });

api.registerToolbarItem('AcmeCallout', { /* … as above … */ });
```

The two calls are intentionally independent: a node can be registered
without a button (e.g. to handle pasted content), and a button can
trigger an existing Tiptap command without introducing a new node.

### `filterExtensions` and dynamic items

The host drops built-in extensions whose toolbar item is not used.
Dynamic extensions registered via `register()` are always included —
they are not part of the built-in toolbar-to-extension map. If you
need the editor to skip your extension in some contexts, return a
falsy value from the factory.

## Per-editor instances

`buildExtensions()` runs inside `create()`, not at module load. Every
editor instance therefore gets a fresh extension returned by the
factory. This matches Tiptap's own model: each editor builds its own
schema and plugin set, and extension options must not be shared across
editors.

Do not cache the value returned by the factory and hand it to multiple
editors — return a new `Node.create(...)` / `Mark.create(...)` /
`Extension.create(...)` result each call.

## Error handling

If a factory throws, the error is caught, logged via `console.error`,
and that single extension is dropped. The editor is still created with
the remaining extensions. This keeps a broken third-party script from
taking the whole admin UI down.

## API versioning

`TIPTAP_API_VERSION` starts at `1`. It is bumped only when the contract
changes in a backwards-incompatible way (renamed primitives, changed
signatures). Additive changes — new classes under `pm`, new helpers —
do not bump the version.

Extensions should declare the version they were written against via the
`apiVersion` option so the host can refuse to run extensions that need a
newer host than is installed.

## File map

- `private/js/cms.tiptap.api.js` — the frozen contract object and
  version constant.
- `private/js/cms.tiptap.registry.js` — `register`, `unregister`,
  `buildExtensions`.
- `private/js/cms.tiptap.js` — exposes the registry on
  `window.CMS_Editor.tiptap` and merges built extensions into each
  editor in `create()`.

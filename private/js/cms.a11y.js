let nextId = 0;
const labelTargets = new WeakMap();

export function a11yText(key, fallback) {
    return window.cms_editor_plugin?.lang?.Accessibility?.[key] || fallback;
}

export function uniqueId(prefix = 'cms-a11y') {
    let id;
    do { id = `${prefix}-${++nextId}`; } while (document.getElementById(id));
    return id;
}

export function focusToolbarControl(editor, control) {
    if (!control) return;
    // WebKit can move focus back to the editing host while its native caret
    // remains there. ProseMirror retains the editing selection in editor.state.
    control.ownerDocument.getSelection()?.removeAllRanges();
    control.focus({preventScroll: true});
}

// Keep visible Django labels associated with replacement editing controls.
export function labelControl(source, target, fallback = 'Text editor') {
    for (const attr of ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-required', 'aria-invalid']) {
        if (source.hasAttribute(attr)) target.setAttribute(attr, source.getAttribute(attr));
    }
    const labels = Array.from(source.labels || []);
    if (!labels.length && source.id) {
        labels.push(...Array.from(source.ownerDocument.querySelectorAll('label'))
            .filter(label => label.htmlFor === source.id));
    }
    if (!target.hasAttribute('aria-label') && !target.hasAttribute('aria-labelledby')) {
        if (labels.length) {
            target.setAttribute('aria-labelledby', labels.map(label => {
                if (!label.id) label.id = uniqueId('cms-label');
                return label.id;
            }).join(' '));
        } else {
            target.setAttribute('aria-label', source.title || fallback);
        }
    }
    for (const label of labels) {
        if (!labelTargets.has(label)) {
            label.addEventListener('click', event => {
                const control = labelTargets.get(label);
                if (control?.isConnected) {
                    event.preventDefault();
                    control.focus();
                }
            });
        }
        labelTargets.set(label, target);
    }
    if (source.required) target.setAttribute('aria-required', 'true');
}

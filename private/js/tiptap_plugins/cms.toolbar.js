/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */

import {Extension} from "@tiptap/core";

import {NodeSelection, TextSelection} from "@tiptap/pm/state";
import {Decoration, DecorationSet} from "@tiptap/pm/view";
import {Plugin} from "@tiptap/pm/state";
import TiptapToolbar from "./cms.tiptap.toolbar";
import {formToHtml, populateForm} from "../cms.dialog";

import "../../css/cms.toolbar.css";
import "../../css/cms.linkfield.css";


const _drag_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" ' +
        'class="bi bi-grip-vertical" viewBox="0 0 16 16"><path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 ' +
        '1 1 0 0 1 2 0M7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0M7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 ' +
        '0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-3 3a1 1 ' +
        '0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/></svg>';

const _menu_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" ' +
    'class="bi bi-list" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 ' +
    '1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 ' +
    '0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/></svg>';

const topLevelBlocks = {
    'Heading1': 'heading1',
    'Heading2': 'heading2',
    'Heading3': 'heading3',
    'Heading4': 'heading4',
    'Heading5': 'heading5',
    'Heading6': 'heading6',
    'Paragraph': 'paragraph',
    'Blockquote': 'blockquote',
    'BulletedList': 'bulletList',
    'NumberedList': 'orderedList',
    'CodeBlock': 'codeBlock',
};

let _node_icons = null;

// RAF-based coalescing: only one toolbar update per animation frame
let _topToolbarRafId = 0;

/**
 * Creates a ProseMirror Plugin for handling a block toolbar in the editor.
 *
 * @param {Object} editor - The editor instance.
 * @returns {Plugin} - A ProseMirror Plugin instance.
 */
function _createBlockToolbarPlugin(editor) {
    'use strict';
    return new Plugin({
        props: {
            decorations(state) {
                return this.getState(state);
            },
            handleDOMEvents: {
                // Mousedown not captured to allow start of drag event
                click (view, event) {
                    const blockToolbar = editor.options?.blockToolbar;
                    if (blockToolbar?.contains(event.target)) {
                        if (blockToolbar.lastElementChild?.contains(event.target)) {
                            // clicked somewhere in dropdown?
                            _handleToolbarClick(event, editor);
                            return true;
                        }
                        blockToolbar.classList.toggle('show');
                        return true;
                    }
                    return false;
                },
            }
        },
        state: {
            init(_, {doc}) {
                return DecorationSet.create(doc, [
                    Decoration.widget(0, () => {
                        editor.options.blockToolbar = _createBlockToolbar(editor, editor.options.toolbar);
                        updateBlockToolbar(editor);
                        return editor.options.blockToolbar;
                    }, {
                        side: -2,
                        ignoreSelection: true,
                        key: "blockToolbar",
                    })
                ]);
            },
            apply(tr, value) { return value; }
        }
    });
}

/**
 * Creates a block toolbar for the editor. The block toolbar is a floating toolbar that appears at
 * the start side of the block that is currently selected. It contains a dropdown menu with block
 * actions that can be performed on the block.
 *
 * Blocks can be dragged by the toolbar to change their position in the document.
 *
 * @param {Object} editor - The editor instance.
 * @param {Object} blockToolbar - The block toolbar configuration.
 * @returns {HTMLDivElement} The created block toolbar element.
 */
function _createBlockToolbar(editor, blockToolbar) {
    'use strict';

    const toolbar = document.createElement('div');

    toolbar.classList.add('cms-block-toolbar');
    toolbar.style.zIndex = editor.options.baseFloatZIndex || 8888888;  //
    toolbar.innerHTML = `${_drag_icon}<div class="cms-block-dropdown">${_populateToolbar(editor, blockToolbar, 'block')}</div>`;

    toolbar.draggable = true;
    toolbar.addEventListener("dragstart", (event) => {
        toolbar.classList.remove('show');
        const start = parseInt(editor.options.blockToolbar.dataset.start);
        const end = parseInt(editor.options.blockToolbar.dataset.end);
        const depth = parseInt(editor.options.blockToolbar.dataset.depth);

        if (depth >= 0 && start >= 0 && end >= 0) {
            const {state, dispatch} = editor.view;
            // Select the entire node (start - 1 is the position before the node)
            // so that drag-drop moves the whole block, not just its content
            let selection;
            try {
                selection = NodeSelection.create(state.doc, start - 1);
            } catch (e) {
                // Fallback for nodes that don't support NodeSelection
                selection = TextSelection.create(state.doc, start - 1, end);
            }
            const domNode = editor.view.domAtPos(start).node;
            event.dataTransfer.setDragImage(domNode, 0, 0);
            dispatch(state.tr.setSelection(selection));
        }
         else {
            event.preventDefault();
        }
    });


    if (_node_icons === null) {
        // Initialize the node icons once globally
        _node_icons = {};
        for (const [icon, node] of Object.entries(topLevelBlocks)) {
            _node_icons[node] = window.cms_editor_plugin.lang[icon].icon;
        }
    }
    return toolbar;
}


/**
 * Updates the block toolbar based on the current editor state.
 *
 * @param {Object} editor - The editor instance.
 * @param {Object} [state] - The optional state to use instead of the editor's current state.
 */
function updateBlockToolbar(editor, state) {
    'use strict';
    // Skip if block toolbar isn't focused/visible
    if (!editor.isFocused) {
        return;
    }
    const blockToolbar = editor.options.blockToolbar;
    const {resolvedPos, depth} = _getResolvedPos(state || editor.state);
    if (depth > 0) {
        const startPos = resolvedPos.start(depth);
        const node = resolvedPos.node(depth);
        const parentNode = depth > 1 ? resolvedPos.node(depth - 1) : null;
        // Skip DOM updates if the block hasn't changed (cursor moved within same block,
        // and the block's identity is unchanged)
        if (
            blockToolbar._lastStartPos === startPos &&
            blockToolbar._lastDepth === depth &&
            blockToolbar._lastNode === node
        ) {
            return;
        }
        blockToolbar._lastStartPos = startPos;
        blockToolbar._lastDepth = depth;
        blockToolbar._lastNode = node;
        _updateToolbarIcon(editor, node, parentNode);
        blockToolbar.dataset.start = startPos;
        blockToolbar.dataset.end = startPos + resolvedPos.node(depth).nodeSize;
        blockToolbar.dataset.depth = depth;
        const pos = editor.view.coordsAtPos(startPos);
        const ref = (editor.options.el || editor.options.element).getBoundingClientRect();
        blockToolbar.draggable = resolvedPos.node(depth).content.size > 0;
        blockToolbar.style.insetBlockStart = `${pos.top - ref.top}px`;
        let title = resolvedPos.node(1)?.type.name;
        for (let i = 2; i <= depth; i++) {
            title += ` > ${resolvedPos.node(i)?.type.name}`;
        }
        blockToolbar.title = title;
    } else {
        if (blockToolbar._lastDepth === 0) {
            return;
        }
        blockToolbar._lastDepth = 0;
        blockToolbar._lastStartPos = -1;
        blockToolbar._lastNode = null;
        blockToolbar.draggable = false;
        blockToolbar._lastIconType = null;
        _replaceIcon(blockToolbar.firstElementChild, _menu_icon);
    }
}

function _getResolvedPos(state) {
    'use strict';

    let resolvedPos, lastBlockDepth = 0;

    if (state.selection instanceof NodeSelection) {
        // NodeSelection: $anchor is before the node, resolve inside it
        resolvedPos = state.doc.resolve(state.selection.from + 1);
        for (let depth = 0; depth <= resolvedPos.depth; depth++) {
            if (resolvedPos.node(depth).type.isBlock) {
                lastBlockDepth = depth;
            }
        }
    } else {
        const {$anchor, $head} = state.selection;
        resolvedPos = $anchor;
        const maxDepth = $anchor.depth < $head.depth ? $anchor.depth : $head.depth;
        for (let depth = 0; depth <= maxDepth; depth++) {
            if ($anchor.start(depth) !== $head.start(depth)) {
                return {resolvedPos, depth: lastBlockDepth};
            }
            if ($anchor.node(depth).type.isBlock) {
                lastBlockDepth = depth;
            }
        }
    }

    // Walk up while the current block is the only block child of its parent,
    // e.g. select listItem rather than its inner paragraph
    while (lastBlockDepth > 1 && resolvedPos.node(lastBlockDepth - 1).childCount === 1) {
        lastBlockDepth--;
    }

    return {resolvedPos, depth: lastBlockDepth};
}

function _updateToolbarIcon (editor, node, parentNode) {
    'use strict';
    if (!node) {
        return;
    }
    // For list items, show the icon of the parent list (ul/ol)
    const iconNode = node.type.name === 'listItem' && parentNode ? parentNode : node;
    const type = iconNode.type.name === 'heading' ? 'heading' + iconNode.attrs.level : iconNode.type.name;
    // Skip DOM update if icon type hasn't changed
    if (editor.options.blockToolbar._lastIconType === type) {
        return;
    }
    editor.options.blockToolbar._lastIconType = type;
    if (type in _node_icons) {
        _replaceIcon(editor.options.blockToolbar.firstElementChild, _node_icons[type]);
    } else {
        _replaceIcon(editor.options.blockToolbar.firstElementChild, _drag_icon);
    }
}

function _replaceIcon(node, string) {
    'use strict';
    const icon = document.createElement('span');
    icon.innerHTML = string;
    node.replaceWith(icon.firstElementChild);
}

/**
 * Creates a ProseMirror plugin for a top toolbar in the editor. The top toolbar is used for both
 * inline editing and HTMLField editing. It contains buttons for text formatting, links, and other
 * actions that can be performed on the editor content.
 *
 * If there is no block toolbar, it also hold block actions.
 *
 * @param {Editor} editor - The editor instance.
 * @param {Function} filter - A filter function to customize the toolbar.
 * @returns {Plugin} - A ProseMirror plugin instance.
 */
/**
 * Creates the top toolbar DOM element and attaches it outside the ProseMirror
 * decoration system to avoid unnecessary redraws on every transaction.
 *
 * For inline editors: appended to document.body with position:fixed positioning.
 * For fixed editors: prepended to the tiptap element with sticky positioning.
 *
 * @param {Editor} editor - The editor instance.
 * @param {Function} filter - A filter function to customize the toolbar.
 */
function _initTopToolbar(editor, filter) {
    const topToolbar = _createToolbar(editor, editor.options.toolbar, filter);
    editor.options.topToolbar = topToolbar;

    const isFixed = editor.options.element.classList.contains('fixed');

    if (!isFixed) {
        // Inline editors: append to body to escape overflow clipping
        // and allow CSS contain:layout on the editor.
        // Wrap in a container with .cms-editor-inline-wrapper so toolbar CSS applies.
        const toolbarHost = document.createElement('div');
        toolbarHost.classList.add('cms-editor-inline-wrapper');
        toolbarHost.appendChild(topToolbar);
        document.body.appendChild(toolbarHost);
        editor.options._cleanupScrollPin = _positionFixedToolbar(
            editor.options.element, topToolbar
        );
        // Toggle visibility on focus/blur since toolbar is outside the editor DOM
        editor.on('focus', () => toolbarHost.classList.add('has-focused-editor'));
        editor.on('blur', () => {
            // Delay hiding so toolbar clicks can be processed first
            // (mousedown preventDefault keeps focus but blur fires first)
            setTimeout(() => {
                if (!editor.isFocused && !topToolbar.contains(document.activeElement)) {
                    toolbarHost.classList.remove('has-focused-editor');
                }
            }, 200);
        });
        editor.options._toolbarHost = toolbarHost;
    } else {
        // Fixed editors: prepend to the editor container so the toolbar
        // sits above the .tiptap content area
        editor.options.element.prepend(topToolbar);
    }

    // Prevent toolbar clicks from blurring the editor
    topToolbar.addEventListener('mousedown', (e) => {
        const form = e.target.closest('form.cms-inline-form');
        if (!form) {
            e.preventDefault();
        }
    });
    // Handle toolbar clicks
    topToolbar.addEventListener('click', (e) => {
        if (!editor.isFocused) {
            editor.commands.focus();
        }
        const form = e.target.closest('form.cms-inline-form');
        if (!form) {
            _handleToolbarClick(e, editor);
        }
    });
}

function _createTopToolbarPlugin(editor, filter) {
    'use strict';
    return new Plugin({
        props: {
            handleDOMEvents: {
                click (view, event) {
                    // Close dropdowns when clicking inside the editor content
                    if (!editor.options.topToolbar?.contains(event.target)) {
                        return _closeAllDropdowns(event, editor) > 0;
                    }
                    return false;
                },
            }
        },
    });
}

/**
/**
 * Positions a fixed toolbar above the editor element.
 * The toolbar uses position:fixed to escape ancestor overflow:hidden clipping.
 * Its position is updated on scroll to stay above the editor, clamped to the
 * CMS toolbar bottom edge.
 *
 * @param {HTMLElement} editorElement - The editor wrapper element.
 * @param {HTMLElement} toolbar - The menubar element (position:fixed).
 * @returns {Function} Cleanup function to remove event listeners.
 */
function _positionFixedToolbar(editorElement, toolbar) {
    const cmsToolbarHeight = parseInt(
        getComputedStyle(document.documentElement)
            .getPropertyValue('--cms-toolbar-height') || '0', 10
    );
    const VIEWPORT_MARGIN = 8; // Minimum gap between toolbar and viewport edges

    // Cache toolbar height — only changes on window resize
    let toolbarHeight = 0;
    // Set initial fixed position at 0,0; use transform for fast compositor updates
    toolbar.style.top = '0';
    toolbar.style.left = '0';
    toolbar.style.willChange = 'transform';
    toolbar.style.maxWidth = `${window.innerWidth - 2 * VIEWPORT_MARGIN}px`;

    function update() {
        const rect = editorElement.getBoundingClientRect();
        const toolbarWidth = toolbar.offsetWidth || 0;

        // Position toolbar above the editor, or pin to CMS toolbar bottom
        const idealTop = rect.top - toolbarHeight - 6;
        const minTop = cmsToolbarHeight;
        // Hide if editor is scrolled out of view
        if (rect.bottom < cmsToolbarHeight + toolbarHeight || rect.top > window.innerHeight) {
            toolbar.style.transform = 'translate(-9999px, -9999px)';
            return;
        }
        // Clamp left position so the toolbar stays within the viewport
        const maxLeft = window.innerWidth - toolbarWidth - VIEWPORT_MARGIN;
        const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, maxLeft));
        const top = Math.max(idealTop, minTop);
        toolbar.style.transform = `translate(${left}px, ${top}px)`;
    }

    function onResize() {
        toolbarHeight = toolbar.offsetHeight || 0;
        toolbar.style.maxWidth = `${window.innerWidth - 2 * VIEWPORT_MARGIN}px`;
        update();
    }

    let rafId = 0;
    function scheduleUpdate() {
        if (!rafId) {
            rafId = requestAnimationFrame(() => { rafId = 0; update(); });
        }
    }

    const scrollTarget = _findScrollParent(editorElement);
    scrollTarget.addEventListener('scroll', scheduleUpdate, {passive: true});
    // Only attach the window listener if the scroll parent isn't the window itself
    if (scrollTarget !== window) {
        window.addEventListener('scroll', scheduleUpdate, {passive: true});
    }
    window.addEventListener('resize', onResize, {passive: true});
    // Defer initial positioning so the toolbar has been rendered and has a height
    requestAnimationFrame(onResize);

    return () => {
        scrollTarget.removeEventListener('scroll', scheduleUpdate);
        if (scrollTarget !== window) {
            window.removeEventListener('scroll', scheduleUpdate);
        }
        window.removeEventListener('resize', onResize);
        if (rafId) { cancelAnimationFrame(rafId); }
    };
}

/**
 * Finds the nearest scrollable ancestor of an element, or falls back to window.
 *
 * @param {HTMLElement} element - The element to start searching from.
 * @returns {HTMLElement|Window} The nearest scrollable ancestor or window.
 */
function _findScrollParent(element) {
    let scrollParent = element.parentElement;
    while (scrollParent && scrollParent !== document.documentElement) {
        const overflow = getComputedStyle(scrollParent).overflowY;
        if (overflow === 'auto' || overflow === 'scroll') {
            return scrollParent;
        }
        scrollParent = scrollParent.parentElement;
    }
    return window;
}

/**
 * Creates a toolbar element for the editor.
 * A toolbar is a div element with role="toolbar" and class cms-toolbar.
 *
 * @param {Object} editor - The editor instance.
 * @param {Object} toolbar - The toolbar configuration.
 * @param {Function} filter - A filter function to customize the toolbar items.
 * @returns {HTMLElement} The created toolbar element.
 */
function _createToolbar(editor, toolbar, filter) {
    'use strict';

    const toolbarElement = document.createElement('div');
    toolbarElement.setAttribute('role', 'menubar');
    toolbarElement.classList.add('cms-toolbar');
    // create the toolbar html from the settings
    toolbarElement.innerHTML = _populateToolbar(editor, toolbar, filter);

    if (!editor.options.element.classList.contains('fixed')) {
        toolbarElement.style.zIndex = editor.options.baseFloatZIndex || 8888888;
        // Limit its width to the available space
        toolbarElement.style.maxWidth = (window.innerWidth - toolbarElement.getBoundingClientRect().left - 16) + 'px';
    }
    setTimeout(() => {
        if (toolbarElement.contains(document.activeElement)) {
            editor.commands.focus();
        }
    }, 10);
    return toolbarElement;
}

/**
 * Handles the toolbar click event. The action is determined by the clicked button's data-action
 * attribute.
 *
 * @param {Event} event - The click event.
 * @param {Object} editor - The editor instance.
 * @private
 */
function _handleToolbarClick(event, editor) {
    'use strict';
    event.preventDefault();
    const button = event.target.closest('button, .dropdown');
    const editorEl = editor.options.el || editor.options.element;
    if (button && !button.disabled && !editorEl.querySelector('dialog.cms-form-dialog')) {
        const {action} = button.dataset;
        if (button.classList.contains('dropdown')) {
            // Open dropdown
            const content = button.querySelector('.dropdown-content');
            if (!button.classList.contains('show')) {
                _closeAllDropdowns(event, editor);
                button.classList.add('show');
                button.closest('[role="menubar"]')?.classList.add('has-dropdown-open');
                content.style.top = button.offsetHeight + 'px';
                if (button.offsetLeft + content.offsetWidth > window.innerWidth) {
                    content.style.left = (window.innerWidth - content.offsetWidth - button.offsetLeft - 25) + 'px';
                }
            } else {
                button.classList.remove('show');
                button.closest('[role="menubar"]')?.classList.remove('has-dropdown-open');
            }
        } else if (TiptapToolbar[action]) {
            TiptapToolbar[action].action(editor, button);
            // Close dropdowns and update toolbar after editor command execution
            _closeAllDropdowns(event, editor, true);
            _updateToolbar(editor);
        }
    }
}

// Close all dropdowns, returns the number of closed dropdowns from the TOP toolbar
function _closeAllDropdowns(event, editor, force) {
    'use strict';
    let count = 0;
    document.documentElement.querySelectorAll('.cms-editor-inline-wrapper .cms-block-toolbar.show')
        .forEach((el) => {
            if (!el.contains(event.target) || force) {
                el.classList.remove('show');
                count++;
            }
        });
    document.documentElement.querySelectorAll('.cms-editor-inline-wrapper [role="menubar"] .dropdown.show')
        .forEach((el) => {
            if (!el.contains(event.target) || force) {
                el.classList.remove('show');
                el.closest('[role="menubar"]')?.classList.remove('has-dropdown-open');
                count++;
            }
        });
    return count;
}

function _createDropdown(editor, item, filter) {
    'use strict';
    const dropdown = typeof item.items === 'function' ?
        item.items(editor, (items) => _populateToolbar(editor, items, filter), item) :
        _populateToolbar(editor, item.items, filter);

    // Are there any items in the dropdown?
    if (dropdown.replaceAll(editor.options.separator_markup, '').replaceAll(editor.options.space_markup, '').length === 0) {
        return '';
    }
    const title = item.title && item.icon ? `title='${item.title}' ` : '';
    const attr = item.attr ? `data-attr="${item.attr}" ` : '';
    const icon = item.icon || `<span>${item.title}</span>`;
    return `<span ${title}${attr}class="dropdown" tabindex="-1" role="button">${icon}<div title class="dropdown-content ${item.class || ''}">${dropdown}</div></span>`;
}

function _populateGroup(editor, array, filter) {
    'use strict';

    const group = _populateToolbar(editor, array, filter);
    return group.length > 0 ? group + editor.options.separator_markup : '';
}

function _populateToolbar(editor, array, filter) {
    'use strict';
    let html = array.map(item => {
        if (item in TiptapToolbar && TiptapToolbar[item].insitu && filter === 'block') {
            return _populateGroup(editor, TiptapToolbar[item].insitu, filter);
        }
        if (Array.isArray(item)) {
            return _populateGroup(editor, item, filter);
        }
        if (item in TiptapToolbar && (TiptapToolbar[item].items || TiptapToolbar[item].insitu)) {
            // Create submenu
            item = window.cms_editor_plugin._getRepresentation(item, filter);
            if (!item) {
                return '';
            }
            if (!item.items) {
                item.items = item.insitu;
            }
        }
        if (item.constructor === Object) {
            return _createDropdown(editor, item, filter);
        }
        if (item in TiptapToolbar && TiptapToolbar[item].render) {
            return TiptapToolbar[item].render(editor, TiptapToolbar[item], filter);
        }
        return _createToolbarButton(editor, item, filter);
    }).join('');

    // Remove trailing separator or space
    if (html.endsWith(editor.options.separator_markup)) {
        html = html.slice(0, -editor.options.separator_markup.length);
    }
    if (html.endsWith(editor.options.space_markup)) {
        html = html.slice(0, -editor.options.space_markup.length);
    }
    return html;
}

/**
 * Creates a toolbar button for the editor.
 *
 * @param {Object} editor - The editor instance.
 * @param {string} itemName - The name of the item to create a button for.
 * @param {Function} filter - A filter function to apply to the item.
 * @returns {string} The HTML string for the toolbar button.
 */
function _createToolbarButton(editor, itemName, filter) {
    'use strict';

    const item = itemName.split(' ')[0];

    const repr = window.cms_editor_plugin._getRepresentation(item, filter);
    if (repr) {
        repr.dataaction = repr.dataaction || item;
        const title = repr.icon ? `title='${repr.title}' ` : '';
        const position = repr.position ? `style="float :${repr.position};" ` : '';
        const cmsplugin = repr.cmsplugin ? `data-cmsplugin="${repr.cmsplugin}" ` : '';
        const attr = repr.attr ? `data-attr="${repr.attr}" ` : '';

        let form = '';
        let classes = 'button';
        if (repr.render) {
            // Allow custom HTML rendering
            return repr.html(editor, repr);
        } else if (repr.inlineForm) {
            return `<form class="cms-form cms-inline-form" data-action="${repr.dataaction}" ${cmsplugin}${title}${position}${attr}>${formToHtml(repr.inlineForm)}</form>`;
        } else if (repr.toolbarForm) {
            classes += ' dropdown';
            form = `<form class="cms-form dropdown-content">
                <div class="cms-form-inputs">${formToHtml(repr.toolbarForm)}</div>
                <div class="cms-form-buttons">
                    <span class="submit"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16">
                        <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
                        </svg></span>
                    <span class="cancel"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                        </svg></span>
                </div>
            </form>`;
        }
        const content = repr.icon || `<span>${repr.title}</span>`;
        return `<button data-action="${repr.dataaction}" ${cmsplugin}${title}${position}${attr}class="${classes}">${content}${form}</button>`;
    }
    return '';
}

/**
 * Updates the toolbar buttons based on the editor's state and the toolbar configuration.
 * This is used to highlight active buttons and disable buttons that are not applicable.
 *
 * @param {Object} editor - The editor instance.
 * @param {HTMLElement} [toolbar] - The toolbar element. If not provided, the function will query the editor's element for toolbar buttons.
 */
function _updateToolbar(editor, toolbar) {
    'use strict';
    let buttons;
    if (!toolbar) {
        // Cache button list to avoid querySelectorAll on every update.
        // The top toolbar may live in document.body (inline editors), so query it
        // directly along with the block toolbar inside the editor.
        if (!editor.options._cachedToolbarButtons) {
            const fromTop = editor.options.topToolbar
                ? Array.from(editor.options.topToolbar.querySelectorAll('button, [role="button"]'))
                : [];
            const fromBlock = editor.options.element
                ? Array.from(editor.options.element.querySelectorAll(
                    '.cms-block-toolbar button, .cms-block-toolbar [role="button"]'
                ))
                : [];
            editor.options._cachedToolbarButtons = [...fromTop, ...fromBlock];
        }
        buttons = editor.options._cachedToolbarButtons;
    } else {
        buttons = toolbar.querySelectorAll('button, [role="button"]');
    }
    for (const button of buttons) {
        const {action} = button.dataset;
        if (TiptapToolbar[action]) {
              // Cache representation lookup on the button element
              const toolbarItem = button._cachedRepr || (button._cachedRepr = window.cms_editor_plugin._getRepresentation(action));
              try {
                  if (toolbarItem.enabled !== undefined) {
                      const disabled = !toolbarItem.enabled(editor, button);
                      if (button.disabled !== disabled) {
                          button.disabled = disabled;
                      }
                  }
                  try {
                      const isActive = !!(toolbarItem.active && toolbarItem.active(editor, button));
                      if (isActive !== button.classList.contains('active')) {
                          button.classList.toggle('active', isActive);
                      }
                      if (TiptapToolbar[action].attributes) {
                          populateForm(button, TiptapToolbar[action].attributes(editor), toolbarItem.form);
                      }
                  } catch (e) {
                  }
              } catch (e) {
                  console.warn(e);
                  button.remove();
              }
        }
    }
    // Update parent dropdowns: mark as has-active-child if any non-heading/paragraph
    // child is active (avoids expensive :has() CSS selector)
    const SKIP_ACTIONS = new Set(['Heading1','Heading2','Heading3','Heading4','Heading5','Heading6','Paragraph']);
    const topToolbar = editor.options.topToolbar;
    const editorEl = editor.options.el || editor.options.element;
    if (!topToolbar) { editorEl.dataset.selecting = 'false'; return; }
    for (const dropdown of topToolbar.querySelectorAll('.dropdown')) {
        const hasActive = Array.from(dropdown.querySelectorAll('.active'))
            .some(el => !SKIP_ACTIONS.has(el.dataset.action));
        if (hasActive !== dropdown.classList.contains('has-active-child')) {
            dropdown.classList.toggle('has-active-child', hasActive);
        }
    }
    editorEl.dataset.selecting = 'false';
}

function _submitToolbarForm(event, editor) {
    'use strict';
    event.preventDefault();
    event.stopPropagation();
    const form = event.target.closest('form');
    if (form.reportValidity()) {
        _closeAllDropdowns(event, editor);
        const {action} = form.closest('[role=button]').dataset;
        if (TiptapToolbar[action]) {
            TiptapToolbar[action].action(editor, event.target.closest('button, [role="button"]'), new FormData(form));
        }
    }
}


/**
 * CmsToolbarPlugin is an extension that enhances the ProseMirror editor with toolbar functionalities.
 * It dynamically adds ProseMirror plugins based on the editor's configuration and context.
 *
 * This extension determines whether to enable a top toolbar, block toolbar, or both based on the
 * positioning of the editor's HTML element and its tag type. For instance:
 * - If the editor is not inline or is too close to the left edge, only a top toolbar is added.
 * - Otherwise, both a top toolbar (configured for inline editing) and a block toolbar are included.
 *
 * The plugin makes conditional use of editor configuration and element properties such as tagName
 * and bounding rectangle to adapt the toolbar layout responsively.
 */
const CmsToolbarPlugin = Extension.create({
    onCreate() {
        const editor = this.editor;
        const hasBlockToolbar = editor.options.blockToolbar;
        const el = editor.options.el || editor.options.element;
        const el_rect = el.getBoundingClientRect();
        const filter = (el.tagName !== 'TEXTAREA' && el_rect.x >= 28) ? 'mark' : undefined;

        // Create toolbar outside ProseMirror's decoration system
        _initTopToolbar(editor, filter);
        // Set initial button states (disabled/active) once on creation
        requestAnimationFrame(() => {
            _updateToolbar(editor);
            if (hasBlockToolbar) {
                updateBlockToolbar(editor);
            }
        });

        let lastFrom = -1;
        let lastTo = -1;
        let toolbarRafId = 0;
        editor.on('transaction', ({transaction}) => {
            // Skip if tab is hidden
            if (document.hidden) {
                return;
            }
            // Skip if toolbar is not visible (inline editor not focused)
            if (!editor.isFocused && !editor.options.element.classList.contains('fixed')) {
                return;
            }
            // Skip if neither selection nor document changed.
            // (Pure typing within the same block changes the doc but
            // we still want to update active states; toolbar transformations
            // like heading level changes change docChanged but keep selection.)
            const {from, to} = editor.state.selection;
            if (from === lastFrom && to === lastTo && !transaction.docChanged) {
                return;
            }
            lastFrom = from;
            lastTo = to;
            // Coalesce rapid transactions into a single paint frame
            if (!toolbarRafId) {
                toolbarRafId = requestAnimationFrame(() => {
                    toolbarRafId = 0;
                    _updateToolbar(editor);
                    if (hasBlockToolbar) {
                        updateBlockToolbar(editor);
                    }
                });
            }
        });
    },
    onDestroy() {
        // Remove toolbar from DOM
        if (this.editor.options._toolbarHost) {
            this.editor.options._toolbarHost.remove();
            delete this.editor.options._toolbarHost;
        } else if (this.editor.options.topToolbar) {
            this.editor.options.topToolbar.remove();
        }
        delete this.editor.options.topToolbar;
        // Invalidate cached button list
        delete this.editor.options._cachedToolbarButtons;
        if (this.editor.options._cleanupScrollPin) {
            this.editor.options._cleanupScrollPin();
            delete this.editor.options._cleanupScrollPin;
        }
    },
    addProseMirrorPlugins() {
        'use strict';
        const el = this.editor.options.el || this.editor.options.element;
        const el_rect = el.getBoundingClientRect();
        if (el.tagName === 'TEXTAREA' || el_rect.x < 28) {
            // Not inline or too close to the left edge to see the block toolbar
            return [_createTopToolbarPlugin(this.editor)];
        } else {
            // Inline
            return [
                _createTopToolbarPlugin(this.editor, 'mark'),
                _createBlockToolbarPlugin(this.editor)
            ];
        }
    }
});


export default CmsToolbarPlugin;

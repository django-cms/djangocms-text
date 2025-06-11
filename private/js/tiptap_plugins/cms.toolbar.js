/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */

import {Extension} from "@tiptap/core";

import {TextSelection} from "@tiptap/pm/state";
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

/**
 * Creates a ProseMirror Plugin for handling a block toolbar in the editor.
 *
 * @param {Object} editor - The editor instance.
 * @returns {Plugin} - A ProseMirror Plugin instance.
 *
 * @property {Object} props - Plugin properties.
 * @property {Function} props.decorations - Function to get the current state of decorations.
 * @property {Object} props.handleDOMEvents - Object containing DOM event handlers.
 * @property {Function} props.handleDOMEvents.click - Click event handler for the block toolbar.
 *
 * @property {Object} state - Plugin state.
 * @property {Function} state.init - Initializes the plugin state with decorations.
 * @property {Function} state.apply - Applies state changes and updates the block toolbar.
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
            apply(tr, value, oldState, newState) {
                if (!oldState.doc.eq(newState.doc) || oldState.selection.eq(newState.selection) === false) {
                    // Let the editor execute the dom update before updating the toolbar
                    setTimeout(() => updateBlockToolbar(editor, newState), 0);
                }
                return value;
            }
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
            const textSelection = TextSelection.create(state.doc, start, end-1);
            const domNode = editor.view.domAtPos(start).node;
            event.dataTransfer.setDragImage(domNode, 0, 0);
            dispatch(state.tr.setSelection(textSelection));
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
    const {resolvedPos, depth} = _getResolvedPos(state || editor.state);
    if (depth > 0) {
        _updateToolbarIcon(editor, resolvedPos.node(depth));
        const startPos = resolvedPos.start(depth);
        editor.options.blockToolbar.dataset.start = startPos;
        editor.options.blockToolbar.dataset.end = startPos + resolvedPos.node(depth).nodeSize;
        editor.options.blockToolbar.dataset.depth = depth;
        const pos = editor.view.coordsAtPos(startPos);
        const ref = editor.options.el.getBoundingClientRect();
        editor.options.blockToolbar.draggable = resolvedPos.node(depth).content.size > 0;
        editor.options.blockToolbar.style.insetBlockStart = `${pos.top - ref.top}px`;
        let title = resolvedPos.node(1)?.type.name;
        for (let i= 2; i <= depth; i++) {
            title += ` > ${resolvedPos.node(i)?.type.name}`;
        }
        editor.options.blockToolbar.title = title;
    } else {
        editor.options.blockToolbar.draggable = false;
        _replaceIcon(editor.options.blockToolbar.firstElementChild, _menu_icon);
    }
    // TODO: Set the size of the balloon according to the fontsize
    // this.toolbar.style.setProperty('--size', this.editor.view. ...)
}

function _getResolvedPos(state) {
    'use strict';

    const {$anchor, $head} = state.selection;
    const maxDepth = $anchor.depth < $head.depth ? $anchor.depth : $head.depth;
    let lastBlockDepth = 0;
    for (let depth = 0; depth <= maxDepth; depth++) {
        if ($anchor.start(depth) !== $head.start(depth)) {
            return {resolvedPos: $anchor, depth: lastBlockDepth};
        }
        if ($anchor.node(depth).type.isBlock) {
            lastBlockDepth = depth;
        }
    }
    return {resolvedPos: $anchor, depth: lastBlockDepth};
}

function _updateToolbarIcon (editor, node) {
    'use strict';
    if (!node) {
        return;
    }
    const type = node.type.name === 'heading' ? 'heading' + node.attrs.level : node.type.name;
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
function _createTopToolbarPlugin(editor, filter) {
    'use strict';
    return new Plugin({
        props: {
            decorations(state) {
                return this.getState(state);
            },
            handleDOMEvents: {
                mousedown (view, event) {
                    if (editor.options.topToolbar?.contains(event.target)) {
                        event.preventDefault();
                        return true;
                    }
                    return false;
                },
                click (view, event) {
                    if (editor.options.topToolbar?.contains(event.target)) {
                        _handleToolbarClick(event, editor);
                        return true;
                    }
                    return _closeAllDropdowns(event, editor) > 0;
                },
            }
        },
        state: {
            init(_, {doc}) {
                this.handleSelectionChange = () => _updateToolbar(editor);
                return DecorationSet.create(doc, [
                    Decoration.widget(0, () => {
                        const topToolbar = _createToolbar(
                            editor,
                            editor.options.toolbar,
                            filter
                        );
                        editor.options.topToolbar = topToolbar;
                        return topToolbar;
                    }, {
                        side: -1,
                        ignoreSelection: true,
                        key: "topToolbar",
                    })
                ]);
            },
            apply(tr, value, oldState, newState) {
                if (!oldState.doc.eq(newState.doc) || oldState.selection.eq(newState.selection) === false) {
                    setTimeout(this.handleSelectionChange, 0);
                }
                return value;
            }
        }
    });
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
    toolbarElement.style.zIndex = editor.options.baseFloatZIndex || 8888888;  //

    // create the toolbar html from the settings
    toolbarElement.innerHTML = _populateToolbar(editor, toolbar, filter);

    if (!editor.options.element.classList.contains('fixed')) {
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
    if (button && !button.disabled && !editor.options.el.querySelector('dialog.cms-form-dialog')) {
        const {action} = button.dataset;
        if (button.classList.contains('dropdown')) {
            // Open dropdown
            const content = button.querySelector('.dropdown-content');
            if (!button.classList.contains('show')) {
                _closeAllDropdowns(event, editor);
                button.classList.add('show');
                content.style.top = button.offsetHeight + 'px';
                if (button.offsetLeft + content.offsetWidth > window.innerWidth) {
                    content.style.left = (window.innerWidth - content.offsetWidth - button.offsetLeft - 25) + 'px';
                }
                // if (content.tagName === 'FORM') {
                //     // Don't let clicks on the form close the dropdown
                //     content.addEventListener('click', (event) => event.stopPropagation());
                //     // Select the first input
                //     content.querySelector('input:not([type=hidden])').focus();
                // }
            } else {
                button.classList.remove('show');
            }
        } else if (TiptapToolbar[action]) {
            TiptapToolbar[action].action(editor, button);
            // Close dropdowns and update toolbar after editor command execution
            _closeAllDropdowns(event, editor);
            _updateToolbar(editor);
        }
    }
}

// Close all dropdowns
function _closeAllDropdowns(event, editor) {
    'use strict';
    let count = 0;
    document.documentElement.querySelectorAll('.cms-editor-inline-wrapper .cms-block-toolbar.show')
        .forEach((el) => {
            el.classList.remove('show');
            count++;
        });
    document.documentElement.querySelectorAll('.cms-editor-inline-wrapper [role="menubar"] .dropdown.show')
        .forEach((el) => {
            el.classList.remove('show');
            count++;
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
        if (repr.toolbarForm) {
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
    let querySelector;
    if (!toolbar) {
        querySelector = editor.options.element.querySelectorAll(
            '.cms-toolbar button, .cms-toolbar [role="button"], ' +
            '.cms-block-toolbar button, .cms-block-toolbar [role="button"]'
        );
    } else {
        querySelector = toolbar.querySelectorAll('button, [role="button"]');
    }
    for (const button of querySelector) {
        const {action} = button.dataset;
        if (TiptapToolbar[action]) {
              const toolbarItem = window.cms_editor_plugin._getRepresentation(action);
              try {
                  if (toolbarItem.enabled !== undefined) {
                      button.disabled = !toolbarItem.enabled(editor, button);
                  }
                  try {
                      if (toolbarItem.active && toolbarItem.active(editor, button)) {
                          button.classList.add('active');
                      } else {
                          button.classList.remove('active');
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
    editor.options.el.dataset.selecting = 'false';
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
    addProseMirrorPlugins() {
        'use strict';
        const {el} = this.editor.options;
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

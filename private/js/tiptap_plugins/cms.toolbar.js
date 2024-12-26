/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */

import {Extension} from "@tiptap/core";

import {NodeSelection} from "@tiptap/pm/state";
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


function _createBlockToolbarPlugin(editor) {
    'use strict';
    return new Plugin({
        props: {
            decorations(state) {
                return this.getState(state);
            },
            handleDOMEvents: {
                mousedowxn (view, event) {
                    if (editor.options.blockToolbar?.contains(event.target)) {
                        event.preventDefault();
                        return true;
                    }
                    return false;
                },
                click (view, event) {
                    const {blockToolbar} = editor.options;
                    if (blockToolbar?.contains(event.target)) {
                        if (blockToolbar.lastElementChild?.contains(event.target)) {
                            // clicked somewhere in dropdown?
                            _handleToolbarClick(event, editor);
                            return true;
                        }
                        console.log("Toolbar toggle pressed");
                        blockToolbar.classList.add('show');
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
                ]);            },
            apply(tr, value, oldState, newState) {
                const selectionChanged =
                    tr.docChanged || oldState.selection.eq(newState.selection) === false;

                if (selectionChanged) {
                    updateBlockToolbar(editor, newState);
                }
                return value;
            }
        }
    });
}

function _createBlockToolbar(editor, blockToolbar) {
    'use strict';

    const toolbar = document.createElement('div');

    toolbar.classList.add('cms-block-toolbar');
    toolbar.style.zIndex = editor.options.baseFloatZIndex || 1000000;  //
    toolbar.innerHTML = `${_drag_icon}<div class="cms-block-dropdown">${_populateToolbar(editor, blockToolbar, 'block')}</div>`;

    toolbar.draggable = true;
    toolbar.addEventListener("dragstart", (event) => {
        toolbar.classList.remove('show');
        const {resolvedPos, depth} = _getResolvedPos(editor.view.state);
        const block = resolvedPos.start(depth);
        if (depth >= 0) {
            const { state, dispatch } = editor.view;
            const nodeSelection = NodeSelection.create(state.doc, block);
            console.log("dragstart", nodeSelection);
            const domNode = editor.view.domAtPos(block).node;
            console.log(domNode);
            event.dataTransfer.setDragImage(domNode, 0, 0);
            dispatch(state.tr.setSelection(nodeSelection));
        } else {
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



 // Add the form dialog only if it is not already open
// this.form = new CmsForm(this.editor.options.el, () => {});
// const rect = this.toolbar.getBoundingClientRect();
// const options = {
//     x: (rect.left + rect.right) / 2,
//     y: rect.bottom,
//     toolbar: true
// };


function updateBlockToolbar(editor, state) {
    'use strict';
    console.log("updateBlockToolbar");
    state = state || editor.state;
    const {resolvedPos, depth} = _getResolvedPos(state);
    if (depth > 0) {
        _updateToolbarIcon(editor, resolvedPos.node(depth));
        const startPos = resolvedPos.start(depth);
        editor.options.blockToolbar.dataset.block = startPos;
        editor.options.blockToolbar.dataset.depth = depth;
        const pos = editor.view.coordsAtPos(startPos);
        const ref = editor.options.el.getBoundingClientRect();
        editor.options.blockToolbar.draggable = resolvedPos.node(depth).content.size > 0;
        editor.options.blockToolbar.style.insetBlockStart = `${pos.top - ref.top}px`;
        let title = resolvedPos.node(1).type.name;
        for (let i= 2; i <= depth; i++) {
            title += ` > ${resolvedPos.node(i).type.name}`;
        }
        editor.options.blockToolbar.title = title;
    } else {
        editor.options.blockToolbar.draggable = false;
    }
    // TODO: Set the size of the balloon according to the fontsize
    // this.toolbar.style.setProperty('--size', this.editor.view. ...)
}

function _getResolvedPos(state) {
    'use strict';
    const {head} = state.selection;
    const resolvedPos = state.doc.resolve(head);
    let minDepth = resolvedPos.depth;
    for (let depth = minDepth; depth > 0; depth--) {
        const node = resolvedPos.node(depth);
        if (node.type.isBlock) {
            // found a block node, do something with it
            minDepth = depth;
            if (depth <= 1 ||resolvedPos.node(depth-1).type.name !== 'listItem') {
                break;
            }
        }
    }
    return {resolvedPos, depth: minDepth};
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
                    _closeAllDropdowns(event, editor);
                    return false;
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
                const selectionChanged = tr.docChanged || oldState.selection.eq(newState.selection) === false;

                if (selectionChanged) {
                    setTimeout(this.handleSelectionChange, 0);
                }
                return value;
            }
        }
    });
}

function _createToolbar(editor, toolbar, filter) {
    'use strict';

    console.log('_createToolbar');
    const toolbarElement = document.createElement('div');
    toolbarElement.setAttribute('role', 'menubar');
    toolbarElement.classList.add('cms-toolbar');

    // create the toolbar html from the settings
    toolbarElement.innerHTML = `<div class="toolbar-dropback"></div>${_populateToolbar(editor, toolbar, filter)}`;

    // Add form submits and cancels
    // toolbarElement.querySelectorAll('.cms-form-buttons .submit')
    //     .forEach((el) => {
    //         el.addEventListener('click', (event) => this._submitToolbarForm(event, editor));
    //     }, this);
    // toolbarElement.querySelectorAll('form.cms-form')
    //     .forEach((el) => {
    //         el.addEventListener('submit', (event) => this._submitToolbarForm(event, editor));
    //     }, this);
    // toolbarElement.querySelectorAll('.cms-form-buttons .cancel')
    //     .forEach((el) => {
    //         el.addEventListener('click', (event) => {
    //             this._closeAllDropdowns(event, editor);
    //             editor.commands.focus();
    //         });
    //     }, this);
    // toolbarElement.querySelectorAll('form.cms-form .js-linkfield')
    //     .forEach((el) => {
    //         new LinkField(el, {
    //             url: editor.options.settings.url_endpoint || '',
    //         });
    //     }, this);

    if (!editor.options.element.classList.contains('fixed')) {
        // Limit its width to the available space
        toolbarElement.style.maxWidth = (window.innerWidth - toolbarElement.getBoundingClientRect().left - 16) + 'px';
    }
    return toolbarElement;
}

// handle a click on a toolbar button
// the button's data-action attribute is used to determine the action
function _handleToolbarClick(event, editor) {
    'use strict';
    console.log('handleToolbarClick', event);
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
            console.log('action', action);
            TiptapToolbar[action].action(editor, button);
            _updateToolbar(editor);
            // Close dropdowns after command execution
            _closeAllDropdowns(event, editor);
        }
    }
}

// Close all dropdowns
function _closeAllDropdowns(event, editor) {
    'use strict';
    let count = 0;
    console.log("close all dropdowns");
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

function _populateToolbar(editor, array, filter) {
    'use strict';
    let html = '';

    for (let item of array) {
        if (item === undefined) {
            continue;
        }
        if (item in TiptapToolbar && TiptapToolbar[item].insitu) {
            item = TiptapToolbar[item].insitu;
        } else if (item in TiptapToolbar && TiptapToolbar[item].items) {
            // Create submenu
            const repr = window.cms_editor_plugin._getRepresentation(item, filter);
            if (!repr) {
                continue;
            }
            item = TiptapToolbar[item];
            item.title = repr.title;
            item.icon = repr.icon;
        }
        if (Array.isArray(item)) {
            const group = _populateToolbar(editor, item, filter);
            if (group.length > 0) {
                html += group + editor.options.separator_markup;
            }
        } else if (item.constructor === Object) {
            let dropdown;

            if (typeof item.items === 'function') {
                dropdown = item.items(editor, (items) => _populateToolbar(editor, items, filter));
            } else {
                dropdown = _populateToolbar(editor, item.items, filter);
                // Are there any items in the dropdown?
            }
            if (dropdown.replaceAll(editor.options.separator_markup, '').replaceAll(editor.options.space_markup, '').length === 0) {
                continue;
            }
            const title = item.title && item.icon ? `title='${item.title}' ` : '';
            const icon = item.icon || item.title;
            html += `<span ${title}class="dropdown" role="button">${icon}<div title class="dropdown-content ${item.class || ''}">${dropdown}</div></span>`;
        } else {
            switch (item) {
                case '|':
                    // vertical separator
                    if (html.endsWith(editor.options.space_markup)) {
                        // Remove trailing space if there is one
                        html = html.slice(0, -editor.options.space_markup.length);
                    }
                    if (html.length > 0 && !html.endsWith(editor.options.separator_markup)) {
                        // Add separator if there is not already a vertical separator
                        html += editor.options.separator_markup;
                    }
                    break;
                case '-':
                    // additional horizontal space
                    if (html.length > 0 && !html.endsWith(editor.options.space_markup) && !html.endsWith(editor.options.separator_markup)) {
                        html += editor.options.space_markup;
                    }
                    break;
                case '/':
                    // line break
                    if (html.length > 0 && !html.endsWith('<br>') && !filter) {
                        html += '<br>';
                    }
                    break;
                default:
                    // Button
                    if (item in TiptapToolbar && TiptapToolbar[item].render) {
                        html += TiptapToolbar[item].render(editor, TiptapToolbar[item], filter);
                    } else {
                        html += _createToolbarButton(editor, item, filter);
                    }
                    break;
            }
        }
    }
    // Remove trailing separator or space
    if (html.endsWith(editor.options.separator_markup)) {
        html = html.slice(0, -editor.options.separator_markup.length);
    }
    if (html.endsWith(editor.options.space_markup)) {
        html = html.slice(0, -editor.options.space_markup.length);
    }
    return html;
}

// create the html for a toolbar button
function _createToolbarButton(editor, itemName, filter) {
    'use strict';

    const item = itemName.split(' ')[0];

    const repr = window.cms_editor_plugin._getRepresentation(item, filter);
    if (repr) {
        repr.dataaction = repr.dataaction || item;
        const title = repr && repr.icon ? `title='${repr.title}' ` : '';
        const position = repr.position ? `style="float :${repr.position};" ` : '';
        const cmsplugin = repr.cmsplugin ? `data-cmsplugin="${repr.cmsplugin}" ` : '';
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
        return `<button data-action="${repr.dataaction}" ${cmsplugin}${title}${position}class="${classes}" role="button">
                        ${repr.icon || repr.title}${form}
                    </button>`;
    }
    return '';
}

// update the toolbar button states
function _updateToolbar(editor, toolbar) {
    'use strict';
    let selector;
    if (!toolbar) {
        toolbar = editor.options.element;
        selector = '.cms-toolbar button, .cms-toolbar [role="button"], ' +
            '.cms-block-toolbar button, .cms-block-toolbar [role="button"]';
    } else {
        selector = 'button, [role="button"]';
    }
    for (const button of toolbar.querySelectorAll(selector)) {
        const action = button.dataset.action;
        if (action) {
            if (TiptapToolbar[action]) {
                const toolbarItem = window.cms_editor_plugin._getRepresentation(action);
                try {
                    button.disabled = !toolbarItem?.enabled(editor, button);
                    try {
                        if (toolbarItem?.active(editor, button)) {
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
        const action = form.closest('[role=button]').dataset.action;
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
        console.log('CmsToolbarPlugin', el, el_rect);
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

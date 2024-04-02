/* eslint-env es6 */
/* jshint esversion: 6 */
/* global document, window, console */

import {CmsForm} from "../cms.dialog";
import "../../css/cms.balloon-toolbar.css";

export default class CmsBalloonToolbar {

    _drag_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" ' +
            'class="bi bi-grip-vertical" viewBox="0 0 16 16"><path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 ' +
            '1 1 0 0 1 2 0M7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0M7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 ' +
            '0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-3 3a1 1 ' +
            '0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/></svg>';

    _menu_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" ' +
        'class="bi bi-list" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 ' +
        '1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 ' +
        '0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/></svg>'

    topLevelBlocks = {
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
    }

    constructor(editor, tb_config, actionCallback, updateCallback) {
        this.editor = editor;
        this.form = null;
        this.toolbar = document.createElement('div');
        this.toolbar.classList.add('cms-balloon');
        this.toolbar.style.zIndex = editor.options.baseFloatZIndex || 10000000;  //
        this.toolbar.innerHTML = this._menu_icon;

        editor.options.el.prepend(this.toolbar);
        this.toolbar.draggable = true;
        this.toolbar.addEventListener('dragstart', () => this._dragStart());
        this.toolbar.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.editor.commands.focus();
            if (this.form && editor.options.el.parentNode.querySelector('.cms-balloon-menu')) {
                this.form.close();
                this.form = null;
            } else {
                // Add the form dialog only if it is not already open
                this.form = new CmsForm(this.editor.options.element, () => {
                });
                const rect = this.toolbar.getBoundingClientRect();
                const options = {
                    x: (rect.left + rect.right) / 2,
                    y: rect.bottom,
                    toolbar: true
                };
                this.form.formDialog(tb_config, options);
                this.form.dialog.classList.add('cms-balloon-menu');
                if (updateCallback) {
                    updateCallback(this.form.dialog, editor);
                }
                if (actionCallback) {
                    for (const entry of this.form.dialog.querySelectorAll('button, [role="button"]')) {
                        entry.addEventListener('click', (event) => {
                            const button = event.target.closest('button, [role="button"]');
                            if (!button.disabled) {
                                this.form.close();
                                actionCallback(event, editor);
                                this._updateToolbarIcon();  // Update icon
                            } else {
                                editor.commands.focus();
                            }
                        });
                    }
                }
                this.form.open();
            }
        });
        this.ref = editor.options.el.getBoundingClientRect();
        editor.on('selectionUpdate', () => this._showToolbar());
        editor.on('blur', () => this._showToolbar());
        editor.on('destroy', () => this.remove());

        this._node_icons = {};
        for (const [icon, node] of  Object.entries(this.topLevelBlocks)) {
            console.log(icon);
            this._node_icons[node] = cms_editor_plugin.lang[icon].icon;
        }
     }

    _createToolbar(div) {
        let ul = div.querySelector('ul');
        if (ul.length === 0) {
            return;
        }
        ul = ul[0]
        for (let item of this.tb_config) {
            ul.append(`<li><a href="#" data-action="${item[0]}">${item[1]}</a></li>`);
        }}

    _showToolbar() {
        if (!this.editor.isFocused) {
            return;
        }
        const resolvedPos = this._getResolvedPos();
        let depth = resolvedPos.depth;
        while (depth > 0) {
            const node = resolvedPos.node(depth);
            if (node.type.isBlock) {
                // found a block node, do something with it
                break;
            }
            depth -= 1;
        }
        depth = 1;  // TODO: Decide which works better: First level, or highest level with block node
        this._updateToolbarIcon(resolvedPos.node(depth));
        const startPos = resolvedPos.start(depth);
        this.toolbar.dataset.block = startPos;
        const pos = this.editor.view.coordsAtPos(startPos);
        this.toolbar.style.insetBlockStart = `${pos.top + window.scrollY - this.ref.top}px`;
        // TODO: Set the size of the balloon according to the fontsize
        //  this.toolbar.style.setProperty('--size', this.editor.view. ...)
    }

    _getResolvedPos() {
        const {head} = this.editor.state.selection;
        return this.editor.state.doc.resolve(head);
    }

    _updateToolbarIcon (node) {
        if (!node) {
            node = this._getResolvedPos().node(1);
        }
        const type = node.type.name === 'heading' ?
            'heading' + node.attrs.level : node.type.name;
        if (type in this._node_icons) {
            this.toolbar.innerHTML = this._node_icons[type];
        } else {
            console.log(type);
            this.toolbar.innerHTML = this._menu_icon;
        }
    }
    _dragStart () {
        console.log("dragstart", this.toolbar.dataset.block);
        if (this.toolbar.dataset.block) {
            const dragstartEvent = new DragEvent('dragstart');
            const {node} = this.editor.view.domAtPos(this.toolbar.dataset.block);
            node.dispatchEvent(dragstartEvent);
        }
    }

    remove() {
        this.toolbar.remove();
    }
}

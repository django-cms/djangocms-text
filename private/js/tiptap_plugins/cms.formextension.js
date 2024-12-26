/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */
'use strict';

import {CmsForm, formToHtml, populateForm} from "../cms.dialog";
import {Extension} from "@tiptap/core";
import TiptapToolbar from "./cms.tiptap.toolbar";
import LinkField from "../cms.linkfield";

import {Decoration, DecorationSet} from '@tiptap/pm/view';
import {Plugin} from '@tiptap/pm/state';


// ProseMirror plugin to handle temporary decorations
const _fakeSelectionPlugin = new Plugin({
    state: {
        init(_, {doc}) {
            return DecorationSet.empty;
        },
        apply(tr, decorationSet) {
            // Remove decoration on any transaction unless explicitly preserved
            if (tr.getMeta("fake-selection") === "add") {
                const {from, to} = tr.selection;
                const decoration = Decoration.inline(from, to, {class: "fake-selection"});
                return decorationSet.add(tr.doc, [decoration]);
            } else if (tr.getMeta("fake-selection") === "remove") {
                const decorations = decorationSet.find().filter(
                    (decoration) => decoration.spec?.class === "fake-selection"
                );
                return DecorationSet.create(tr.doc, decorations);
            }
            return decorationSet.map(tr.mapping, tr.doc);
        },
    },
    props: {
        decorations(state) {
            return this.getState(state);
        },
    },
});


function addFakeSelection(view) {
    const {state, dispatch} = view;
    const tr = state.tr;
    // Add meta to trigger the plugin
    tr.setMeta("fake-selection", "add");
    dispatch(tr);
    view.dom.parentNode.querySelector('.cms-toolbar')?.classList.add('disabled');
    view.dom.parentNode.querySelector('.cms-balloon')?.classList.add('disabled');
}

function clearFakeSelection(view) {
    const {state, dispatch} = view;
    const tr = state.tr;
    // Add meta to trigger the plugin
    tr.setMeta("fake-selection", "remove");
    dispatch(tr);
    view.dom.parentNode.querySelector('.cms-toolbar')?.classList.remove('disabled');
    view.dom.parentNode.querySelector('.cms-balloon')?.classList.remove('disabled');
}



const CmsFormExtension = Extension.create({
    name: 'formExtension',
    addCommands() {
        'use strict';
        return {
            openCmsForm: (action, target) => ({editor, commands}) => {
                if (editor.options.topToolbar.querySelector(`dialog.${action}-form`)) {
                    return false;
                }
                let options;
                addFakeSelection(editor.view);
                if (target) {
                    const rect = target.getBoundingClientRect();
                    options = {
                        x: rect.left,
                        y: rect.top + rect.height,
                    };
                } else {
                    const {from, to} = editor.state.selection;
                    const start = editor.view.coordsAtPos(from);
                    const end = editor.view.coordsAtPos(to);
                    const rect = {
                        left: start.left,
                        right: end.right,
                        top: start.top,
                        bottom: end.bottom,
                    };  // TODO: handle multiline selections
                    options = {
                        x: Math.round((rect.left + rect.right) / 2),
                        y: rect.bottom,
                    };

                }
                editor.options.topToolbar.focus();
                const dialog = new CmsForm(
                    editor.options.el,
                    data => {
                        TiptapToolbar[action].formAction(editor, data);
                        editor.commands.closeCmsForm();
                    },
                    () => editor.commands.closeCmsForm()
                );
                // editor.commands.focus();
                const formRepresentation = window.cms_editor_plugin._getRepresentation(action);
                const formElement = dialog.formDialog(formToHtml(formRepresentation.form), options);

                if (TiptapToolbar[action] && TiptapToolbar[action].attributes) {
                    // Populate the form with the current attributes (if existent)
                    populateForm(formElement, TiptapToolbar[action].attributes(editor), formRepresentation.form);
                }
                dialog.dialog.classList.add(action + '-form');
                dialog.open();
                formElement.querySelectorAll('form.cms-form .js-linkfield')
                    .forEach((el) => {
                        new LinkField(el, {
                            url: editor.options.settings.url_endpoint || '',
                        });
                    }, this);
            },

            closeCmsForm: () => ({editor}) => {
                clearFakeSelection(editor.view);
                editor.commands.focus();
            }
        };
    },
    addProseMirrorPlugins() {
        return [_fakeSelectionPlugin];
    },
});

export default CmsFormExtension;

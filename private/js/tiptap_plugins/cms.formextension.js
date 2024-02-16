/* eslint-env es6 */
/* jshint esversion: 6 */
/* global document, window, console */

import {CmsForm, formToHtml, populateForm} from "../cms.dialog";
import {Extension} from "@tiptap/core";
import TiptapToolbar from "./cms.tiptap.toolbar";
import LinkField from "../cms.linkfield";



const FormExtension = Extension.create({
    name: 'formExtension',
    addCommands() {
        'use strict';
        return {
            openCmsForm: (action, target) => ({editor, commands}) => {
                let options;
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
                const dialog = new CmsForm(
                    editor.options.element,
                    data => TiptapToolbar[action].formAction(editor, data)
                    // () => editor.commands.focus()
                );
                const formRepresentation = window.cms_editor_plugin._getRepresentation(action);
                const formElement = dialog.formDialog(formToHtml(formRepresentation.form), options);

                if (TiptapToolbar[action] && TiptapToolbar[action].attributes) {
                    // Populate the form with the current attributes (if existent)
                    populateForm(formElement, TiptapToolbar[action].attributes(editor), formRepresentation.form);
                }
                dialog.open();
                formElement.querySelectorAll('form.cms-form .js-linkfield')
                    .forEach((el) => {
                        new LinkField(el, {
                            url: editor.options.settings.url_endpoint || '',
                        });
                    }, this);
            }
        };
    }
});

export default FormExtension;

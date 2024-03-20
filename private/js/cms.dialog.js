/* eslint-env es6 */
/* jshint esversion: 6 */
/* global document, window, console */

import "../css/cms.dialog.css";

class CmsDialog {
    /**
     * Constructor for creating an instance of the class whowing a django CMS modal in a
     * modal HTML dialog element to show a plugin admin form in an iframe.
     *
     * The django CMS modal is resizable (thanks to CSS) and movable. It cannot be
     * minimized or maximized. It blocks all other input on the page until it is closed.
     *
     * The dialog element is attached to the <div id="cms-top"> at the beginning of a page
     * with a toolbar. The dialog is removed when it is closed.
     *
     * @param {Element} el - The editor element to be associated with the instance.
     * @param {Function} saveSuccess - The success callback function to be invoked upon save.
     * @param {Function} cancel - The callback function to be invoked upon cancellation.
     */
    constructor(el, saveSuccess, cancel) {
        this.el = el;
        this.saveSuccess = saveSuccess;
        this.cancel = cancel;
    }

    /**
     * Create a plugin modal dialog.
     * @return {HTMLIFrameElement} - The newly created iframe element.
     */
    pluginDialog() {
        this.dialog = document.createElement("dialog");
        this.dialog.classList.add("cms-dialog");
        this.dialog.dataset.editor = this.el.id;
        this.dialog.innerHTML = `
            <div class="cms-modal-head">
                <span class="cms-modal-title">
                    <span class="cms-modal-title-prefix"></span>
                    <span class="cms-modal-title-suffix"></span>
                    <span class="cms-modal-close cms-icon cms-icon-close"></span>
                </span>
            </div>
            <div class="cms-modal-body">
            </div>
            <div class="cms-modal-foot">
                <div class="cms-modal-buttons">
                <div class="cms-modal-buttons-inner">
                    <div class="cms-modal-item-buttons"><a href="#" class="cms-btn cms-btn-action default">Save</a></div>
                    <div class="cms-modal-item-buttons"><a href="#" class="cms-btn cms-btn-close-action">Cancel</a></div>
                </div>
            </div>
        `;

        (window.parent || window).document.querySelector('div.cms').prepend(this.dialog);
        const settings = window.CMS_Editor.getSettings(this.el);
        this.dialog.querySelector(".cms-modal-title-suffix").textContent = settings.lang.edit;
        this.dialog.querySelector(".cms-modal-title-prefix").textContent = settings.lang.toolbar;
        this.dialog.querySelector('.cms-modal-title').addEventListener('mousedown', (event) => {
            this.dragDialog(event);
        });
        this.dialog.querySelector('.cms-modal-title').addEventListener('touchstart', (event) => {
            this.swipeDialog(event);
        });
        const closeEvent = (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.close();
            if (this.cancel) {
                this.cancel(event);
            }
        };
        this.dialog.addEventListener("close", (event) => closeEvent(event));
        this.dialog
            .querySelector(".cms-btn-close-action")
            .addEventListener('click', (event) => closeEvent(event));
        this.dialog
            .querySelector(".cms-modal-close")
            .addEventListener('click', (event) => closeEvent(event));
        this.dialog.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                // Don't propagate the event to the CMS modal, or it will close, too
                event.stopPropagation();
            }
        });
        const iframe = document.createElement('iframe');
        this.dialog.querySelector(".cms-modal-body").append(iframe);
        return iframe;
    }

    /**
     * Opens the edit dialog for a specific plugin.
     *
     * @param {string} pluginId - The ID of the plugin to be edited.
     *
     * @return {void}
     */
    editDialog(pluginId) {
        const iframe = this.pluginDialog();

        window.CMS_Editor.editPluginForm(pluginId, iframe, this.el,
            (el, content, heading, submitrow) => this._dialogLoaded(el, content, heading, submitrow),
            (el, content, data) => this._dialogSaved(el, content, data));
    }

    /**
     * Dialog to add a plugin.
     *
     * @param {string} pluginType - The type of the plugin.
     * @param {string} selectionText - The selected text (will be copied into the input field with
     *                                 the class "js-prepopulate-selected-text").
     *
     * @return {void}
     */
    addDialog(pluginType, selectionText) {
        const iframe = this.pluginDialog();

        window.CMS_Editor.addPluginForm(pluginType, iframe, this.el,
            (el, content, heading, submitrow) =>
                this._dialogLoaded(el, content, heading, submitrow, selectionText),
            (el, content, data) => this._dialogSaved(el, content, data));
    }

    _dialogLoaded(el, content, heading, submitrow, selectionText) {
        if (submitrow) {
            this.dialog.querySelector('.cms-btn-action.default')
                .addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    submitrow.closest('form').submit();
                });
        } else {
            this.dialog.querySelector('.cms-btn-action.default').style.display = 'none';
        }
        if (heading) {
            this.dialog.querySelector(".cms-modal-title-suffix").textContent = heading.textContent;
        }
        // If form is big (i.e., scrollbars appear), make the dialog bigger
        if (content.documentElement.scrollHeight > content.documentElement.clientHeight) {
            this.dialog.style.height = "60%";
            this.dialog.style.width = "80%";
            content.documentElement.scrollTop = 0;
        }

        // Prefill marked input fields with selected text
        selectionText = selectionText || '';
        if (selectionText.length > 0) {
            let fillInput = content.querySelector('.js-ckeditor-use-selected-text,.js-prepopulate-selected-text') ||
                content.querySelector('#id_name');
            if (fillInput) {  // Does such a field exist?
                if (!(fillInput.value.trim())) {
                    fillInput.value = selectionText;  // Prefill the field only if it is empty
                    fillInput.focus();
                }
            }
        }
        this.open();
    }

    _dialogSaved(el, content, data) {
        this.saveSuccess(data);
        this.close();
    }

    /**
     * Opens the dialog by showing it in a modal state.
     *
     * @return {void}
     */
    open() {
        this.dialog.showModal();
    }

    /**
     * Removes the dialog
     *
     * @method close
     * @memberof ClassName
     * @returns {void}
     */
    close() {
        this.dialog.removeEventListener("close", this.close.bind(this));
        this.dialog.remove();
    }

    /**
     * Allows dragging the dialog based on the user's mouse movements.
     *
     * @param {Event} event - The mouse event that triggers the drag.
     */
    dragDialog(event) {
        if (event.which !== 1) {
            return;
        }
        event.preventDefault();
        const firstX = event.pageX;
        const firstY = event.pageY;
        const initialX = parseInt(getComputedStyle(this.dialog).left);
        const initialY = parseInt(getComputedStyle(this.dialog).top);

        const dragIt = (e) => {
            this.dialog.style.left = initialX + e.pageX - firstX + 'px';
            this.dialog.style.top = initialY + e.pageY - firstY + 'px';
        };
        const Window = window.parent || window;
        Window.addEventListener('mousemove', dragIt, false);
        Window.addEventListener('mouseup', (e) => {
            Window.removeEventListener('mousemove', dragIt, false);
        }, false);
    }

    /**
     * Allows dragging the dialog based on the user's touch movements.
     *
     * @param {Event} event - The touch event that triggers the drag.
     */
    swipeDialog(event) {
        event.preventDefault();

        const firstX = event.pageX;
        const firstY = event.pageY;
        const initialX = parseInt(getComputedStyle(this.dialog).left);
        const initialY = parseInt(getComputedStyle(this.dialog).top);

        const swipeIt = (e) => {
            const contact = e.touches;
            this.dialog.style.left = initialX + contact[0].pageX - firstX + 'px';
            this.dialog.style.top = initialY + contact[0].pageY - firstY + 'px';
        };

        const Window = window.parent || window;
        Window.addEventListener('touchmove', swipeIt, false);
        Window.addEventListener('touchend', (e) => {
            Window.removeEventListener('touchmove', swipeIt, false);
        }, false);
    }
}


/**
 * Represents an editor form, e.g. to enter a link address, or a pop-up toolbar.
 *
 * The form is contained in a (non-modal) dialog element which is attached to the editor's div wrapper.
 *
 *
 * @constructor
 * @param {*} el - The element to attach the form to.
 * @param {function} saveSuccess - The callback function to be called when form is successfully submitted.
 * @param {function} cancel - The callback function to be called when form is cancelled.
 */
class CmsForm {
     constructor(el, saveSuccess, cancel) {
        this.el = el;
        this.saveSuccess = saveSuccess;
        this.cancel = cancel;
    }

    formDialog(form, options) {
        this.dialog = document.createElement("dialog");
        this.dialog.classList.add("cms-form-dialog");
        if (options.toolbar) {
            this.dialog.innerHTML = form;
        } else {
            this.dialog.innerHTML = `
                <form class="cms-form">
                    <div class="cms-form-inputs">${form}</div>
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

        if (options && options.x && options.y) {
            if (options.x > window.innerWidth/2) {
                this.dialog.classList.add("right");
                this.dialog.style.right = (window.innerWidth - options.x - 35) + 'px';
            } else {
                this.dialog.style.left = (options.x - 25) + 'px';
            }
            this.dialog.style.top = (options.y + 5) + 'px';
            this.dialog.style.transform = 'none';
        }

        // Add the dialog to the inline editor
        this.el.prepend(this.dialog);
        this.dialog.addEventListener("close", (event) => {
            event.stopPropagation();
            this.close();
        });
        document.addEventListener("click", this.close.bind(this));
        if (this.dialog.querySelector('.cancel')) {
            this.dialog
                .querySelector(".cancel")
                .addEventListener('click', (event) => this.close()  );
        }
        this.dialog.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                // Don't propagate the event to the CMS modal, or it will close, too
                event.stopPropagation();
                event.preventDefault();
                this.close();
            }
        });
        const formElement = this.dialog.querySelector('form');
        if (formElement) {
            formElement.addEventListener('submit', (event) => {
                event.preventDefault();
                this.submit();
            });
            this.dialog.querySelector(".submit").addEventListener('click', (event) => {
                event.preventDefault();
                if (this.dialog.querySelector('form').reportValidity()) {
                    this.submit();
                }
            });
        }
        return formElement || this.dialog;
    }

    open() {
        this.dialog.show();
        const firstInput = this.dialog.querySelector('input');
        if (firstInput) {
            firstInput.focus();
        }
    }

    close(event) {
         console.log(event);
        if (!event || !this.dialog.contains(event.target)) {

            if (this.cancel) {
                this.cancel(event);
            }
            document.removeEventListener("click", this.close.bind(this));
            this.dialog.removeEventListener("close", this.close.bind(this));
            this.dialog.remove();
        }
    }

    submit() {
        const data = new FormData(this.dialog.querySelector('form'));
        this.dialog.remove();
        this.saveSuccess(data);
    }
}


/**
 * Converts a given form array to HTML representation.
 *
 * @param {Array} formArray - The array containing form elements.
 * @returns {string} - The HTML form representation.
 */
function formToHtml(formArray) {
    'use strict';
    let form = '';

    formArray.forEach((element) => {
        switch(element.type) {
            case 'text':
            case 'url':
                form += `<label for="${element.name}">${element.label}</label>`;
                form += `<input type="${element.type}" id="${element.name}"
                    placeholder="${element.placeholder || ''}" name="${element.name}"
                    class="${element.class || ''}"
                    value="${element.value || ''}"${element.required ? ' required' : ''}>`;
                break;
            case 'select':
                form += `<label for="${element.name}">${element.label}</label>`;
                form += `<select id="${element.name}" name="${element.name}"${element.required ? ' required' : ''} class="${element.class || ''}">`;
                element.options.forEach((option) => {
                    form += `<option value="${option.value}"${option.value === element.value ? ' selected' : ''}>${option.label}</option>`;
                });
                form += '</select>';
                break;
            case 'hidden':
                form += `<input type="hidden" id="${element.name}" name="${element.name}" value="${element.value || ''}">`;
                break;
            case 'hr':
                form += '<hr>';
                break;
        }
    });
    return form + '<input type="submit" hidden />';
}


/**
 * Populates a given HTML form with values from a form object.
 *
 * @param {HTMLFormElement} htmlForm - The HTML form element to populate.
 * @param {object} attributes - The attributes to populate the form with.
 * @param {Array} formObject - The form object containing input values.
 */
function populateForm(htmlForm,  attributes, formObject) {
    'use strict';
    if (attributes && formObject) {
        for (const input of formObject) {
            let value;
            if (input.name in attributes) {
                value = attributes[input.name] || '';
            } else {
                value = input.value || '';
            }
            const field = htmlForm.querySelector(`[name="${input.name}"]`);
            if (field && field.value !== value) {
                field.value = value;
                if (field.getAttribute('type') === 'hidden') {
                    // Trigger change event for hidden fields
                    field.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
                }
            }
        }
    }
}




export { formToHtml, populateForm, CmsForm, CmsDialog as default };

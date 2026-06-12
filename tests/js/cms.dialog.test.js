/* eslint-env es11, jest */
/* jshint esversion: 11 */
/* global document, describe, it, expect */

// populateForm must fill fields nested inside "section" entries
// (rendered as <details>) — e.g. the link target select (#187).

import {formToHtml, populateForm} from '../../private/js/cms.dialog';

const linkForm = [
    {name: 'href_select', type: 'hidden', required: false},
    {name: 'href', label: 'URL', type: 'text', required: false},
    {
        type: 'section',
        label: 'Link options',
        content: [
            {
                name: 'target',
                label: 'Target',
                type: 'select',
                options: [
                    {value: '', label: '-----'},
                    {value: '_blank', label: 'New window'},
                    {value: '_self', label: 'Same window'},
                ],
                required: false,
            },
        ],
    },
];

function renderForm(formArray) {
    const form = document.createElement('form');
    form.innerHTML = formToHtml(formArray);
    document.body.appendChild(form);
    return form;
}

describe('populateForm', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('fills top-level fields from attributes', () => {
        const form = renderForm(linkForm);
        populateForm(form, {href: 'https://example.com'}, linkForm);
        expect(form.querySelector('[name="href"]').value).toBe('https://example.com');
    });

    it('fills fields nested inside sections', () => {
        const form = renderForm(linkForm);
        populateForm(form, {href: 'https://example.com', target: '_blank'}, linkForm);
        expect(form.querySelector('[name="target"]').value).toBe('_blank');
    });

    it('opens the enclosing collapsed section when a nested field has a value', () => {
        const form = renderForm(linkForm);
        populateForm(form, {target: '_blank'}, linkForm);
        expect(form.querySelector('details').open).toBe(true);
    });

    it('leaves the section collapsed when the nested field is empty', () => {
        const form = renderForm(linkForm);
        populateForm(form, {href: 'https://example.com'}, linkForm);
        expect(form.querySelector('details').open).toBe(false);
    });

    it('dispatches an input event for hidden fields', () => {
        const form = renderForm(linkForm);
        const events = [];
        form.querySelector('[name="href_select"]').addEventListener('input', (e) => events.push(e));
        populateForm(form, {href_select: '42'}, linkForm);
        expect(form.querySelector('[name="href_select"]').value).toBe('42');
        expect(events).toHaveLength(1);
    });
});

import Table from '@tiptap/extension-table'

/**
 * ExtendedTable is a custom extension of the Table class that allows individual
 * tables to have custom CSS classes applied. This is achieved by adding a `class`
 * attribute to the table's attributes.
 *
 * - The `class` attribute can be parsed from the HTML element's `class` attribute.
 * - When rendering the table back to HTML, the `class` attribute is included if it exists.
 *
 * @extends Table
 * @property {Object} attributes - The attributes of the table.
 * @property {string|null} attributes.class - The CSS class applied to the table. Defaults to `null`.
 */

function getDefaultTableClass(classes) {
    'use strict';

    const classesOption = classes === undefined || classes === null
        ? cms_editor_plugin.tableClasses || 'table'
        : classes;

    if (Array.isArray(classesOption) && classesOption.length > 0) {
        return classesOption[0][0];
    }
    return classesOption;
}


const ExtendedTable = Table.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            addClasses: {
                default: null,
                parseHTML: element => element.getAttribute('class') || this.options.defaultClasses,
                renderHTML: attributes => ({ class: attributes.addClasses })
            },
        }
    },
    onCreate() {
        this.options.defaultClasses = getDefaultTableClass(this.editor.options.tableClasses);
    }
});

export {ExtendedTable as default, getDefaultTableClass};

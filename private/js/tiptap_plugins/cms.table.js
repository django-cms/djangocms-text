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
const ExtendedTable = Table.extend({

    addAttributes() {
        return {
            ...this.parent?.(),
            class: {
                default: null,
                parseHTML: element => ({
                    class: element.getAttribute('class'),
                }),
                renderHTML: attributes => {
                    return { class: attributes.class || null };
                },
            },
        }
    },
});

export default ExtendedTable;
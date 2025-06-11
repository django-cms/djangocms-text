/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */

'use strict';


function generateButtonArray(rows, cols) {
    const buttons = ['<div class="tt-create-table">'];
    for (let j= 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            buttons.push(`<button title="${i+1}x${j+1}" data-action="Table" style="--mx: ${i*12}px; --my: ${j*12+4}px;" data-rows="${j+1}" data-cols="${i+1}"></button>`);
        }
    }
    buttons.push('</div>');
    return buttons.join('');
}

const _tableMenu = [
    ['addColumnBefore', 'addColumnAfter', 'deleteColumn'],
    ['addRowBefore', 'addRowAfter', 'deleteRow'],
    ['toggleHeaderColumn', 'toggleHeaderRow', 'mergeOrSplit']
];

function generateTableMenu(editor, builder, item) {
    let tableMenu = builder(_tableMenu);

    if (tableMenu.endsWith(editor.options.separator_markup)) {
        tableMenu = tableMenu.slice(0, -editor.options.separator_markup.length);
    }
    return generateButtonArray(10, 10, item.attr || editor.options.tableClasses || 'table') + `<div class="tt-edit-table">${tableMenu}</div>` + builder(['tableClass']);
}

function getDefaultTableClass(classes) {
    if (!classes) {
        classes = cms_editor_plugin.tableClasses || 'table';
    }
    if (Array.isArray(classes) && classes.length > 0) {
        return classes[0][0];
    }
    return classes;
}

function renderTableClassOptions(editor, item) {
    const tableClasses = editor.options.tableClasses || cms_editor_plugin.tableClasses;
    if (!Array.isArray(tableClasses)) {
        // Only one option - no need to render a button to select it
        return '';
    }
    return '<div class="hr"></div>' + tableClasses
        .map((cls) => `<button data-action="tableClass" data-attr="${cls[0]}">${cls[1] || cls[0]}</button>`)
        .join('');
}

const TiptapToolbar = {
    Undo: {
        action: (editor) => editor.chain().focus().undo().run(),
        enabled: (editor) => editor.can().undo(),
        type: 'mark',
    },
    Redo:{
        action: (editor) => editor.chain().focus().redo().run(),
        enabled: (editor) => editor.can().redo(),
        type: 'mark',
    },
    Bold: {
        action: (editor) => editor.chain().focus().toggleBold().run(),
        enabled: (editor) => editor.can().toggleBold(),
        active: (editor) => editor.isActive('bold'),
        type: 'mark',
    },
    Italic: {
        action: (editor) => editor.chain().focus().toggleItalic().run(),
        enabled: (editor) => editor.can().toggleItalic(),
        active: (editor) => editor.isActive('italic'),
        title: 'Italic',
        type: 'mark',
    },
    Underline: {
        action: (editor) => editor.chain().focus().toggleUnderline().run(),
        enabled: (editor) => editor.can().toggleUnderline(),
        active: (editor) => editor.isActive('underline'),
        title: 'Underline',
        type: 'mark',
    },
    Strike: {
        action: (editor) => editor.chain().focus().toggleStrike().run(),
        enabled: (editor) => editor.can().toggleStrike(),
        active: (editor) => editor.isActive('strike'),
        type: 'mark',
    },
    Subscript: {
        action: (editor) => editor.chain().focus().toggleSubscript().run(),
        enabled: (editor) => editor.can().toggleSubscript(),
        active: (editor) => editor.isActive('subscript'),
        type: 'mark',
    },
    Superscript: {
        action: (editor) => editor.chain().focus().toggleSuperscript().run(),
        enabled: (editor) => editor.can().toggleSuperscript(),
        active: (editor) => editor.isActive('superscript'),
        type: 'mark',
    },
    TextColor: {
        action: (editor, button)     => {
            if (editor.isActive('textcolor')) {
                // If the user is currently changing a text color, update the whole colored section
                editor.chain().focus().extendMarkRange('textcolor').run();
            }
            editor.chain().focus().toggleTextColor(button?.dataset?.class || 'text-primary').run();
        },
        enabled: (editor) => editor.can().toggleTextColor(),
        active: (editor, button) => editor.isActive('textcolor', {class: button.dataset?.class}),
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-fonts" viewBox="0 0 16 16"><path d="M12.258 3h-8.51l-.083 2.46h.479c.26-1.544.758-1.783 2.693-1.845l.424-.013v7.827c0 .663-.144.82-1.3.923v.52h4.082v-.52c-1.162-.103-1.306-.26-1.306-.923V3.602l.431.013c1.934.062 2.434.301 2.693 1.846h.479z"/></svg>',
        type: 'mark',
        class: 'js-set-active-class',
    },
    InlineQuote: {
        action: (editor) => {
            if (editor.isActive('Q')) {
                editor.chain().focus().extendMarkRange('Q').unsetMark('Q').run();
            } else {
                editor.chain().focus().setMark('Q').run();
            }
        },
        enabled: (editor) => editor.can().toggleMark('Q'),
        active: (editor) => editor.isActive('Q'),
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-quote" viewBox="0 0 16 16">' +
            '<path d="M12 12a1 1 0 0 0 1-1V8.558a1 1 0 0 0-1-1h-1.388q0-.527.062-1.054.093-.558.31-.992t.559-.683q.34-.279.868-.279V3q-.868 0-1.52.372a3.3 3.3 0 0 0-1.085.992 4.9 4.9 0 0 0-.62 1.458A7.7 7.7 0 0 0 9 7.558V11a1 1 0 0 0 1 1zm-6 0a1 1 0 0 0 1-1V8.558a1 1 0 0 0-1-1H4.612q0-.527.062-1.054.094-.558.31-.992.217-.434.559-.683.34-.279.868-.279V3q-.868 0-1.52.372a3.3 3.3 0 0 0-1.085.992 4.9 4.9 0 0 0-.62 1.458A7.7 7.7 0 0 0 3 7.558V11a1 1 0 0 0 1 1z"/>' +
            '</svg>',
        type: 'mark',
    },
    Highlight: {
        action: (editor) => {
            // "Mark" is already used by TipTap...
            if (editor.isActive('Highlight')) {
                editor.chain().focus().extendMarkRange('Highlight').unsetMark('Highlight').run();
            } else {
                editor.chain().focus().setMark('Highlight').run();
            }
        },
        enabled: (editor) => editor.can().toggleMark('Highlight'),
        active: (editor) => editor.isActive('Highlight'),
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-highlighter" viewBox="0 0 16 16">\n' +
            '  <path fill-rule="evenodd" d="M11.096.644a2 2 0 0 1 2.791.036l1.433 1.433a2 2 0 0 1 .035 2.791l-.413.435-8.07 8.995a.5.5 0 0 1-.372.166h-3a.5.5 0 0 1-.234-.058l-.412.412A.5.5 0 0 1 2.5 15h-2a.5.5 0 0 1-.354-.854l1.412-1.412A.5.5 0 0 1 1.5 12.5v-3a.5.5 0 0 1 .166-.372l8.995-8.07zm-.115 1.47L2.727 9.52l3.753 3.753 7.406-8.254zm3.585 2.17.064-.068a1 1 0 0 0-.017-1.396L13.18 1.387a1 1 0 0 0-1.396-.018l-.068.065zM5.293 13.5 2.5 10.707v1.586L3.707 13.5z"/>\n' +
            '</svg>',
        type: 'mark',
    },
    InlineStyles: {
        type: 'mark',
        class: 'vertical js-set-active-text',
        action: (editor, button) => {
            editor.chain().focus().toggleInlineStyle(button?.dataset?.id ||0).run();
        },
        enabled: (editor, button) => editor.can().toggleInlineStyle(button?.dataset?.id || 0),
        active: (editor, button) => editor.commands.activeInlineStyle(button?.dataset?.id || 0),

    },
    BlockStyles: {
        type: 'mark',
        class: 'vertical js-set-active-text',
        action: (editor, button) => editor.chain().focus().toggleBlockStyle(button?.dataset?.id || 0).run(),
        enabled: (editor, button) => editor.can().toggleBlockStyle(button?.dataset?.id || 0),
        active: (editor, button) => editor.commands.activeBlockStyle(button?.dataset?.id || 0),
    },
    RemoveFormat: {
        action: (editor) => editor.chain().focus().unsetAllMarks().run(),
        enabled: (editor) => editor.can().unsetAllMarks(),
        type: 'mark',
    },
    JustifyLeft: {
        action: (editor) => editor.chain().focus().setTextAlign('left').run(),
        enabled: (editor) => editor.can().setTextAlign('left'),
        active: (editor) => editor.isActive({textAlign: 'left'}),
        type: 'block',
    },
    JustifyCenter: {
        action: (editor) => editor.chain().focus().setTextAlign('center').run(),
        enabled: (editor) => editor.can().setTextAlign('center'),
        active: (editor) => editor.isActive(({textAlign: 'center'})),
        type: 'block',
    },
    JustifyRight: {
        action: (editor) => editor.chain().focus().setTextAlign('right').run(),
        enabled: (editor) => editor.can().setTextAlign('right'),
        active: (editor) => editor.isActive({textAlign: 'right'}),
        type: 'block',
    },
    JustifyBlock: {
        action: (editor) => editor.chain().focus().setTextAlign('justify').run(),
        enabled: (editor) => editor.can().setTextAlign('justify'),
        active: (editor) => editor.isActive({textAlign: 'justify'}),
        type: 'block',
    },
    HorizontalRule: {
        action: (editor) => editor.chain().focus().setHorizontalRule().run(),
        enabled: (editor) => editor.can().setHorizontalRule(),
        type: 'block',
    },
    NumberedList: {
        action: (editor) => editor.chain().focus().toggleOrderedList().run(),
        enabled: (editor) => editor.can().toggleOrderedList(),
        active: (editor) => editor.isActive('orderedList'),
        type: 'block',
    },
    BulletedList: {
        action: (editor) => editor.chain().focus().toggleBulletList().run(),
        enabled: (editor) => editor.can().toggleBulletList(),
        active: (editor) => editor.isActive('bulletList'),
        type: 'block',
    },
    Blockquote: {
        action: (editor) => editor.chain().focus().toggleBlockquote().run(),
        enabled: (editor) => editor.can().toggleBlockquote(),
        active: (editor) => editor.isActive('blockquote'),
        type: 'block',
    },
    Link: {
        action: (editor) => {
            if (editor.isActive('link')) {
                // If the user is currently editing a link, update the whole link
                editor.commands.extendMarkRange('link');
            }
            setTimeout(() => editor.commands.openCmsForm('Link'), 0);
        },
        formAction: (editor, data) => {
            if (data) {
                const link = {
                    href: data.get('href'),
                    'data-cms-href': data.get('href_select') || null,
                    'target': data.get('target') || null,
                };
                editor.chain().focus().setLink(link).run();
            }
        },
        enabled: (editor) => editor.can().setLink({href: '#'}),
        active: (editor) => editor.isActive('link'),
        attributes: (editor) => {
            let attrs = editor.getAttributes('link');
            attrs.href_select = attrs['data-cms-href'];  // Set the value of the hidden field "href_select"
            delete attrs['data-cms-href'];
            return attrs;
        },
        type: 'mark',
    },
    Unlink: {
        action: (editor) => editor.chain().focus().unsetLink().run(),
        enabled: (editor) => editor.can().unsetLink(),
        type: 'mark',
    },
    Table: {
        action: (editor, button) => {
            const rows = parseInt(button?.dataset?.rows ||3);
            const cols = parseInt(button?.dataset?.cols || 3);
            const classes = button?.dataset?.attr || getDefaultTableClass(editor.options.tableClasses);
            editor.chain().focus().insertTable({ rows: rows, cols: cols}).updateAttributes('table', { addClasses: classes }).run();
        },
        enabled: (editor) => editor.can().insertTable({ rows: 3, cols: 3 }),
        type: 'mark',
        items: generateTableMenu,
        class: 'tt-table',
    },
    toggleHeaderColumn: {
        action: (editor, button) => editor.chain().focus().toggleHeaderColumn().run(),
        enabled: (editor) => editor.can().toggleHeaderColumn(),
        active: (editor) => editor.isActive('headerColumn'),
        type: 'mark',
    },
    toggleHeaderRow: {
        action: (editor, button) => editor.chain().focus().toggleHeaderRow().run(),
        enabled: (editor) => editor.can().toggleHeaderRow(),
        active: (editor) => editor.isActive('headerRow'),
        type: 'mark',
    },
    addColumnBefore: {
        action: (editor, button) => editor.chain().focus().addColumnBefore().run(),
        enabled: (editor) => editor.can().addColumnBefore(),
        type: 'mark',
    },
    addColumnAfter: {
        action: (editor, button) => editor.chain().focus().addColumnAfter().run(),
        enabled: (editor) => editor.can().addColumnAfter(),
        type: 'mark',
    },
    deleteColumn: {
        action: (editor, button) => editor.chain().focus().deleteColumn().run(),
        enabled: (editor) => editor.can().deleteColumn(),
        type: 'mark',
    },
    addRowBefore: {
        action: (editor, button) => editor.chain().focus().addRowBefore().run(),
        enabled: (editor) => editor.can().addRowBefore(),
        type: 'mark',
    },
    addRowAfter: {
        action: (editor, button) => editor.chain().focus().addRowAfter().run(),
        enabled: (editor) => editor.can().addRowAfter(),
        type: 'mark',
    },
    deleteRow: {
        action: (editor, button) => editor.chain().focus().deleteRow().run(),
        enabled: (editor) => editor.can().deleteRow(),
        type: 'mark',
    },
    mergeOrSplit: {
        action: (editor, button) => editor.chain().focus().mergeOrSplit().run(),
        enabled: (editor) => editor.can().mergeOrSplit(),
        type: 'mark',
    },
    tableClass: {
        action: (editor, button) => {
            const classes = button?.dataset.attr || getDefaultTableClass(editor.options.tableClasses);
            editor.chain().focus().updateAttributes('table', { addClasses: classes }).run();
        },
        enabled: (editor, button) => editor.can().updateAttributes('table', { addClasses: 'enabled' }),
        active: (editor, button) => {
            const classes = editor.getAttributes('table').addClasses;
            return classes && classes === button.dataset.attr;
        },
        render: renderTableClassOptions,
    },
    Code: {
        action: (editor) => editor.chain().focus().toggleCode().run(),
        enabled: (editor) => editor.can().toggleCode(),
        active: (editor) => editor.isActive('code'),
        type: 'mark',
    },
    CodeBlock: {
        action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
        enabled: (editor) => editor.can().toggleCodeBlock(),
        active: (editor) => editor.isActive('codeBlock'),
        type: 'block',
    },
    HardBreak: {
        action: (editor) => editor.chain().focus().setHardBreak().run(),
        enabled: (editor) => editor.can().setHardBreak(),
    },
    Format: {
        insitu: ['Paragraph', 'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6', '|'],
        iconx: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type" viewBox="0 0 16 16">\n' +
            '  <path d="m2.244 13.081.943-2.803H6.66l.944 2.803H8.86L5.54 3.75H4.322L1 13.081zm2.7-7.923L6.34 9.314H3.51l1.4-4.156zm9.146 7.027h.035v.896h1.128V8.125c0-1.51-1.114-2.345-2.646-2.345-1.736 0-2.59.916-2.666 2.174h1.108c.068-.718.595-1.19 1.517-1.19.971 0 1.518.52 1.518 1.464v.731H12.19c-1.647.007-2.522.8-2.522 2.058 0 1.319.957 2.18 2.345 2.18 1.06 0 1.716-.43 2.078-1.011zm-1.763.035c-.752 0-1.456-.397-1.456-1.244 0-.65.424-1.115 1.408-1.115h1.805v.834c0 .896-.752 1.525-1.757 1.525"/>\n' +
            '</svg>',
        type: 'block',
    },
    Heading1: {
        action: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
        enabled: (editor) => editor.can().setHeading({ level: 1 }),
        active: (editor) => editor.isActive('heading', { level: 1 }),
        type: 'block',
    },
    Heading2: {
        action: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
        enabled: (editor) => editor.can().setHeading({ level: 2 }),
        active: (editor) => editor.isActive('heading', { level: 2 }),
        type: 'block',
    },
    Heading3: {
        action: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
        enabled: (editor) => editor.can().setHeading({ level: 3 }),
        active: (editor) => editor.isActive('heading', { level: 3 }),
        title: 'Heading 3',
        type: 'block',
    },
    Heading4: {
        action: (editor) => editor.chain().focus().setHeading({ level: 4 }).run(),
        enabled: (editor) => editor.can().setHeading({ level: 4 }),
        active: (editor) => editor.isActive('heading', { level: 4 }),
        title: 'Heading 4',
        type: 'block',
    },
    Heading5: {
        action: (editor) => editor.chain().focus().setHeading({ level: 5 }).run(),
        enabled: (editor) => editor.can().setHeading({ level: 5 }),
        active: (editor) => editor.isActive('heading', { level: 5 }),
        title: 'Heading 5',
        type: 'block',
    },
    Heading6: {
        action: (editor) => editor.chain().focus().setHeading({ level: 6 }).run(),
        enabled: (editor) => editor.can().setHeading({ level: 6 }),
        active: (editor) => editor.isActive('heading', { level: 6 }),
        title: 'Heading 6',
        type: 'block',
    },
    Paragraph: {
        action: (editor) => editor.chain().focus().setParagraph().run(),
        enabled: (editor) => editor.can().setParagraph(),
        active: (editor) => editor.isActive('paragraph'),
        title: 'Paragraph',
        type: 'block',
    },
    CMSPlugins: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-puzzle" viewBox="0 0 16 16">\n' +
            '  <path d="M3.112 3.645A1.5 1.5 0 0 1 4.605 2H7a.5.5 0 0 1 .5.5v.382c0 .696-.497 1.182-.872 1.469a.5.5 0 0 0-.115.118l-.012.025L6.5 4.5v.003l.003.01q.005.015.036.053a.9.9 0 0 0 .27.194C7.09 4.9 7.51 5 8 5c.492 0 .912-.1 1.19-.24a.9.9 0 0 0 .271-.194.2.2 0 0 0 .039-.063v-.009l-.012-.025a.5.5 0 0 0-.115-.118c-.375-.287-.872-.773-.872-1.469V2.5A.5.5 0 0 1 9 2h2.395a1.5 1.5 0 0 1 1.493 1.645L12.645 6.5h.237c.195 0 .42-.147.675-.48.21-.274.528-.52.943-.52.568 0 .947.447 1.154.862C15.877 6.807 16 7.387 16 8s-.123 1.193-.346 1.638c-.207.415-.586.862-1.154.862-.415 0-.733-.246-.943-.52-.255-.333-.48-.48-.675-.48h-.237l.243 2.855A1.5 1.5 0 0 1 11.395 14H9a.5.5 0 0 1-.5-.5v-.382c0-.696.497-1.182.872-1.469a.5.5 0 0 0 .115-.118l.012-.025.001-.006v-.003a.2.2 0 0 0-.039-.064.9.9 0 0 0-.27-.193C8.91 11.1 8.49 11 8 11s-.912.1-1.19.24a.9.9 0 0 0-.271.194.2.2 0 0 0-.039.063v.003l.001.006.012.025c.016.027.05.068.115.118.375.287.872.773.872 1.469v.382a.5.5 0 0 1-.5.5H4.605a1.5 1.5 0 0 1-1.493-1.645L3.356 9.5h-.238c-.195 0-.42.147-.675.48-.21.274-.528.52-.943.52-.568 0-.947-.447-1.154-.862C.123 9.193 0 8.613 0 8s.123-1.193.346-1.638C.553 5.947.932 5.5 1.5 5.5c.415 0 .733.246.943.52.255.333.48.48.675.48h.238zM4.605 3a.5.5 0 0 0-.498.55l.001.007.29 3.4A.5.5 0 0 1 3.9 7.5h-.782c-.696 0-1.182-.497-1.469-.872a.5.5 0 0 0-.118-.115l-.025-.012L1.5 6.5h-.003a.2.2 0 0 0-.064.039.9.9 0 0 0-.193.27C1.1 7.09 1 7.51 1 8s.1.912.24 1.19c.07.14.14.225.194.271a.2.2 0 0 0 .063.039H1.5l.006-.001.025-.012a.5.5 0 0 0 .118-.115c.287-.375.773-.872 1.469-.872H3.9a.5.5 0 0 1 .498.542l-.29 3.408a.5.5 0 0 0 .497.55h1.878c-.048-.166-.195-.352-.463-.557-.274-.21-.52-.528-.52-.943 0-.568.447-.947.862-1.154C6.807 10.123 7.387 10 8 10s1.193.123 1.638.346c.415.207.862.586.862 1.154 0 .415-.246.733-.52.943-.268.205-.415.39-.463.557h1.878a.5.5 0 0 0 .498-.55l-.001-.007-.29-3.4A.5.5 0 0 1 12.1 8.5h.782c.696 0 1.182.497 1.469.872.05.065.091.099.118.115l.025.012.006.001h.003a.2.2 0 0 0 .064-.039.9.9 0 0 0 .193-.27c.14-.28.24-.7.24-1.191s-.1-.912-.24-1.19a.9.9 0 0 0-.194-.271.2.2 0 0 0-.063-.039H14.5l-.006.001-.025.012a.5.5 0 0 0-.118.115c-.287.375-.773.872-1.469.872H12.1a.5.5 0 0 1-.498-.543l.29-3.407a.5.5 0 0 0-.497-.55H9.517c.048.166.195.352.463.557.274.21.52.528.52.943 0 .568-.447.947-.862 1.154C9.193 5.877 8.613 6 8 6s-1.193-.123-1.638-.346C5.947 5.447 5.5 5.068 5.5 4.5c0-.415.246-.733.52-.943.268-.205.415-.39.463-.557z"/>\n' +
            '</svg>',
        action: (editor, button) => editor.chain().focus().addCmsPlugin(button.dataset.cmsplugin).run(),
        enabled: (editor, button) => editor.can().addCmsPlugin(button.dataset.cmsplugin, true),
        active: (editor, button) => editor.isActive('cmsPlugin', {type: button.dataset.cmsplugin}),
        type: 'mark',
    }
};

export default TiptapToolbar;

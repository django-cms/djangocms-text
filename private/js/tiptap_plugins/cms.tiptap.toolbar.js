/* eslint-env es6 */
/* jshint esversion: 6 */
/* global document, window, console */

'use strict';


function generateButtonArray(rows, cols) {
    let buttons = '<div class="tt-create-table">';
    for (let j= 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            buttons += `<button title="${i+1}x${j+1}" data-action="Table" style="--mx: ${i*12}px; --my: ${j*12+4}px;" data-rows="${j+1}" data-cols="${i+1}"></button>`;
        }
    }
    buttons += '</div>';
    return buttons;
}

const _tableMenu = [
    'addColumnBefore',
    'addColumnAfter',
    'deleteColumn',
    '|',
    'addRowBefore',
    'addRowAfter',
    'deleteRow',
    '|',
    'toggleHeaderColumn',
    'toggleHeaderRow',
    'mergeOrSplit',
];

function generateTableMenu(editor, builder) {
    return generateButtonArray(10, 10) + builder(_tableMenu);
}


const TiptapToolbar = {
    Undo: {
        action: (editor) => editor.commands.undo(),
        enabled: (editor) => editor.can().undo(),
        type: 'mark',
    },
    Redo:{
        action: (editor) => editor.commands.redo(),
        enabled: (editor) => editor.can().redo(),
        type: 'mark',
    },
    Bold: {
        action: (editor) => editor.commands.toggleBold(),
        enabled: (editor) => editor.can().toggleBold(),
        active: (editor) => editor.isActive('bold'),
        type: 'mark',
    },
    Italic: {
        action: (editor) => editor.commands.toggleItalic(),
        enabled: (editor) => editor.can().toggleItalic(),
        active: (editor) => editor.isActive('italic'),
        title: 'Italic',
        type: 'mark',
    },
    Underline: {
        action: (editor) => editor.commands.toggleUnderline(),
        enabled: (editor) => editor.can().toggleUnderline(),
        active: (editor) => editor.isActive('underline'),
        title: 'Underline',
        type: 'mark',
    },
    Strike: {
        action: (editor) => editor.commands.toggleStrike(),
        enabled: (editor) => editor.can().toggleStrike(),
        active: (editor) => editor.isActive('strike'),
        type: 'mark',
    },
    Subscript: {
        action: (editor) => editor.commands.toggleSubscript(),
        enabled: (editor) => editor.can().toggleSubscript(),
        active: (editor) => editor.isActive('subscript'),
        type: 'mark',
    },
    Superscript: {
        action: (editor) => editor.commands.toggleSuperscript(),
        enabled: (editor) => editor.can().toggleSuperscript(),
        active: (editor) => editor.isActive('superscript'),
        type: 'mark',
    },
    RemoveFormat: {
        action: (editor) => editor.commands.unsetAllMarks(),
        enabled: (editor) => editor.can().unsetAllMarks(),
        type: 'mark',
    },
    JustifyLeft: {
        action: (editor) => editor.commands.setTextAlign('left'),
        enabled: (editor) => editor.can().setTextAlign('left'),
        active: (editor) => editor.isActive({textAlign: 'left'}),
        type: 'block',
    },
    JustifyCenter: {
        action: (editor) => editor.commands.setTextAlign('center'),
        enabled: (editor) => editor.can().setTextAlign('center'),
        active: (editor) => editor.isActive(({textAlign: 'center'})),
        type: 'block',
    },
    JustifyRight: {
        action: (editor) => editor.commands.setTextAlign('right'),
        enabled: (editor) => editor.can().setTextAlign('right'),
        active: (editor) => editor.isActive({textAlign: 'right'}),
        type: 'block',
    },
    JustifyBlock: {
        action: (editor) => editor.commands.setTextAlign('justify'),
        enabled: (editor) => editor.can().setTextAlign('justify'),
        active: (editor) => editor.isActive({textAlign: 'justify'}),
        type: 'block',
    },
    HorizontalRule: {
        action: (editor) => editor.commands.setHorizontalRule(),
        enabled: (editor) => editor.can().setHorizontalRule(),
        type: 'block',
    },
    NumberedList: {
        action: (editor) => editor.commands.toggleOrderedList(),
        enabled: (editor) => editor.can().toggleOrderedList(),
        active: (editor) => editor.isActive('orderedList'),
        type: 'block',
    },
    BulletedList: {
        action: (editor) => editor.commands.toggleBulletList(),
        enabled: (editor) => editor.can().toggleBulletList(),
        active: (editor) => editor.isActive('bulletList'),
        type: 'block',
    },
/*
    Outdent: {
        action: (editor) => editor.commands.outdent().run(),
        enabled: (editor) => editor.can().outdent(),
        type: 'block',
    },
    Indent: {
        action: (editor) => editor.commands.indent().run(),
        enabled: (editor) => editor.can().indent(),
        type: 'block',
    },
*/
    Blockquote: {
        action: (editor) => editor.commands.toggleBlockquote(),
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
                editor.commands.setLink(link);
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
        action: (editor) => editor.commands.unsetLink(),
        enabled: (editor) => editor.can().unsetLink(),
        type: 'mark',
    },
    Table: {
        action: (editor, button) => {
            const rows = parseInt(button?.dataset?.rows ||3);
            const cols = parseInt(button?.dataset?.cols || 3);
            editor.commands.insertTable({ rows: rows, cols: cols });
        },
        enabled: (editor) => editor.can().insertTable({ rows: 3, cols: 3 }),
        type: 'mark',
        items: generateTableMenu,
        class: 'tt-table',
    },
    toggleHeaderColumn: {
        action: (editor, button) => editor.commands.toggleHeaderColumn(),
        enabled: (editor) => editor.can().toggleHeaderColumn(),
        active: (editor) => editor.isActive('headerColumn'),
        type: 'mark',
    },
    toggleHeaderRow: {
        action: (editor, button) => editor.commands.toggleHeaderRow(),
        enabled: (editor) => editor.can().toggleHeaderRow(),
        active: (editor) => editor.isActive('headerRow'),
        type: 'mark',
    },
    addColumnBefore: {
        action: (editor, button) => editor.commands.addColumnBefore(),
        enabled: (editor) => editor.can().addColumnBefore(),
        type: 'mark',
    },
    addColumnAfter: {
        action: (editor, button) => editor.commands.addColumnAfter(),
        enabled: (editor) => editor.can().addColumnAfter(),
        type: 'mark',
    },
    deleteColumn: {
        action: (editor, button) => editor.commands.deleteColumn(),
        enabled: (editor) => editor.can().deleteColumn(),
        type: 'mark',
    },
    addRowBefore: {
        action: (editor, button) => editor.commands.addRowBefore(),
        enabled: (editor) => editor.can().addRowBefore(),
        type: 'mark',
    },
    addRowAfter: {
        action: (editor, button) => editor.commands.addRowAfter(),
        enabled: (editor) => editor.can().addRowAfter(),
        type: 'mark',
    },
    deleteRow: {
        action: (editor, button) => editor.commands.deleteRow(),
        enabled: (editor) => editor.can().deleteRow(),
        type: 'mark',
    },
    mergeOrSplit: {
        action: (editor, button) => editor.commands.mergeOrSplit(),
        enabled: (editor) => editor.can().mergeOrSplit(),
        type: 'mark',
    },
    Code: {
        action: (editor) => editor.commands.toggleCode(),
        enabled: (editor) => editor.can().toggleCode(),
        active: (editor) => editor.isActive('code'),
        type: 'mark',
    },
    Small: {
        action: (editor) => editor.commands.toggleSmall(),
        enabled: (editor) => editor.can().toggleSmall(),
        active: (editor) => editor.isActive('Small'),
        type: 'mark',
    },
    Kbd: {
        action: (editor) => editor.commands.toggleKbd(),
        enabled: (editor) => editor.can().toggleKbd(),
        active: (editor) => editor.isActive('Kbd'),
        type: 'mark',
    },
    CodeBlock: {
        action: (editor) => editor.commands.toggleCodeBlock(),
        enabled: (editor) => editor.can().toggleCodeBlock(),
        active: (editor) => editor.isActive('codeBlock'),
        type: 'block',
    },

    // Alert: {
    //     action: (editor) => editor.commands.toggleExtension({type: 'alert'}),
    //     enabled: (editor) => editor.can().toggleExtension({type: 'alert'}),
    //     type: 'block',
    // },
    // Badge: {
    //     action: (editor) => editor.commands.toggleExtension({type: 'badge'}),
    //     enabled: (editor) => editor.can().toggleExtension({type: 'badge'}),
    //     type: 'inline',
    // },
    HardBreak: {
        action: (editor) => editor.commands.setHardBreak(),
        enabled: (editor) => editor.can().setHardBreak(),
    },
    Format: {
        insitu: ['Paragraph', 'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6', '|'],
        type: 'block'
    },
    Heading1: {
        action: (editor) => editor.commands.setHeading({ level: 1 }),
        enabled: (editor) => editor.can().setHeading({ level: 1 }),
        active: (editor) => editor.isActive('heading', {level: 1}),
        type: 'block',
    },
    Heading2: {
        action: (editor) => editor.commands.setHeading({ level: 2 }),
        enabled: (editor) => editor.can().setHeading({ level: 2 }),
        active: (editor) => editor.isActive('heading', { level: 2 }),
        type: 'block',
    },
    Heading3: {
        action: (editor) => editor.commands.setHeading({ level: 3 }),
        enabled: (editor) => editor.can().setHeading({ level: 3 }),
        active: (editor) => editor.isActive('heading', { level: 3 }),
        title: 'Heading 3',
        type: 'block',
    },
    Heading4: {
        action: (editor) => editor.commands.setHeading({ level: 4 }),
        enabled: (editor) => editor.can().setHeading({ level: 4 }),
        active: (editor) => editor.isActive('heading', { level: 4 }),
        title: 'Heading 4',
        type: 'block',
    },
    Heading5: {
        action: (editor) => editor.commands.setHeading({ level: 5 }),
        enabled: (editor) => editor.can().setHeading({ level: 5 }),
        active: (editor) => editor.isActive('heading', { level: 5 }),
        title: 'Heading 5',
        type: 'block',
    },
    Heading6: {
        action: (editor) => editor.commands.setHeading({ level: 6 }),
        enabled: (editor) => editor.can().setHeading({ level: 6 }),
        active: (editor) => editor.isActive('heading', { level: 6 }),
        title: 'Heading 6',
        type: 'block',
    },
    Paragraph: {
        action: (editor) => editor.commands.setParagraph(),
        enabled: (editor) => editor.can().setParagraph(),
        active: (editor) => editor.isActive('paragraph'),
        title: 'Paragraph',
        type: 'block',
    },
    CMSPlugins: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-puzzle" viewBox="0 0 16 16">\n' +
            '  <path d="M3.112 3.645A1.5 1.5 0 0 1 4.605 2H7a.5.5 0 0 1 .5.5v.382c0 .696-.497 1.182-.872 1.469a.5.5 0 0 0-.115.118l-.012.025L6.5 4.5v.003l.003.01q.005.015.036.053a.9.9 0 0 0 .27.194C7.09 4.9 7.51 5 8 5c.492 0 .912-.1 1.19-.24a.9.9 0 0 0 .271-.194.2.2 0 0 0 .039-.063v-.009l-.012-.025a.5.5 0 0 0-.115-.118c-.375-.287-.872-.773-.872-1.469V2.5A.5.5 0 0 1 9 2h2.395a1.5 1.5 0 0 1 1.493 1.645L12.645 6.5h.237c.195 0 .42-.147.675-.48.21-.274.528-.52.943-.52.568 0 .947.447 1.154.862C15.877 6.807 16 7.387 16 8s-.123 1.193-.346 1.638c-.207.415-.586.862-1.154.862-.415 0-.733-.246-.943-.52-.255-.333-.48-.48-.675-.48h-.237l.243 2.855A1.5 1.5 0 0 1 11.395 14H9a.5.5 0 0 1-.5-.5v-.382c0-.696.497-1.182.872-1.469a.5.5 0 0 0 .115-.118l.012-.025.001-.006v-.003a.2.2 0 0 0-.039-.064.9.9 0 0 0-.27-.193C8.91 11.1 8.49 11 8 11s-.912.1-1.19.24a.9.9 0 0 0-.271.194.2.2 0 0 0-.039.063v.003l.001.006.012.025c.016.027.05.068.115.118.375.287.872.773.872 1.469v.382a.5.5 0 0 1-.5.5H4.605a1.5 1.5 0 0 1-1.493-1.645L3.356 9.5h-.238c-.195 0-.42.147-.675.48-.21.274-.528.52-.943.52-.568 0-.947-.447-1.154-.862C.123 9.193 0 8.613 0 8s.123-1.193.346-1.638C.553 5.947.932 5.5 1.5 5.5c.415 0 .733.246.943.52.255.333.48.48.675.48h.238zM4.605 3a.5.5 0 0 0-.498.55l.001.007.29 3.4A.5.5 0 0 1 3.9 7.5h-.782c-.696 0-1.182-.497-1.469-.872a.5.5 0 0 0-.118-.115l-.025-.012L1.5 6.5h-.003a.2.2 0 0 0-.064.039.9.9 0 0 0-.193.27C1.1 7.09 1 7.51 1 8s.1.912.24 1.19c.07.14.14.225.194.271a.2.2 0 0 0 .063.039H1.5l.006-.001.025-.012a.5.5 0 0 0 .118-.115c.287-.375.773-.872 1.469-.872H3.9a.5.5 0 0 1 .498.542l-.29 3.408a.5.5 0 0 0 .497.55h1.878c-.048-.166-.195-.352-.463-.557-.274-.21-.52-.528-.52-.943 0-.568.447-.947.862-1.154C6.807 10.123 7.387 10 8 10s1.193.123 1.638.346c.415.207.862.586.862 1.154 0 .415-.246.733-.52.943-.268.205-.415.39-.463.557h1.878a.5.5 0 0 0 .498-.55l-.001-.007-.29-3.4A.5.5 0 0 1 12.1 8.5h.782c.696 0 1.182.497 1.469.872.05.065.091.099.118.115l.025.012.006.001h.003a.2.2 0 0 0 .064-.039.9.9 0 0 0 .193-.27c.14-.28.24-.7.24-1.191s-.1-.912-.24-1.19a.9.9 0 0 0-.194-.271.2.2 0 0 0-.063-.039H14.5l-.006.001-.025.012a.5.5 0 0 0-.118.115c-.287.375-.773.872-1.469.872H12.1a.5.5 0 0 1-.498-.543l.29-3.407a.5.5 0 0 0-.497-.55H9.517c.048.166.195.352.463.557.274.21.52.528.52.943 0 .568-.447.947-.862 1.154C9.193 5.877 8.613 6 8 6s-1.193-.123-1.638-.346C5.947 5.447 5.5 5.068 5.5 4.5c0-.415.246-.733.52-.943.268-.205.415-.39.463-.557z"/>\n' +
            '</svg>',
        action: (editor, button) => editor.commands.addCmsPlugin(button.dataset.cmsplugin),
        enabled: (editor, button) => editor.can().addCmsPlugin(button.dataset.cmsplugin, true),
        active: (editor, button) => editor.isActive('cmsPlugin', {type: button.dataset.cmsplugin}),
        type: 'mark',
    }
};

['primary', 'secondary', 'success', 'danger', 'warning', 'light', 'info', 'dark', 'muted'].forEach((style) => {
    TiptapToolbar[style] = {
        action: (editor) => editor.commands.setStyle(style),
        enabled: (editor) => editor.can().toggleStyle(style),
        title: `<span class="text-${style}">${style.charAt(0).toUpperCase() + style.slice(1)}</span>`,
        type: 'mark',
    };
});

export default TiptapToolbar;

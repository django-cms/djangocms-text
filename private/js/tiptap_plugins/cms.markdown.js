/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */
'use strict';

import {Extension} from "@tiptap/core";
import {Plugin} from "@tiptap/pm/state";
import showdown from "showdown";

// Check for typical Markdown elements
const markdownPatterns = [
    /^#{1,6}\s/m,           // Headings: #, ##, ...
    /\*\*.*\*\*/m,          // Bold: **text**
    /\*.*\*/m,              // Italic: *text*
    /\[.*\]\(.*\)/m,        // Links: [text](url)
    /^>\s/m,                // Blockquote: >
    /^-\s/m,                // Lists: - item
    /^(\d+\.)\s/m,          // Numbered lists: 1. item
    /`[^`]+`/m,             // Inline-Code: `code`
    /^```/m                 // Code blocks: ```
];

const markdownAntiPatterns = [
    /on(begin|end|repeat|abort|error|resize|scroll|unload|copy|cut|paste|cancel|canplay|canplaythrough|change|click|close|cuechange|dblclick|drag|dragend|dragenter|dragleave|dragover|dragstart|drop|durationchange|emptied|ended|focus|input|invalid|keydown|keypress|keyup|load|loadeddata|loadedmetadata|loadstart|mousedown|mouseenter|mouseleave|mousemove|mouseout|mouseover|mouseup|mousewheel|pause|play|playing|progress|ratechange|reset|resize|scroll|seeked|seeking|select|show|stalled|submit|suspend|timeupdate|toggle|volumechange|waiting|activate|focusin|focusout)\s*=/i,
    /base64,/i,
    /<\s*script/i,
    /['"(]\s*javascript\s*:/i,
];

function isProbablyMarkdown(text) {
    return text && markdownPatterns.some(pattern => pattern.test(text)) &&
           !markdownAntiPatterns.some(pattern => pattern.test(text));
}

const markdownPasteHandler = Extension.create({
    name: 'markdownPasteHandler',

    addProseMirrorPlugins() {
        const {editor} = this;

        return [
            new Plugin({
                props: {
                    handlePaste(view, event, slice) {
                        // Your custom paste logic here
                        // Example: get plain text from clipboard
                        const text = event.clipboardData?.getData('text/plain');
                        if (isProbablyMarkdown(text)) {
                            const converter = new showdown.Converter(window.cms_editor_plugin?.markdownOptions || {
                                tables: true,
                                strikethrough: true,
                                tasklists: true
                            });
                            const html = converter.makeHtml(text);
                            editor.commands.insertContent(html);
                            return true;
                        }
                        return false;
                    }
                }
            })
        ];
    }
});

export default markdownPasteHandler;

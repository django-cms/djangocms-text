/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */
'use strict';

import {Extension} from "@tiptap/core";
import {Plugin} from "@tiptap/pm/state";
import showdown from "showdown";

// Weighted markdown patterns: each has a score reflecting how strong a signal it is.
// A higher threshold reduces false positives from plain text that happens to contain
// a single markdown-like pattern.
const markdownPatterns = [
    { pattern: /^#{1,6}\s.+/m,              score: 2 },  // Headings
    { pattern: /\*\*[^\s*].*?[^\s*]\*\*/m,  score: 2 },  // Bold: **text** (non-greedy, no spaces at edges)
    { pattern: /(?<!\*)\*[^\s*].*?[^\s*]\*(?!\*)/m, score: 1 }, // Italic: *text* (not bold)
    { pattern: /\[[^\]]+\]\(https?:\/\/[^)]+\)/m, score: 3 },  // Links with URL
    { pattern: /^>\s.+/m,                   score: 1 },  // Blockquote
    { pattern: /^[-*+]\s.+/m,               score: 1 },  // Unordered list
    { pattern: /^\d+\.\s.+/m,               score: 1 },  // Ordered list
    { pattern: /`[^`\n]+`/m,                score: 1 },  // Inline code
    { pattern: /^```/m,                      score: 3 },  // Code block
    { pattern: /^---\s*$/m,                  score: 2 },  // Horizontal rule
    { pattern: /!\[[^\]]*\]\([^)]+\)/m,      score: 3 },  // Images
];

const MARKDOWN_THRESHOLD = 3; // Minimum score to treat as markdown

const markdownAntiPatterns = [
    /on(begin|end|repeat|abort|error|resize|scroll|unload|copy|cut|paste|cancel|canplay|canplaythrough|change|click|close|cuechange|dblclick|drag|dragend|dragenter|dragleave|dragover|dragstart|drop|durationchange|emptied|ended|focus|input|invalid|keydown|keypress|keyup|load|loadeddata|loadedmetadata|loadstart|mousedown|mouseenter|mouseleave|mousemove|mouseout|mouseover|mouseup|mousewheel|pause|play|playing|progress|ratechange|reset|resize|scroll|seeked|seeking|select|show|stalled|submit|suspend|timeupdate|toggle|volumechange|waiting|activate|focusin|focusout)\s*=/i,
    /base64,/i,
    /['"(]\s*javascript\s*:/i,
    /<\w+[\s>]/,  // Contains HTML tags
];

export function isProbablyMarkdown(text) {
    if (!text || markdownAntiPatterns.some(p => p.test(text))) {
        return false;
    }
    const score = markdownPatterns.reduce(
        (sum, {pattern, score: pts}) => sum + (pattern.test(text) ? pts : 0), 0
    );
    return score >= MARKDOWN_THRESHOLD;
}

const markdownPasteHandler = Extension.create({
    name: 'markdownPasteHandler',

    addProseMirrorPlugins() {
        const {editor} = this;

        return [
            new Plugin({
                props: {
                    handlePaste(view, event, slice) {
                        // Skip if clipboard already has HTML (rich paste from browser/app)
                        const html = event.clipboardData?.getData('text/html');
                        if (html) {
                            return false;
                        }
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

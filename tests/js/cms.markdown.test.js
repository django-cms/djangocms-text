/* eslint-env es11 */
/* jshint esversion: 11 */

import {isProbablyMarkdown} from '../../private/js/tiptap_plugins/cms.markdown';


describe('isProbablyMarkdown', () => {
    describe('should detect markdown', () => {
        it('README-style document with heading, list, and code', () => {
            expect(isProbablyMarkdown(
                '# Installation\n\nRun the following:\n\n```\npip install djangocms-text\n```'
            )).toBe(true);
        });

        it('document with heading and bold text', () => {
            expect(isProbablyMarkdown(
                '## Getting Started\n\nThis is **important** information.'
            )).toBe(true);
        });

        it('document with link and heading', () => {
            expect(isProbablyMarkdown(
                '# Resources\n\nCheck [the docs](https://docs.example.com) for details.'
            )).toBe(true);
        });

        it('markdown link alone (strong signal)', () => {
            expect(isProbablyMarkdown(
                'See [Django CMS](https://www.django-cms.org) for more info.'
            )).toBe(true);
        });

        it('code block alone (strong signal)', () => {
            expect(isProbablyMarkdown(
                '```python\ndef hello():\n    print("world")\n```'
            )).toBe(true);
        });

        it('image syntax', () => {
            expect(isProbablyMarkdown(
                '![Screenshot](https://example.com/screenshot.png)'
            )).toBe(true);
        });

        it('heading with horizontal rule', () => {
            expect(isProbablyMarkdown(
                '# Chapter 1\n\nSome text here.\n\n---\n\n# Chapter 2'
            )).toBe(true);
        });

        it('mixed formatting: bold, italic, inline code', () => {
            expect(isProbablyMarkdown(
                'Use **bold** and *italic* and `code` for formatting.'
            )).toBe(true);
        });

        it('bullet list with multiple items and bold', () => {
            expect(isProbablyMarkdown(
                '- First **item**\n- Second item\n- Third item'
            )).toBe(true);
        });

        it('numbered list with heading', () => {
            expect(isProbablyMarkdown(
                '## Steps\n\n1. Clone the repo\n2. Run install\n3. Start the server'
            )).toBe(true);
        });

        it('blockquote with bold text', () => {
            expect(isProbablyMarkdown(
                '> **Note:** This is an important warning.\n> Please read carefully.'
            )).toBe(true);
        });
    });

    describe('should reject plain text (false positives)', () => {
        it('simple sentence', () => {
            expect(isProbablyMarkdown(
                'This is just a normal sentence without any formatting.'
            )).toBe(false);
        });

        it('sentence with asterisks in multiplication', () => {
            expect(isProbablyMarkdown(
                'The result is 3 * 4 * 5 = 60.'
            )).toBe(false);
        });

        it('sentence with a dash that looks like a list', () => {
            expect(isProbablyMarkdown(
                '- but I disagree with that assessment.'
            )).toBe(false);
        });

        it('numbered sentence', () => {
            expect(isProbablyMarkdown(
                '1. FC Bayern won the match yesterday.'
            )).toBe(false);
        });

        it('email-style quoted reply', () => {
            expect(isProbablyMarkdown(
                '> Thanks for the update.\n> I will review it tomorrow.'
            )).toBe(false);
        });

        it('CSS code snippet', () => {
            expect(isProbablyMarkdown(
                '.container { margin: 0 auto; }\n* { box-sizing: border-box; }'
            )).toBe(false);
        });

        it('shell command with hash comment', () => {
            expect(isProbablyMarkdown(
                '#!/bin/bash\necho "hello world"'
            )).toBe(false);
        });

        it('plain URL without markdown link syntax', () => {
            expect(isProbablyMarkdown(
                'Visit https://www.example.com for more details.'
            )).toBe(false);
        });

        it('text with backticks in a casual context', () => {
            expect(isProbablyMarkdown(
                'He said `hello` and left.'
            )).toBe(false);
        });

        it('YAML-like content', () => {
            expect(isProbablyMarkdown(
                'name: my-project\nversion: 1.0\ndependencies:\n  - django\n  - celery'
            )).toBe(false);
        });

        it('Python f-string with asterisks', () => {
            expect(isProbablyMarkdown(
                'result = f"The answer is {a * b}"'
            )).toBe(false);
        });

        it('multiple paragraphs of plain text', () => {
            expect(isProbablyMarkdown(
                'The quick brown fox jumps over the lazy dog.\n\nPack my box with five dozen liquor jugs.\n\nHow vexingly quick daft zebras jump.'
            )).toBe(false);
        });
    });

    describe('should reject dangerous content (anti-patterns)', () => {
        it('HTML with event handler', () => {
            expect(isProbablyMarkdown(
                '# Title\n\n<div onclick="alert(1)">**click me**</div>'
            )).toBe(false);
        });

        it('base64 encoded content', () => {
            expect(isProbablyMarkdown(
                '# Image\n\n![img](data:image/png;base64,iVBORw0KGgo=)'
            )).toBe(false);
        });

        it('javascript: URL', () => {
            expect(isProbablyMarkdown(
                '[click me](javascript:alert(1))'
            )).toBe(false);
        });

        it('HTML tags in text', () => {
            expect(isProbablyMarkdown(
                '<p>This is **bold** in HTML</p>'
            )).toBe(false);
        });

        it('script tag', () => {
            expect(isProbablyMarkdown(
                '# Title\n\n<script>alert("xss")</script>'
            )).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('empty string', () => {
            expect(isProbablyMarkdown('')).toBe(false);
        });

        it('null', () => {
            expect(isProbablyMarkdown(null)).toBe(false);
        });

        it('undefined', () => {
            expect(isProbablyMarkdown(undefined)).toBe(false);
        });

        it('whitespace only', () => {
            expect(isProbablyMarkdown('   \n\n  ')).toBe(false);
        });

        it('single heading without other content', () => {
            // score 2, below threshold of 3
            expect(isProbablyMarkdown('# Just a heading')).toBe(false);
        });

        it('single bold word without other signals', () => {
            // score 2, below threshold
            expect(isProbablyMarkdown('This is **bold**.')).toBe(false);
        });
    });
});

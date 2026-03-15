/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window, document */

import CMSEditor from '../../private/js/cms.editor';
import CMSTipTapPlugin from '../../private/js/cms.tiptap';


describe('Tiptap style extensions', () => {
    let plugin;

    beforeEach(() => {
        document.body.innerHTML = `
            <script id="cms-editor-cfg" type="application/json">{"some": "config"}</script>
        `;
        window.dispatchEvent(new Event('DOMContentLoaded'));
        plugin = window.cms_editor_plugin;
    });

    afterEach(() => {
        for (const id of Object.keys(plugin._editors)) {
            plugin.destroyEditor(document.getElementById(id));
        }
    });

    function createEditorWithContent(id, content, settingsOptions = {}) {
        const el = document.createElement('textarea');
        el.id = id;
        el.classList.add('CMS_Editor');
        document.body.appendChild(el);

        const settings = { options: settingsOptions };
        plugin.create(el, false, content, settings, () => {});
        return plugin._editors[id];
    }

    describe('InlineStyle extension', () => {
        it('strips unconfigured inline styles from content', () => {
            const content = '<p>Normal <small>small text</small> and <kbd>keyboard</kbd> and <var>variable</var></p>';
            const editor = createEditorWithContent('test-inline-1', content, {
                toolbar: [['Bold', 'InlineStyles']],
                inlineStyles: [
                    { name: 'Small', element: 'small' },
                ],
            });

            const html = editor.getHTML();
            // <small> is configured and should be preserved
            expect(html).toContain('<small>');
            // <kbd> and <var> are NOT configured and should be stripped
            expect(html).not.toContain('<kbd>');
            expect(html).not.toContain('<var>');
            // The text content should still be present
            expect(html).toContain('small text');
            expect(html).toContain('keyboard');
            expect(html).toContain('variable');
        });

        it('strips inline styles when none are configured and InlineStyles not in toolbar', () => {
            const content = '<p>Normal <kbd>keyboard</kbd> and <var>variable</var></p>';
            const editor = createEditorWithContent('test-inline-2', content, {
                toolbar: [['Bold']],
                // InlineStyles not in toolbar, so inlinestyle extension is removed
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<kbd>');
            expect(html).not.toContain('<var>');
            expect(html).toContain('keyboard');
            expect(html).toContain('variable');
        });

        it('preserves multiple configured inline styles', () => {
            const content = '<p><small>small</small> <kbd>kbd</kbd> <var>var</var> <samp>samp</samp></p>';
            const editor = createEditorWithContent('test-inline-3', content, {
                toolbar: [['Bold', 'InlineStyles']],
                inlineStyles: [
                    { name: 'Small', element: 'small' },
                    { name: 'Kbd', element: 'kbd' },
                ],
            });

            const html = editor.getHTML();
            expect(html).toContain('<small>');
            expect(html).toContain('<kbd>');
            expect(html).not.toContain('<var>');
            expect(html).not.toContain('<samp>');
        });

        it('handles inline styles with class attributes', () => {
            const content = '<p>Normal <span class="lead">lead text</span> and <span class="other">other text</span></p>';
            const editor = createEditorWithContent('test-inline-4', content, {
                toolbar: [['Bold', 'InlineStyles']],
                inlineStyles: [
                    { name: 'Lead', element: 'span', attributes: { class: 'lead' } },
                ],
            });

            const html = editor.getHTML();
            expect(html).toContain('lead');
            // The configured style should be preserved
            expect(html).toContain('lead text');
            // The unconfigured class should be stripped
            expect(html).not.toMatch(/class="other"/);
        });
    });

    describe('BlockStyle extension', () => {
        it('strips unconfigured block styles from content', () => {
            const content = '<div class="container"><p>inside container</p></div><div class="wrapper"><p>inside wrapper</p></div><p>normal</p>';
            const editor = createEditorWithContent('test-block-1', content, {
                toolbar: [['Bold', 'BlockStyles']],
                blockStyles: [
                    { name: 'Container', element: 'div', attributes: { class: 'container' } },
                ],
            });

            const html = editor.getHTML();
            // Configured block style should be preserved
            expect(html).toContain('container');
            expect(html).toContain('inside container');
            // Unconfigured block style class should be stripped
            expect(html).not.toMatch(/class="wrapper"/);
            expect(html).toContain('inside wrapper');
            expect(html).toContain('normal');
        });

        it('strips all block styles when none are configured', () => {
            const content = '<div class="special"><p>wrapped</p></div><p>normal</p>';
            const editor = createEditorWithContent('test-block-2', content, {
                toolbar: [['Bold', 'BlockStyles']],
                // blockStyles not set — defaults to empty
            });

            const html = editor.getHTML();
            expect(html).not.toMatch(/class="special"/);
            expect(html).toContain('wrapped');
            expect(html).toContain('normal');
        });
    });

    describe('TextColor extension', () => {
        it('preserves configured text color classes', () => {
            const content = '<p><span class="text-primary">primary</span> and <span class="text-danger">danger</span></p>';
            const editor = createEditorWithContent('test-color-1', content, {
                toolbar: [['Bold', 'TextColor']],
                textColors: {
                    'text-primary': { name: 'Primary' },
                    'text-danger': { name: 'Danger' },
                },
            });

            const html = editor.getHTML();
            expect(html).toContain('text-primary');
            expect(html).toContain('text-danger');
            expect(html).toContain('primary');
            expect(html).toContain('danger');
        });

        it('strips unconfigured text color classes', () => {
            const content = '<p><span class="text-primary">primary</span> and <span class="text-custom">custom</span></p>';
            const editor = createEditorWithContent('test-color-2', content, {
                toolbar: [['Bold', 'TextColor']],
                textColors: {
                    'text-primary': { name: 'Primary' },
                },
            });

            const html = editor.getHTML();
            expect(html).toContain('text-primary');
            expect(html).toContain('primary');
            // Unconfigured color class should be stripped
            expect(html).not.toContain('text-custom');
            expect(html).toContain('custom');
        });
    });

    describe('Extension filtering by toolbar', () => {
        it('strips bold when Bold is not in toolbar', () => {
            const content = '<p>Normal and <strong>bold</strong> text</p>';
            const editor = createEditorWithContent('test-filter-1', content, {
                toolbar: [['Italic', 'Underline']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<strong>');
            expect(html).toContain('bold');
        });

        it('strips italic when Italic is not in toolbar', () => {
            const content = '<p>Normal and <em>italic</em> text</p>';
            const editor = createEditorWithContent('test-filter-2', content, {
                toolbar: [['Bold', 'Underline']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<em>');
            expect(html).toContain('italic');
        });

        it('preserves bold and italic when in toolbar', () => {
            const content = '<p><strong>bold</strong> and <em>italic</em></p>';
            const editor = createEditorWithContent('test-filter-3', content, {
                toolbar: [['Bold', 'Italic']],
            });

            const html = editor.getHTML();
            expect(html).toContain('<strong>');
            expect(html).toContain('<em>');
        });

        it('strips underline when not in toolbar', () => {
            const content = '<p>Normal and <u>underlined</u> text</p>';
            const editor = createEditorWithContent('test-filter-4', content, {
                toolbar: [['Bold', 'Italic']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<u>');
            expect(html).toContain('underlined');
        });

        it('strips strikethrough when Strike not in toolbar', () => {
            const content = '<p>Normal and <s>struck</s> text</p>';
            const editor = createEditorWithContent('test-filter-5', content, {
                toolbar: [['Bold']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<s>');
            expect(html).toContain('struck');
        });

        it('strips subscript and superscript when not in toolbar', () => {
            const content = '<p>H<sub>2</sub>O and E=mc<sup>2</sup></p>';
            const editor = createEditorWithContent('test-filter-6', content, {
                toolbar: [['Bold']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<sub>');
            expect(html).not.toContain('<sup>');
            expect(html).toContain('2');
        });

        it('preserves subscript and superscript when in toolbar', () => {
            const content = '<p>H<sub>2</sub>O and E=mc<sup>2</sup></p>';
            const editor = createEditorWithContent('test-filter-7', content, {
                toolbar: [['Subscript', 'Superscript']],
            });

            const html = editor.getHTML();
            expect(html).toContain('<sub>');
            expect(html).toContain('<sup>');
        });

        it('strips headings when no Heading items in toolbar', () => {
            const content = '<h2>A heading</h2><p>Normal text</p>';
            const editor = createEditorWithContent('test-filter-8', content, {
                toolbar: [['Bold', 'Italic']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<h2>');
            expect(html).toContain('A heading');
        });

        it('preserves headings when any Heading item is in toolbar', () => {
            const content = '<h2>A heading</h2><p>Normal text</p>';
            const editor = createEditorWithContent('test-filter-9', content, {
                toolbar: [['Heading1', 'Heading2']],
            });

            const html = editor.getHTML();
            expect(html).toContain('<h2>');
        });

        it('preserves headings when Format is in toolbar', () => {
            const content = '<h3>A heading</h3><p>Normal text</p>';
            const editor = createEditorWithContent('test-filter-10', content, {
                toolbar: [['Format']],
            });

            const html = editor.getHTML();
            expect(html).toContain('<h3>');
        });

        it('strips blockquote when not in toolbar', () => {
            const content = '<blockquote><p>quoted</p></blockquote><p>normal</p>';
            const editor = createEditorWithContent('test-filter-11', content, {
                toolbar: [['Bold']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<blockquote>');
            expect(html).toContain('quoted');
        });

        it('preserves blockquote when in toolbar', () => {
            const content = '<blockquote><p>quoted</p></blockquote>';
            const editor = createEditorWithContent('test-filter-12', content, {
                toolbar: [['Blockquote']],
            });

            const html = editor.getHTML();
            expect(html).toContain('<blockquote>');
        });

        it('strips ordered list when NumberedList not in toolbar', () => {
            const content = '<ol><li><p>item</p></li></ol>';
            const editor = createEditorWithContent('test-filter-13', content, {
                toolbar: [['Bold']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<ol>');
        });

        it('strips bullet list when BulletedList not in toolbar', () => {
            const content = '<ul><li><p>item</p></li></ul>';
            const editor = createEditorWithContent('test-filter-14', content, {
                toolbar: [['Bold']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<ul>');
        });

        it('strips code marks when Code not in toolbar', () => {
            const content = '<p>Some <code>inline code</code> here</p>';
            const editor = createEditorWithContent('test-filter-15', content, {
                toolbar: [['Bold']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<code>');
            expect(html).toContain('inline code');
        });

        it('strips horizontal rule when not in toolbar', () => {
            const content = '<p>above</p><hr><p>below</p>';
            const editor = createEditorWithContent('test-filter-16', content, {
                toolbar: [['Bold']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<hr>');
        });

        it('keeps all default formatting with full toolbar', () => {
            const content = '<h2>Heading</h2><p><strong>bold</strong> <em>italic</em> <u>underline</u> <s>strike</s> <sub>sub</sub> <sup>sup</sup></p><blockquote><p>quote</p></blockquote><ul><li><p>bullet</p></li></ul><ol><li><p>number</p></li></ol>';
            const editor = createEditorWithContent('test-filter-17', content, {
                toolbar: [
                    ['Paragraph', 'Heading1', 'Heading2', 'Heading3'],
                    ['Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript'],
                    ['BulletedList', 'NumberedList', 'Blockquote'],
                ],
            });

            const html = editor.getHTML();
            expect(html).toContain('<h2>');
            expect(html).toContain('<strong>');
            expect(html).toContain('<em>');
            expect(html).toContain('<u>');
            expect(html).toContain('<s>');
            expect(html).toContain('<sub>');
            expect(html).toContain('<sup>');
            expect(html).toContain('<blockquote>');
            expect(html).toContain('<ul>');
            expect(html).toContain('<ol>');
        });

        it('strips multiple formats simultaneously', () => {
            const content = '<h2>Heading</h2><p><strong>bold</strong> and <em>italic</em> and <u>underline</u></p>';
            // Only allow Italic
            const editor = createEditorWithContent('test-filter-18', content, {
                toolbar: [['Italic']],
            });

            const html = editor.getHTML();
            expect(html).not.toContain('<h2>');
            expect(html).not.toContain('<strong>');
            expect(html).toContain('<em>');
            expect(html).not.toContain('<u>');
            expect(html).toContain('Heading');
            expect(html).toContain('bold');
            expect(html).toContain('italic');
            expect(html).toContain('underline');
        });
    });
});

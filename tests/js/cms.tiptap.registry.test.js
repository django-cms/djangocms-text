/* eslint-env es11, jest */
/* jshint esversion: 11 */
/* global window, document, require, jest */

// Verifies the bootstrap → drain hand-off between cms.editor and the
// tiptap bundle. The bootstrap stub in cms.editor.js must let extension
// scripts call register()/registerToolbarItem() even when they run
// before the tiptap bundle (order-independent Django Media rendering).

describe('Tiptap registry bootstrap and drain', () => {
    beforeEach(() => {
        // Wipe module cache and global state so each test starts clean.
        jest.resetModules();
        delete window.CMS_Editor;
        delete window.cms_editor_plugin;
        document.body.innerHTML = '';
    });

    it('installs a queuing stub on window.CMS_Editor.tiptap', () => {
        require('../../private/js/cms.editor');

        expect(window.CMS_Editor.tiptap).toBeDefined();
        expect(window.CMS_Editor.tiptap._bootstrap).toBe(true);
        expect(Array.isArray(window.CMS_Editor.tiptap._queue)).toBe(true);
        expect(typeof window.CMS_Editor.tiptap.register).toBe('function');
        expect(typeof window.CMS_Editor.tiptap.registerToolbarItem).toBe('function');
    });

    it('queues register() calls made before the tiptap bundle loads', () => {
        require('../../private/js/cms.editor');

        const factory = ({Node}) => Node.create({name: 'earlyNode', group: 'block'});
        window.CMS_Editor.tiptap.register('early', factory, {apiVersion: 1});
        window.CMS_Editor.tiptap.registerToolbarItem('Early', {action: () => {}});

        expect(window.CMS_Editor.tiptap._queue).toHaveLength(2);
        expect(window.CMS_Editor.tiptap._queue[0][0]).toBe('register');
        expect(window.CMS_Editor.tiptap._queue[1][0]).toBe('registerToolbarItem');
    });

    it('drains the queue into the real registry when the tiptap bundle loads', () => {
        require('../../private/js/cms.editor');

        const factory = ({Node}) => Node.create({
            name: 'droppedNode',
            group: 'block',
            content: 'inline*',
            parseHTML: () => [{tag: 'dropped-node'}],
            renderHTML: () => ['dropped-node', 0],
        });
        window.CMS_Editor.tiptap.register('drop-test', factory, {apiVersion: 1});
        window.CMS_Editor.tiptap.registerToolbarItem('DropTest', {
            type: 'block',
            action: () => {},
        });

        // Bundle takes over and drains.
        require('../../private/js/cms.tiptap');

        expect(window.CMS_Editor.tiptap._bootstrap).toBeUndefined();
        const TiptapToolbar = require('../../private/js/tiptap_plugins/cms.tiptap.toolbar').default;
        expect(TiptapToolbar.DropTest).toBeDefined();
        expect(TiptapToolbar.DropTest.type).toBe('block');

        // The queued factory must actually reach live editors.
        document.body.innerHTML =
            '<script id="cms-editor-cfg" type="application/json">{}</script>';
        window.dispatchEvent(new Event('DOMContentLoaded'));
        const plugin = window.cms_editor_plugin;

        const el = document.createElement('textarea');
        el.id = 'drain-editor';
        el.classList.add('CMS_Editor');
        document.body.appendChild(el);
        plugin.create(el, false, '', {options: {}}, () => {});
        const editor = plugin._editors['drain-editor'];

        try {
            expect(editor.schema.nodes.droppedNode).toBeDefined();
        } finally {
            plugin.destroyEditor(el);
        }
    });

    it('accepts direct register() calls made after the tiptap bundle loads', () => {
        require('../../private/js/cms.editor');
        require('../../private/js/cms.tiptap');

        expect(window.CMS_Editor.tiptap._bootstrap).toBeUndefined();
        expect(typeof window.CMS_Editor.tiptap.register).toBe('function');

        const factory = ({Node}) => Node.create({
            name: 'lateNode',
            group: 'block',
            parseHTML: () => [{tag: 'late-node'}],
            renderHTML: () => ['late-node'],
        });
        window.CMS_Editor.tiptap.register('late-test', factory, {apiVersion: 1});

        document.body.innerHTML =
            '<script id="cms-editor-cfg" type="application/json">{}</script>';
        window.dispatchEvent(new Event('DOMContentLoaded'));
        const plugin = window.cms_editor_plugin;

        const el = document.createElement('textarea');
        el.id = 'late-editor';
        el.classList.add('CMS_Editor');
        document.body.appendChild(el);
        plugin.create(el, false, '', {options: {}}, () => {});
        const editor = plugin._editors['late-editor'];

        try {
            expect(editor.schema.nodes.lateNode).toBeDefined();
        } finally {
            plugin.destroyEditor(el);
        }
    });
});

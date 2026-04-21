/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window, console */

// Demo dynamic Tiptap extension: YouTube video embed.
//
// This file is a plain IIFE. It has no Tiptap imports — it uses the
// primitives handed to its factory by the host's registry contract.
// See tiptap-extensions.md for the full contract.

(function () {
    'use strict';

    if (!window.CMS_Editor || !window.CMS_Editor.tiptap) {
        console.warn('[cms.youtube] window.CMS_Editor.tiptap registry not found, skipping');
        return;
    }

    const api = window.CMS_Editor.tiptap;

    const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

    function extractVideoId(url) {
        if (typeof url !== 'string') {
            return null;
        }
        const match = YOUTUBE_ID_RE.exec(url.trim());
        return match ? match[1] : null;
    }

    api.register('youtube-video', ({Node, mergeAttributes}) => Node.create({
        name: 'youtubeVideo',
        group: 'block',
        atom: true,
        draggable: true,

        addAttributes() {
            return {
                src: {default: null},
                width: {default: 560},
                height: {default: 315},
            };
        },

        parseHTML() {
            return [
                {tag: 'div[data-youtube-video] iframe'},
                {tag: 'iframe[src*="youtube.com/embed/"]'},
                {tag: 'iframe[src*="youtube-nocookie.com/embed/"]'},
            ];
        },

        renderHTML({HTMLAttributes}) {
            // Feature-policy + referrerpolicy match YouTube's current embed
            // boilerplate. `encrypted-media` is required for the player to
            // initialize correctly — without it, videos fail with
            // "Video configuration error" (YouTube error 153).
            return [
                'div',
                {'data-youtube-video': ''},
                ['iframe', mergeAttributes(HTMLAttributes, {
                    frameborder: '0',
                    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; ' +
                           'gyroscope; picture-in-picture; web-share',
                    referrerpolicy: 'strict-origin-when-cross-origin',
                    allowfullscreen: 'true',
                })],
            ];
        },

        addCommands() {
            return {
                setYoutubeVideo: (options) => ({commands}) => {
                    const id = extractVideoId(options && options.src);
                    if (!id) {
                        return false;
                    }
                    return commands.insertContent({
                        type: 'youtubeVideo',
                        attrs: {
                            src: 'https://www.youtube.com/embed/' + id,
                            width: (options && options.width) || 560,
                            height: (options && options.height) || 315,
                        },
                    });
                },
            };
        },
    }), {apiVersion: 1});

    api.registerToolbarItem('Youtube', {
        type: 'block',
        title: 'YouTube',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" ' +
              'fill="currentColor" viewBox="0 0 16 16">' +
              '<path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 ' +
              '1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 ' +
              '1.77.074 1.957v.075c-.001.194-.01 1.108-.082 ' +
              '2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.01 2.01 0 0 1-1.415 ' +
              '1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17' +
              '-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.01 ' +
              '2.01 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31 ' +
              '31 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104' +
              '.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.01 2.01 0 0 1 1.415-1.42c.487' +
              '-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A100 100 0 0 1 ' +
              '7.858 2zM6.4 5.209v4.818l4.157-2.408z"/></svg>',
        action: (editor) => {
            const url = window.prompt('YouTube URL');
            if (!url) {
                return;
            }
            if (!editor.chain().focus().setYoutubeVideo({src: url}).run()) {
                window.alert('Not a valid YouTube URL.');
            }
        },
        enabled: (editor) => !!editor.schema.nodes.youtubeVideo,
    });
})();

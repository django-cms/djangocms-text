/* eslint-env es11 */
/* jshint esversion: 11 */

// Stable contract exposed to dynamically-loaded Tiptap extensions.
// External scripts receive this object and must not import @tiptap/core
// themselves — that would duplicate ProseMirror and break schema identity.

import {Editor, Extension, Mark, Node, mergeAttributes} from '@tiptap/core';
import {Plugin, PluginKey, TextSelection} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';

export const TIPTAP_API_VERSION = 1;

export const tiptapApi = Object.freeze({
    version: TIPTAP_API_VERSION,
    Editor,
    Node,
    Mark,
    Extension,
    mergeAttributes,
    pm: Object.freeze({
        Plugin,
        PluginKey,
        TextSelection,
        Decoration,
        DecorationSet,
    }),
});

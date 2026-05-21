/* eslint-env es11 */
/* jshint esversion: 11 */
/* global console */

import {tiptapApi, TIPTAP_API_VERSION} from './cms.tiptap.api';

const factories = new Map();
let toolbarTarget = null;

function _bindToolbar(target) {
    toolbarTarget = target;
}

function registerToolbarItem(name, def) {
    if (typeof name !== 'string' || !def || typeof def !== 'object') {
        console.warn('[tiptap] registerToolbarItem() expects (name: string, def: object)');
        return;
    }
    if (!toolbarTarget) {
        console.warn(`[tiptap] toolbar not bound yet — item "${name}" was dropped`);
        return;
    }
    if (toolbarTarget[name]) {
        console.warn(`[tiptap] toolbar item "${name}" re-registered, overriding previous definition`);
    }
    toolbarTarget[name] = def;
}

function register(name, factory, {apiVersion} = {}) {
    if (typeof name !== 'string' || typeof factory !== 'function') {
        console.warn('[tiptap] register() expects (name: string, factory: function)');
        return;
    }
    if (apiVersion && apiVersion > TIPTAP_API_VERSION) {
        console.warn(
            `[tiptap] extension "${name}" requires API v${apiVersion}, ` +
            `host provides v${TIPTAP_API_VERSION} — skipped`
        );
        return;
    }
    if (factories.has(name)) {
        console.warn(`[tiptap] extension "${name}" re-registered, overriding previous factory`);
    }
    factories.set(name, factory);
}

function unregister(name) {
    factories.delete(name);
}

function buildExtensions() {
    const built = [];
    for (const [name, factory] of factories) {
        try {
            const ext = factory(tiptapApi);
            if (ext) {
                built.push(ext);
            }
        } catch (e) {
            console.error(`[tiptap] factory for "${name}" failed:`, e);
        }
    }
    return built;
}

export const CmsTiptapRegistry = {
    register,
    unregister,
    registerToolbarItem,
    buildExtensions,
    _bindToolbar,
    apiVersion: TIPTAP_API_VERSION,
};

import Youtube from '@tiptap/extension-youtube'



window.cms_editor_extensions = window.cms_editor_extensions || [];
window.cms_editor_extensions.push({
    name: 'youtube',

    extensions: [Youtube],
    toolbar: {
        YouTube: {
            icon: '',

        }
    },
});

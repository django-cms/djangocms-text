// placeholder/placeholdercommand.js

import Command from '@ckeditor/ckeditor5-core/src/command';

export default class CMSPluginCommand extends Command {
    execute( { value } ) {
        const editor = this.editor;
        const selection = editor.model.document.selection;

        editor.model.change( writer => {
            // Create a <placeholder> elment with the "name" attribute (and all the selection attributes)...
            const placeholder = writer.createElement( 'cms-plugin', {
                ...Object.fromEntries( selection.getAttributes() ),
                plugin_type: value
            } );

            // ... and insert it into the document.
            editor.model.insertContent( placeholder );

            // Put the selection on the inserted element.
            writer.setSelection( placeholder, 'on' );
        } );
    }

    refresh() {
        const model = this.editor.model;
        const selection = model.document.selection;

        const isAllowed = model.schema.checkChild( selection.focus.parent, 'cms-plugin' );

        this.isEnabled = isAllowed;
    }
}

/* eslint-env es6 */
/* jshint esversion: 6 */
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils';

class CmsPlugin extends Plugin {
    static get requires() {
        return [ Widget ];
    }

    init() {
        this._defineSchema();
        this._defineConverters();
        this._attachEventListeners();
    }

    _defineSchema() {
        const schema = this.editor.model.schema;
        schema.register( 'cmsPlugin', {
			// CmsPlugin element is an object.
            isObject: true,
			// The CmsPlugin element is allowed inside a root element.
            allowWhere: '$root',
			// The CmsPlugin can have text inside.
            isBlock: true,
            allowContentOf: '$block'
        } );
    }

    _defineConverters() {
        const conversion = this.editor.conversion;

        conversion.for( 'upcast' ).elementToElement({
            view: {
                name: 'cms-plugin'
            },
            model: ( viewElement, modelWriter ) => {
                // Read the "content" attribute from the view.
                const content = viewElement.getChild( 0 ).data;

                // Return a model representation of the view element.
                return modelWriter.createElement( 'cmsPlugin', { content } );
            }
        });

        conversion.for( 'editingDowncast' ).elementToElement({
            model: 'cmsPlugin',
            view: ( modelElement, viewWriter ) => {
                         const cmsPlugin = viewWriter.createUIElement( 'cms-plugin',
                    {
                         // Prevent widget from being selectable because it's content is not editable.
                        'contenteditable': 'false'
                    } );

                return toWidget( cmsPlugin, viewWriter );
            }
        });

        conversion.for( 'dataDowncast' ).elementToElement({
            model: 'cmsPlugin',
            view: 'cms-plugin'
        });

    }

    _attachEventListeners() {
        // Defines the double click event to edit the content.

        this.editor.editing.view.document.on('dblclick', ( evt, data ) => {
            const modelElement = this.editor.editing.mapper.toModelElement( data.target );

            if ( !modelElement || !modelElement.is( 'cmsPlugin' ) ) {
                return;
            }

            const content = prompt( 'Insert content', modelElement.getAttribute( 'content' ) );

            if ( content !== null ) {
                this.editor.model.change( writer => {
                    writer.setAttribute( 'content', content, modelElement );
                } );
            }

            data.preventDefault();
        } );

    }
}

export default CmsPlugin;

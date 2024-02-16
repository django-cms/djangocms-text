/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module link/ui/linkformview
 */

/*jshint esversion: 6 */

import {
	ButtonView,
    IframeView,
	FocusCycler,
	LabeledFieldView,
	SwitchButtonView,
	View,
	ViewCollection,
	createLabeledInputText,
	injectCssTransitionDisabler,
	submitHandler
} from 'ckeditor5/src/ui';
import BalloonPanelView from '@ckeditor/ckeditor5-ui/src/panel/balloon/balloonpanelview';
import toUnit from '@ckeditor/ckeditor5-utils/src/dom/tounit';

import { FocusTracker, KeystrokeHandler } from 'ckeditor5/src/utils';
import { icons } from 'ckeditor5/src/core';

// See: #8833.
// eslint-disable-next-line ckeditor5-rules/ckeditor-imports
import '@ckeditor/ckeditor5-ui/theme/components/responsive-form/responsiveform.css';

const toPx = toUnit( 'px' );


export class Modal {
    constructor( locale, editCommand ) {
        this.modalView = new ModalView(locale, editCommand);
        this.editor = editCommand.editor;
        this.editingView = editCommand.editor.editing.view;
        // this.contextualBalloon = editCommand.editor.plugins.get( ContextualBalloon );
        console.log("editComand", editCommand);
    }

	destroy() {
        this.modalView.destroy();
		super.destroy();
	}

    open( options ) {
        console.log("Modal open", options);
        console.log("Modal", this.modalView);

        this.modalView.open (options.url);
        this.modalView.show();
    }

    close() {
        this.modalView.close()
    }
}


/**
 * The link form view controller class.
 *
 * See {@link module:link/ui/linkformview~LinkFormView}.
 *
 * @extends module:ui/view~View
 */
export class ModalView extends BalloonPanelView {
	/**
	 * Creates an instance of the {@link module:cmsplugins/modal/modalui~ModalFormView} class.
	 *
	 * Also see {@link #render}.
	 *
	 * @param {module:utils/locale~Locale} [locale] The localization services instance.
	 * @param {module:link/linkcommand~LinkCommand} editCommand Reference to {@link module:link/linkcommand~LinkCommand}.
	 * @param {String} [protocol] A value of a protocol to be displayed in the input's placeholder.
	 */
	constructor( locale, editCommand ) {
		super( locale );

        this.title_bar = this.createCollection();
        this.action_bar = this.createCollection();

		const bind = this.bindTemplate;

        let width = parseInt(window.innerWidth * 0.6);
        let height = parseInt(window.innerHeight * 0.6);
        if (width < 640 || height < 400) {
            width = window.innerWidth-2;
            height = window.innerHeight-60-2;
        }
        this.set("top", (window.innerWidth-width) / 2);
		this.set("left", (window.innerHeight-height) / 2);
        this.set("width", width);
		this.set("height", height);
		this.setTemplate( {
			tag: 'div',
			attributes: {
				class: [
					'ck',
					'ck-balloon-panel',
					bind.if( 'isVisible', 'ck-balloon-panel_visible' ),
					bind.to( 'class' )
				],

				style: {
					top: bind.to( 'top', toPx ),
					left: bind.to( 'left', toPx ),
					width: bind.to( 'width', toPx ),
					height: bind.to( 'height', toPx )
				}
			},

			children: [
                {
                    tag:    'div',
                    attributes: {class: ['ck-cms-panel-title']},
                    children: this.title_bar
                },
                {
                    tag:    'div',
                    attributes: {class: ['ck-cms-panel-body']},
                    children: this.content
                },
                {
                    tag:    'div',
                    attributes: {class: ['ck-cms-panel-action-bar', 'ck', 'ck-responsive-form']},
                    children: this.action_bar
                },
            ]
		} );
        console.log("template", this.template.attributes.style);

        const t = locale.t;

		/**
		 * Tracks information about DOM focus in the form.
		 *
		 * @readonly
		 * @member {module:utils/focustracker~FocusTracker}
		 */

		this.focusTracker = new FocusTracker();

		/**
		 * An instance of the {@link module:utils/keystrokehandler~KeystrokeHandler}.
		 *
		 * @readonly
		 * @member {module:utils/keystrokehandler~KeystrokeHandler}
		 */
		this.keystrokes = new KeystrokeHandler();

		/**
		 * The URL input view.
		 *
		 * @member {module:ui/labeledfield/labeledfieldview~LabeledFieldView}
		 */

        this.set( {
            isEnabled: false,
        });

		this.iframeView = new IframeView();
        this.content.add( this.iframeView );

		/**
		 * The Save button view.
		 *
		 * @member {module:ui/button/buttonview~ButtonView}
		 */
		this.saveButtonView = this._createButton( t( 'Save' ), icons.check, 'ck-button-save' );
		this.saveButtonView.type = 'submit';

		/**
		 * The Cancel button view.
		 *
		 * @member {module:ui/button/buttonview~ButtonView}
		 */
		this.cancelButtonView = this._createButton( t( 'Cancel' ), icons.cancel, 'ck-button-cancel', 'cancel' );

        this.action_bar.add( this.cancelButtonView );
        this.action_bar.add( this.saveButtonView );

        this.render();
        if (!this.added_to_dom) {
            document.body.appendChild(this.element);
            this.added_to_dom = true;
        }
        return;
		/**
		 * A collection of {@link module:ui/button/switchbuttonview~SwitchButtonView},
		 * which corresponds to {@link module:link/linkcommand~LinkCommand#manualDecorators manual decorators}
		 * configured in the editor.
		 *
		 * @private
		 * @readonly
		 * @type {module:ui/viewcollection~ViewCollection}
		 */
		this._manualDecoratorSwitches = this._createManualDecoratorSwitches( linkCommand );

		/**
		 * A collection of child views in the form.
		 *
		 * @readonly
		 * @type {module:ui/viewcollection~ViewCollection}
		 */
		this.children = this._createFormChildren( linkCommand.manualDecorators );

		/**
		 * A collection of views that can be focused in the form.
		 *
		 * @readonly
		 * @protected
		 * @member {module:ui/viewcollection~ViewCollection}
		 */
		this._focusables = new ViewCollection();

		/**
		 * Helps cycling over {@link #_focusables} in the form.
		 *
		 * @readonly
		 * @protected
		 * @member {module:ui/focuscycler~FocusCycler}
		 */
		this._focusCycler = new FocusCycler( {
			focusables: this._focusables,
			focusTracker: this.focusTracker,
			keystrokeHandler: this.keystrokes,
			actions: {
				// Navigate form fields backwards using the Shift + Tab keystroke.
				focusPrevious: 'shift + tab',

				// Navigate form fields forwards using the Tab key.
				focusNext: 'tab'
			}
		} );

		const classList = [ 'ck', 'ck-link-form', 'ck-responsive-form' ];

		if ( editCommand.manualDecorators.length ) {
			classList.push( 'ck-link-form_layout-vertical', 'ck-vertical-form' );
		}

		this.setTemplate( {
			tag: 'form',

			attributes: {
				class: classList,

				// https://github.com/ckeditor/ckeditor5-link/issues/90
				tabindex: '-1'
			},

			children: this.children
		} );

		injectCssTransitionDisabler( this );
	}

    open(url) {
        this.url = url;
        this.iframeView.element.src = url;
        this.iframeView.on( 'loaded', () => {
            for (let element of this.iframeView.element.contentWindow
                .document.getElementsByClassName("submit-row")) {
                element.setAttribute("style", "display: none;");
            }
            console.log( 'The iframe has loaded', this.iframeView );
        } );
        // this.iframeView.style("display: block;");
        this.cancelButtonView.on('click', () => this.close() );
    }

    close() {
        console.log('close');
        this.cancelButtonView.off('click');
        this.hide();
    }
	/**
	 * Obtains the state of the {@link module:ui/button/switchbuttonview~SwitchButtonView switch buttons} representing
	 * {@link module:link/linkcommand~LinkCommand#manualDecorators manual link decorators}
	 * in the {@link module:link/ui/linkformview~LinkFormView}.
	 *
	 * @returns {Object.<String,Boolean>} Key-value pairs, where the key is the name of the decorator and the value is
	 * its state.
	 */
	getDecoratorSwitchesState() {
		return Array.from( this._manualDecoratorSwitches ).reduce( ( accumulator, switchButton ) => {
			accumulator[ switchButton.name ] = switchButton.isOn;
			return accumulator;
		}, {} );
	}

	/**
	 * @inheritDoc
	 */
	renderx() {
		super.render();

		submitHandler( {
			view: this
		} );

		const childViews = [
			this.urlInputView,
			...this._manualDecoratorSwitches,
			this.saveButtonView,
			this.cancelButtonView
		];

		childViews.forEach( v => {
			// Register the view as focusable.
			this._focusables.add( v );

			// Register the view in the focus tracker.
			this.focusTracker.add( v.element );
		} );

		// Start listening for the keystrokes coming from #element.
		this.keystrokes.listenTo( this.element );
	}

	/**
	 * @inheritDoc
	 */
	destroy() {
		super.destroy();

		this.focusTracker.destroy();
		this.keystrokes.destroy();
	}

	/**
	 * Focuses the fist {@link #_focusables} in the form.
	 */
	focus() {
		this._focusCycler.focusFirst();
	}

	/**
	 * Creates a button view.
	 *
	 * @private
	 * @param {String} label The button label.
	 * @param {String} icon The button icon.
	 * @param {String} className The additional button CSS class name.
	 * @param {String} [eventName] An event name that the `ButtonView#execute` event will be delegated to.
	 * @returns {module:ui/button/buttonview~ButtonView} The button view instance.
	 */
	_createButton( label, icon, className, eventName ) {
		const button = new ButtonView( this.locale );

		button.set( {
			label,
			icon,
			tooltip: true
		} );

		button.extendTemplate( {
			attributes: {
				class: className
			}
		} );

		if ( eventName ) {
			button.delegate( 'execute' ).to( this, eventName );
		}

		return button;
	}

	/**
	 * Populates {@link module:ui/viewcollection~ViewCollection} of {@link module:ui/button/switchbuttonview~SwitchButtonView}
	 * made based on {@link module:link/linkcommand~LinkCommand#manualDecorators}.
	 *
	 * @private
	 * @param {module:link/linkcommand~LinkCommand} linkCommand A reference to the link command.
	 * @returns {module:ui/viewcollection~ViewCollection} of switch buttons.
	 */
	_createManualDecoratorSwitches( linkCommand ) {
		const switches = this.createCollection();

		for ( const manualDecorator of linkCommand.manualDecorators ) {
			const switchButton = new SwitchButtonView( this.locale );

			switchButton.set( {
				name: manualDecorator.id,
				label: manualDecorator.label,
				withText: true
			} );

			switchButton.bind( 'isOn' ).toMany( [ manualDecorator, linkCommand ], 'value', ( decoratorValue, commandValue ) => {
				return commandValue === undefined && decoratorValue === undefined ? manualDecorator.defaultValue : decoratorValue;
			} );

			switchButton.on( 'execute', () => {
				manualDecorator.set( 'value', !switchButton.isOn );
			} );

			switches.add( switchButton );
		}

		return switches;
	}

	/**
	 * Populates the {@link #children} collection of the form.
	 *
	 * If {@link module:link/linkcommand~LinkCommand#manualDecorators manual decorators} are configured in the editor, it creates an
	 * additional `View` wrapping all {@link #_manualDecoratorSwitches} switch buttons corresponding
	 * to these decorators.
	 *
	 * @private
	 * @param {module:utils/collection~Collection} manualDecorators A reference to
	 * the collection of manual decorators stored in the link command.
	 * @returns {module:ui/viewcollection~ViewCollection} The children of link form view.
	 */
	_createFormChildren( manualDecorators ) {
		const children = this.createCollection();

		children.add( this.urlInputView );

		if ( manualDecorators.length ) {
			const additionalButtonsView = new View();

			additionalButtonsView.setTemplate( {
				tag: 'ul',
				children: this._manualDecoratorSwitches.map( switchButton => ( {
					tag: 'li',
					children: [ switchButton ],
					attributes: {
						class: [
							'ck',
							'ck-list__item'
						]
					}
				} ) ),
				attributes: {
					class: [
						'ck',
						'ck-reset',
						'ck-list'
					]
				}
			} );
			children.add( additionalButtonsView );
		}

		children.add( this.saveButtonView );
		children.add( this.cancelButtonView );

		return children;
	}
}

/**
 * Fired when the form view is submitted (when one of the children triggered the submit event),
 * for example with a click on {@link #saveButtonView}.
 *
 * @event submit
 */

/**
 * Fired when the form view is canceled, for example with a click on {@link #cancelButtonView}.
 *
 * @event cancel
 */

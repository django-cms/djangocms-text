/* eslint-env es6 */
/* jshint esversion: 6 */
/* global document, window, console */

import "../css/cms.linkfield.css";

class LinkField {
    constructor(element, options) {
        console.log("LinkField constructor", element.id + '_select');
        this.options = options;
        this.urlElement = element;
        this.form = element.closest("form");
        this.selectElement = this.form.querySelector(`input[name="${this.urlElement.id + '_select'}"]`);
        console.log(this.urlElement, this.selectElement);
        if (this.selectElement) {
            this.prepareField();
            this.registerEvents();
        }
    }

    prepareField() {
        this.inputElement = document.createElement('input');
        this.inputElement.setAttribute('type', 'text');
        this.inputElement.setAttribute('autocomplete', 'off');
        this.inputElement.setAttribute('spellcheck', 'false');
        this.inputElement.setAttribute('autocorrect', 'off');
        this.inputElement.setAttribute('autocapitalize', 'off');
        this.inputElement.setAttribute('placeholder', this.urlElement.getAttribute('placeholder'));
        this.inputElement.classList.add('cms-linkfield-input');
        if (this.selectElement.value) {
            this.handleChange({target: this.selectElement});
            this.inputElement.classList.add('cms-linkfield-selected');
        } else if (this.urlElement.value) {
            this.inputElement.value = this.urlElement.value;
            this.inputElement.classList.remove('cms-linkfield-selected');
        }
        if (this.selectElement.getAttribute('data-value')) {
            this.inputElement.value = this.selectElement.getAttribute('data-value');
            this.inputElement.classList.add('cms-linkfield-selected');
        }
        if (this.selectElement.getAttribute('data-href')) {
            this.urlElement.value = this.selectElement.getAttribute('data-href');
            this.inputElement.classList.add('cms-linkfield-selected');
        }
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('cms-linkfield-wrapper');
        this.urlElement.insertAdjacentElement('afterend', this.wrapper);
        this.urlElement.setAttribute('type', 'hidden');
        this.dropdown = document.createElement('div');
        this.dropdown.classList.add('cms-linkfield-dropdown');
        if (this.form.style.zIndex) {
            this.dropdown.style.zIndex = this.form.style.zIndex + 1;
        }
        this.wrapper.appendChild(this.inputElement);
        this.wrapper.appendChild(this.dropdown);
    }

    registerEvents() {
        this.inputElement.addEventListener('input', this.handleInput.bind(this));
        this.inputElement.addEventListener('focus', event => this.search());
        // this.inputElement.addEventListener('blur', event => {
        //     setTimeout(() => { this.dropdown.style.visibility = 'hidden'; }, 200);
        // });
        this.urlElement.addEventListener('input', event => {
            this.inputElement.value = event.target.value || '';
            this.inputElement.classList.remove('cms-linkfield-selected');
            // this.selectElement.value = '';
        });
        this.selectElement.addEventListener('input', event => this.handleChange(event));

    }

    handleInput(event) {
        // User typed something into the field -> no predefined value selected
        this.selectElement.value = '';
        this.urlElement.value = this.inputElement.value;
        this.inputElement.classList.remove('cms-linkfield-selected');
        this.search();
       }

    showResults(response) {
        this.dropdown.innerHTML = '';
        response.results.forEach(result => this._addResult(result));
    }

    _addResult(result) {
        const item = document.createElement('div');
        item.textContent = result.text;
        if (result.value) {
            item.classList.add('cms-linkfield-option');
            item.setAttribute('data-value', result.value);
            item.setAttribute('data-href', result.url);
            item.setAttribute('data-text', result.verbose);
            item.addEventListener('click', this.handleSelection.bind(this));
        }
        if (result.children && result.children.length > 0) {
            item.classList.add('cms-linkfield-parent');
            this.dropdown.appendChild(item);
            result.children.forEach(child => {
                this._addResult(child);
            });
        }
        if (!result.children) {
            this.dropdown.appendChild(item);
        }
    }

    handleSelection(event) {
        event.stopPropagation();
        event.preventDefault();
        console.log("handleSelection", event.target.textContent, event.target.getAttribute('data-href'));
        this.inputElement.value = event.target.getAttribute('data-text') || event.target.textContent;
        this.inputElement.classList.add('cms-linkfield-selected');
        this.urlElement.value = event.target.getAttribute('data-href');
        this.selectElement.value = event.target.getAttribute('data-value');
        this.inputElement.blur();
        // this.dropdown.innerHTML = '';  // CSS hides dropdown when empty
    }

    handleChange(event) {
        console.log("handleChange", event.target);
        if (this.selectElement.value) {
            fetch(this.options.url + '?g=' + encodeURIComponent(this.selectElement.value))
                .then(response => response.json())
                .then(data => {
                    this.inputElement.value = data.text;
                    this.inputElement.classList.add('cms-linkfield-selected');
                    this.urlElement.value = data.url;
                });
        }
    }

    search() {
        const searchText = this.inputElement.value.toLowerCase();
        this.fetchData(searchText).then(response => {
            this.showResults(response);
        }).catch (error => {
           this.dropdown.innerHTML = `<div class="cms-linkfield-error">${error.message}</div>`;
        });
    }

    fetchData(searchText) {
        if (this.options.url) {
            return fetch(this.options.url + '?q=' + encodeURIComponent(searchText))
                .then(response => response.json());
        }
        return new Promise(resolve => {
            resolve({results: []});
        });
    }
}

export default LinkField;

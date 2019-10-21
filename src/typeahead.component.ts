import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  HostListener,
  Inject,
  Input,
  Output,
  Renderer2
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { Subject } from 'rxjs/internal/Subject';
import {
  debounceTime,
  filter,
  mergeAll,
  mergeMap,
  publishReplay,
  refCount,
  take,
  toArray
} from 'rxjs/operators';
var KEY_UP = 'keyup';
var KEY_DOWN = 'keydown';
var ARROW_DOWN = 'ArrowDown';
var ARROW_UP = 'ArrowUp';
var ESCAPE = 'Escape';
var ENTER = 'Enter';
var TAB = 'Tab';
var BACKSPACE = 'Backspace';
/**
 * Sanitize string for string comparison
 * @param {string} text
 */
var sanitizeString = function(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};
var ɵ0 = sanitizeString;
/***
 * Usage:
 *
 * <typeahead formControlName="myControlName" [suggestions]="['abc', 'def',...]"></typeahead>
 * <typeahead formControlName="myControlName" [suggestions]="Observable.of(['abc', 'def',...])"></typeahead>
 */
var TypeaheadComponent = /** @class */ (function() {
  /**
   * CTOR
   * @param elementRef
   * @param renderer
   */
  function TypeaheadComponent(elementRef, renderer) {
    this.elementRef = elementRef;
    this.renderer = renderer;
    /** suggestions list - array of strings, objects or Observable */
    this.suggestions = [];
    /** field to use from objects as name */
    this.nameField = 'name';
    /** field to use from objects as id */
    this.idField = 'id';
    /** allow custom values */
    this.custom = true;
    /** allow multiple values */
    this.multi = false;
    /** use complex suggestions and results */
    this.complex = false;
    /** use complex suggestions and results */
    this.placeholder = '';
    /** Output value change */
    this.valueChange = new EventEmitter();
    // ui state
    this.isDisabled = false;
    this.isExpanded = false;
    this.dropDownClass = '';
    this.matches = [];
    // values
    this.values = [];
    this.callbackQueue = [];
    /**
     * Default values for TypeaheadSettings
     * @type TypeaheadSettings
     * @private
     */
    this._settings = {
      suggestionsLimit: 10,
      typeDelay: 50,
      noMatchesText: 'No matches found',
      tagClass: 'btn badge badge-primary',
      tagRemoveIconClass: '',
      dropdownMenuClass: 'dropdown-menu',
      dropdownMenuExpandedClass: 'dropdown-menu show',
      dropdownMenuItemClass: 'dropdown-item',
      dropdownToggleClass: 'dropdown-toggle'
    };
    this._inputChangeEvent = new Subject();
    this._removeInProgress = false;
    this.onChange = function(_) {};
    this.onTouched = function() {};
  }
  Object.defineProperty(TypeaheadComponent.prototype, 'settings', {
    get: function() {
      return this._settings;
    },
    /** Value of form control */
    set: function(value) {
      Object.assign(this._settings, value);
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(TypeaheadComponent.prototype, 'multiBinding', {
    /** UI Bindings */
    get: function() {
      return this.multi;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(TypeaheadComponent.prototype, 'disabledBinding', {
    get: function() {
      return this.isDisabled || null;
    },
    enumerable: true,
    configurable: true
  });
  TypeaheadComponent.prototype.focusOutHandler = function(event) {
    if (this.isDisabled) {
      return;
    }
    if (event.relatedTarget) {
      // related target is typeahead, input or one of the buttons
      if (
        event.relatedTarget === this.elementRef.nativeElement ||
        event.relatedTarget.parentElement === this.elementRef.nativeElement ||
        event.relatedTarget.parentElement.parentElement === this.elementRef.nativeElement
      ) {
        // grab back input focus after button click since `focus out` cancelled it
        if (event.target === this._input && event.relatedTarget === this.elementRef.nativeElement) {
          this._input.focus();
        }
        return;
      }
    }
    // close dropdown
    this.toggleDropdown(false);
    // keep just approved tags
    if (this.multi) {
      this._input.value = null;
      this._inputChangeEvent.next('');
      return;
    }
    // trim values
    if (!this.custom || this.complex) {
      this._input.value = this._input.value.trim();
      // if not match then cleanup the values
      if (!this.hasMatch(this._input.value)) {
        this._input.value = this.value = null;
        this._inputChangeEvent.next('');
      }
    }
  };
  /**
   * On component initialization
   */
  TypeaheadComponent.prototype.ngOnInit = function() {
    this.suggestionsInit(
      this.suggestions instanceof Observable
        ? this.suggestions.pipe(
            publishReplay(1),
            refCount(),
            mergeAll()
          )
        : of.apply(void 0, this.suggestions)
    );
    this.toggleDropdown(false);
    this._inputChangeEvent.next('');
  };
  TypeaheadComponent.prototype.ngOnChanges = function(changes) {
    if (changes.suggestions && !changes.suggestions.firstChange) {
      this.allMatchesSubscription.unsubscribe();
      this.matchesSubscription.unsubscribe();
      this.ngOnInit();
    }
  };
  TypeaheadComponent.prototype.suggestionsInit = function(suggestion$) {
    var _this = this;
    this.matchesSubscription = this._inputChangeEvent
      .pipe(
        debounceTime(this.settings.typeDelay),
        mergeMap(function(value) {
          var normalizedValue = sanitizeString(value);
          var filteredSuggestions$ = suggestion$.pipe(
            filter(_this.filterSuggestion(normalizedValue))
          );
          return _this.settings.suggestionsLimit
            ? filteredSuggestions$.pipe(
                take(_this.settings.suggestionsLimit),
                toArray()
              )
            : filteredSuggestions$.pipe(toArray());
        })
      )
      .subscribe(function(matches) {
        _this.matches = matches;
      });
    this.allMatchesSubscription = suggestion$.pipe(toArray()).subscribe(function(suggestions) {
      _this.allMatches = suggestions;
      while (_this.callbackQueue.length) {
        // take first one and process it
        _this.callbackQueue.shift().apply(_this);
        _this._inputChangeEvent.next('');
      }
    });
  };
  /**
   * Init method
   */
  TypeaheadComponent.prototype.ngAfterViewInit = function() {
    var _this = this;
    // set value to input
    this._input = this.elementRef.nativeElement.querySelector('input');
    if (!this.multi && this._value) {
      var callback = function() {
        _this._input.value = _this.complex ? _this.extractNameById(_this._value) : _this._value;
      };
      if (this.allMatches || !this.complex) {
        callback.apply(this);
      } else {
        this.callbackQueue.push(callback);
      }
    }
  };
  /**
   * Cleanup timeout
   */
  TypeaheadComponent.prototype.ngOnDestroy = function() {
    this.allMatchesSubscription.unsubscribe();
    this.matchesSubscription.unsubscribe();
  };
  Object.defineProperty(TypeaheadComponent.prototype, 'value', {
    /**
     * Value getter
     * @returns {string|string[]}
     */
    get: function() {
      return this._value;
    },
    /**
     * Value setter
     * @param value
     */
    set: function(value) {
      if (value === this._value) {
        return;
      }
      this.writeValue(value);
    },
    enumerable: true,
    configurable: true
  });
  /**
   * Handle input change event
   * @param {Event} event
   */
  TypeaheadComponent.prototype.handleInputChange = function(event) {
    // Stop the propagation of event up the DOM tree in case
    // `change` event handler is attached to host component.
    event.stopPropagation();
  };
  /**
   * Update value on input change
   * @param event
   */
  TypeaheadComponent.prototype.handleInput = function(event) {
    var target = event.target;
    // if esc key, close dropdown
    if ([KEY_DOWN, KEY_UP].includes(event.type) && event.key === ESCAPE) {
      this.toggleDropdown(false);
      return;
    }
    // if arrow down, select first item in the menu
    if (event.type === KEY_DOWN && event.key === ARROW_DOWN && this.matches.length > 0) {
      var button = this.elementRef.nativeElement.querySelector(
        'button[role="menuitem"]:first-child'
      );
      button.focus();
      return;
    }
    this.toggleDropdown(true);
    if (this.multi || this.complex) {
      if (
        (event.type === KEY_UP && event.key === ENTER && target.value !== '') ||
        (event.type === KEY_DOWN && event.key === TAB && target.value !== '')
      ) {
        this.setValue(target.value);
        this.toggleDropdown(false);
      }
      if ([KEY_DOWN, KEY_UP].includes(event.type) && event.key === BACKSPACE) {
        if (target.value === '') {
          if (event.type === KEY_DOWN) {
            this._removeInProgress = true;
          } else if (this._removeInProgress) {
            if (this.multi && this.values.length) {
              this._removeInProgress = false;
              this.removeValue(this.values[this.values.length - 1]);
            }
          }
        } else if (this.complex && !this.multi && event.type === KEY_DOWN) {
          this.value = null;
        }
      }
    } else if (event.type === KEY_UP) {
      this.setValue(target.value);
      if (event.key === ENTER && target.value !== '') {
        this.toggleDropdown(false);
      }
    }
    this._inputChangeEvent.next(target.value);
  };
  /**
   * Move through collection on dropdown
   * @param event
   * @param value
   */
  TypeaheadComponent.prototype.handleButton = function(event, value) {
    var target = event.target;
    if (event instanceof MouseEvent) {
      this.setValue(value, true);
      this._inputChangeEvent.next(this._input.value);
      return;
    }
    if (event.type === KEY_UP) {
      if (event.key === ENTER) {
        this.setValue(value);
        this._inputChangeEvent.next(this._input.value);
        this.toggleDropdown(false);
      }
      if (event.key === ESCAPE) {
        this._input.focus();
        this.toggleDropdown(false);
      }
    } else {
      if (event.key === ARROW_DOWN && target.nextElementSibling) {
        target.nextElementSibling.focus();
      }
      if (event.key === ARROW_UP && target.previousElementSibling) {
        target.previousElementSibling.focus();
      }
      target.parentNode.scrollTop = target.offsetTop;
    }
  };
  /**
   * Set value to list of values or as a single value
   * @param value
   * @param {boolean} collapseMenu
   */
  TypeaheadComponent.prototype.setValue = function(value, collapseMenu) {
    if ((!this.custom || this.complex) && !this.hasMatch(value)) {
      return;
    }
    if (this.multi) {
      if (!this.values.includes(value)) {
        this.value = this.values.concat(value).map(this.extractIdentifier.bind(this));
        this._input.value = '';
      }
    } else {
      this.value = this.extractIdentifier(value);
      this._input.value = this.extractName(value);
    }
    if (collapseMenu) {
      this.toggleDropdown(false);
    }
    // refocus the input
    this._input.focus();
  };
  /**
   * Remove value from list of values or clear out the value
   * @param value
   */
  TypeaheadComponent.prototype.removeValue = function(value) {
    var index = this.values.indexOf(value);
    if (index !== -1) {
      if (index === this.values.length - 1) {
        this.value = this.values.slice(0, -1).map(this.extractIdentifier.bind(this));
      } else {
        this.value = this.values
          .slice(0, index)
          .concat(this.values.slice(index + 1))
          .map(this.extractIdentifier.bind(this));
      }
      this._inputChangeEvent.next(this._input.value);
      this._input.focus();
    }
  };
  TypeaheadComponent.prototype.toggleDropdown = function(value) {
    if (value === undefined) {
      this._input.focus();
      this.isExpanded = !this.isExpanded;
    } else {
      this.isExpanded = value;
    }
    this.dropDownClass = this.isExpanded
      ? this.settings.dropdownMenuExpandedClass
      : this.settings.dropdownMenuClass;
  };
  /**
   * Write new value
   * @param value
   */
  TypeaheadComponent.prototype.writeValue = function(value) {
    var _this = this;
    // set value
    this._value = value;
    this.elementRef.nativeElement.value = value;
    // modify values list
    if (this.multi) {
      if (this.complex) {
        var callback = function() {
          _this.values = value ? value.map(_this.parseObjectById.bind(_this)) : [];
          // make sure not found value doesn't break the UI
          _this.values = _this.values.filter(function(val) {
            return !!val;
          });
        };
        if (this.allMatches || !value) {
          callback.apply(this);
        } else {
          this.callbackQueue.push(callback);
        }
      } else {
        this.values = value || [];
      }
    }
    // trigger change
    if ('createEvent' in document) {
      var event_1 = document.createEvent('HTMLEvents');
      event_1.initEvent('change', false, true);
      this.elementRef.nativeElement.dispatchEvent(event_1);
    } else {
      // we need to cast since fireEvent is not standard functionality and works only in IE
      this.elementRef.nativeElement.fireEvent('onchange');
    }
    this.onChange(value);
  };
  /**
   * Set disabled state of the component
   * @param {boolean} value
   */
  TypeaheadComponent.prototype.setDisabledState = function(value) {
    this.isDisabled = value;
    this.renderer.setProperty(this.elementRef.nativeElement, 'disabled', value);
  };
  TypeaheadComponent.prototype.registerOnChange = function(fn) {
    this.onChange = fn;
  };
  TypeaheadComponent.prototype.registerOnTouched = function(fn) {
    this.onTouched = fn;
  };
  /**
   * @param {string} searchString
   * @returns {(value: any) => boolean}
   */
  TypeaheadComponent.prototype.filterSuggestion = function(searchString) {
    var _this = this;
    return function(value) {
      if (_this.values.includes(value)) {
        return false;
      }
      if (typeof value === 'string') {
        return sanitizeString(value).includes(searchString);
      } else {
        return (
          sanitizeString(value[_this.nameField]).includes(searchString) &&
          !_this.values.some(function(element) {
            return element[_this.idField] === value[_this.idField];
          })
        );
      }
    };
  };
  /**
   * Check if value has match
   * @param {string | Object} value
   * @returns {boolean}
   */
  TypeaheadComponent.prototype.hasMatch = function(value) {
    var sanitizedValue = typeof value === 'string' ? sanitizeString(value) : null;
    for (var key in this.matches) {
      if (typeof this.matches[key] === 'string') {
        var sanitizedMatch = sanitizeString(this.matches[key]);
        if (sanitizedMatch === sanitizedValue) {
          return true;
        }
      } else {
        if (typeof value === 'string') {
          var sanitizedMatch = sanitizeString(this.matches[key][this.nameField]);
          if (sanitizedMatch === sanitizedValue) {
            return true;
          }
        } else {
          if (this.matches[key][this.idField] === value[this.idField]) {
            return true;
          }
        }
      }
    }
    return false;
  };
  /**
   * Get name by parsing id into object
   * @param id
   * @returns {string}
   */
  TypeaheadComponent.prototype.extractNameById = function(id) {
    var match = this.parseObjectById(id);
    if (match) {
      return match[this.nameField];
    } else {
      return '';
    }
  };
  /**
   * Get complex object from id
   * @param id
   * @returns {any}
   */
  TypeaheadComponent.prototype.parseObjectById = function(id) {
    for (var key in this.allMatches) {
      if (this.allMatches[key][this.idField] === id) {
        return this.allMatches[key];
      }
    }
    return null;
  };
  /**
   * Extract id field from the complex object by name or return value if it's string
   * @param {string | Object} value
   * @returns {any}
   */
  TypeaheadComponent.prototype.extractIdentifier = function(value) {
    var _this = this;
    if (this.complex) {
      if (typeof value === 'string') {
        var sanitizedValue_1 = sanitizeString(value);
        var match = this.allMatches.find(function(item) {
          return sanitizeString(item[_this.nameField]) === sanitizedValue_1;
        });
        if (match) {
          return match[this.idField];
        }
        throw Error('Critical error: Match ID could not be extracted.');
      }
      return value[this.idField];
    }
    return value;
  };
  /**
   * Extract name from complex object or return value if it's string
   * @param {string | Object} value
   * @returns {any}
   */
  TypeaheadComponent.prototype.extractName = function(value) {
    if (this.complex && typeof value !== 'string') {
      return value[this.nameField];
    }
    return value;
  };
  TypeaheadComponent.decorators = [
    {
      type: Component,
      args: [
        {
          selector: 'type-ahead',
          styles: [
            '\n    :host {\n      height: auto;\n      min-height: 1em;\n      position: relative;\n      display: inline-flex;\n      flex-wrap: wrap;\n      -webkit-appearance: textfield;\n      -moz-appearance: textfield-multiline;\n      -webkit-rtl-ordering: logical;\n      user-select: text;\n      cursor: auto;\n    }\n    :host[disabled] {\n      cursor: not-allowed;\n    }\n    :host[disabled] input {\n      background-color: inherit;\n    }\n    :host .type-ahead-badge {\n      white-space: nowrap;\n      cursor: pointer;\n    }\n    :host input {\n      border: none;\n      outline: 0;\n      line-height: 1;\n      flex: 1;\n    }\n    :host [role="menuitem"] {\n      cursor: pointer;\n    }\n    :host [role="menuitem"][disabled] {\n      cursor: not-allowed;\n    }\n  '
          ],
          template:
            '\n    <!-- default options item template -->\n    <ng-template #taItemTemplate let-value="item">\n      {{ complex ? value[nameField] : value }}\n    </ng-template>\n\n    <span [ngClass]="settings.tagClass" class="type-ahead-badge" *ngFor="let value of values; let i = index">\n      <ng-template [ngTemplateOutlet]="itemTemplate || taItemTemplate"\n                 [ngTemplateOutletContext]="{ item: value, index: i, complex: complex, nameField: nameField }"></ng-template>\n      <span *ngIf="!isDisabled" aria-hidden="true" (click)="removeValue(value)"\n            [ngClass]="settings.tagRemoveIconClass">\u00D7</span>\n    </span>\n    <input *ngIf="!isDisabled || !multi || !values.length" \n           [disabled]="isDisabled || null"\n           placeholder="{{(isDisabled || values.length) ? \'\' : placeholder}}"\n           type="text" autocomplete="off"\n           (keyup)="handleInput($event)"\n           (keydown)="handleInput($event)"\n           (paste)="handleInput($event)"\n           (click)="toggleDropdown(true)"\n           (change)="handleInputChange($event)">\n    <i *ngIf="!isDisabled" (click)="toggleDropdown()" tabindex="-1"\n       [ngClass]="settings.dropdownToggleClass"></i>\n    <div role="menu" [attr.class]="dropDownClass" *ngIf="matches.length || !custom">\n      <button *ngFor="let match of matches; let i = index" type="button" role="menuitem" tabindex="-1"\n              [ngClass]="settings.dropdownMenuItemClass"\n              (mouseup)="handleButton($event, match)"\n              (keydown)="handleButton($event, match)"\n              (keyup)="handleButton($event, match)">\n        <ng-template [ngTemplateOutlet]="itemTemplate || taItemTemplate"\n                     [ngTemplateOutletContext]="{ item: match, index: i, complex: complex, nameField: nameField }"></ng-template>\n      </button>\n      <button role="menuitem" *ngIf="!matches.length && !custom" tabindex="-1" aria-disabled="true" disabled="disabled"\n           [ngClass]="settings.dropdownMenuItemClass">\n        {{ settings.noMatchesText }}\n      </button>\n    </div>\n  ',
          providers: [
            {
              provide: NG_VALUE_ACCESSOR,
              useExisting: forwardRef(function() {
                return TypeaheadComponent;
              }),
              multi: true
            }
          ]
        }
      ]
    }
  ];
  /** @nocollapse */
  TypeaheadComponent.ctorParameters = function() {
    return [
      { type: ElementRef, decorators: [{ type: Inject, args: [ElementRef] }] },
      { type: Renderer2, decorators: [{ type: Inject, args: [Renderer2] }] }
    ];
  };
  TypeaheadComponent.propDecorators = {
    suggestions: [{ type: Input }],
    itemTemplate: [{ type: Input }],
    nameField: [{ type: Input }],
    idField: [{ type: Input }],
    custom: [{ type: Input }],
    multi: [{ type: Input }],
    complex: [{ type: Input }],
    placeholder: [{ type: Input }],
    settings: [{ type: Input }],
    multiBinding: [{ type: HostBinding, args: ['class.multi'] }],
    disabledBinding: [{ type: HostBinding, args: ['attr.disabled'] }],
    valueChange: [{ type: Output }],
    focusOutHandler: [{ type: HostListener, args: ['focusout', ['$event']] }]
  };
  return TypeaheadComponent;
})();
export { TypeaheadComponent };
export { ɵ0 };

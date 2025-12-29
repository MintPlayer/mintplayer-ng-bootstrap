The following tests seem to fail:
- ng-bootstrap-demo  src/app/pages/advanced/select2/select2.component.spec.ts (1 test | 1 failed) 401ms
- ng-bootstrap-demo  src/app/pages/advanced/autofocus/autofocus.component.spec.ts (1 test | 1 failed) 525ms
- ng-bootstrap-demo  src/app/pages/basic/timepicker/timepicker.component.spec.ts (1 test | 1 failed) 502ms
- ng-bootstrap-demo  src/app/pages/advanced/searchbox/searchbox.component.spec.ts (1 test | 1 failed) 483ms
- ng-bootstrap-demo  src/app/pages/overlay/multiselect-dropdown/multiselect-dropdown.component.spec.ts (1 test | 1 failed) 419ms
- ng-bootstrap-demo  src/app/pages/overlay/dropdown/dropdown.component.spec.ts (1 test | 1 failed) 474ms
- ng-bootstrap-demo  src/app/pages/overlay/typeahead/typeahead.component.spec.ts (1 test | 1 failed) 557ms
- ng-bootstrap-demo  src/app/pages/basic/datepicker/datepicker.component.spec.ts (1 test | 1 failed) 406ms
- ng-bootstrap-demo  src/app/pages/additional-samples/select2-drag-drop/select2-drag-drop.component.spec.ts (1 test | 1 failed) 387ms
   FAIL   ng-bootstrap-demo  src/app/pages/additional-samples/select2-drag-drop/select2-drag-drop.component.spec.ts > Select2DragDropComponent > should create
   FAIL   ng-bootstrap-demo  src/app/pages/advanced/autofocus/autofocus.component.spec.ts > AutofocusComponent > should create
   FAIL   ng-bootstrap-demo  src/app/pages/advanced/searchbox/searchbox.component.spec.ts > SearchboxComponent > should create
   FAIL   ng-bootstrap-demo  src/app/pages/advanced/select2/select2.component.spec.ts > Select2Component > should create
   FAIL   ng-bootstrap-demo  src/app/pages/basic/datepicker/datepicker.component.spec.ts > DatepickerComponent > should create
   FAIL   ng-bootstrap-demo  src/app/pages/basic/timepicker/timepicker.component.spec.ts > TimepickerComponent > should create
   FAIL   ng-bootstrap-demo  src/app/pages/overlay/dropdown/dropdown.component.spec.ts > DropdownComponent > should create
   FAIL   ng-bootstrap-demo  src/app/pages/overlay/multiselect-dropdown/multiselect-dropdown.component.spec.ts > MultiselectDropdownComponent > should create
   FAIL   ng-bootstrap-demo  src/app/pages/overlay/typeahead/typeahead.component.spec.ts > TypeaheadComponent > should create
  Error: ASSERTION ERROR: Attempted to set attribute `role` on a container node. Host bindings are not valid on ng-container or ng-template.
   FAIL   ng-bootstrap-demo  src/app/pages/overlay/offcanvas/offcanvas.component.spec.ts > OffcanvasComponent > should create
  Error: ASSERTION ERROR: Attempted to set attribute `role` on a container node. Host bindings are not valid on ng-container or ng-template.
   FAIL   mintplayer-ng-bootstrap  datepicker/src/datepicker.component.spec.ts > BsDatepickerComponent > should create
   FAIL   mintplayer-ng-bootstrap  timepicker/src/timepicker.component.spec.ts > BsTimepickerComponent > should create
   FAIL   mintplayer-ng-bootstrap  typeahead/src/typeahead.component.spec.ts > TypeaheadComponent > should create
   FAIL   mintplayer-ng-bootstrap  dropdown/src/dropdown-menu/dropdown-menu.directive.spec.ts > BsDropdownMenuDirective > should create an instance
  Error: ASSERTION ERROR: Attempted to set attribute `role` on a container node. Host bindings are not valid on ng-container or ng-template.
   FAIL   mintplayer-ng-bootstrap  dropdown/src/dropdown-toggle/dropdown-toggle.directive.spec.ts > BsDropdownToggleDirective > should create an instance
  TypeError: this.dropdown.isOpen is not a function
   ❯ BsDropdownToggleDirective2.get ariaExpanded [as ariaExpanded] dropdown/src/dropdown-toggle/dropdown-toggle.directive.ts:20:26
       18|   @HostBinding('attr.aria-haspopup') ariaHasPopup = 'true';
       19|   @HostBinding('attr.aria-expanded') get ariaExpanded() {
       20|     return this.dropdown.isOpen();
         |                          ^
       21|   }
       22| 
import { Component, Directive, EventEmitter, Injectable, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FocusTrapComponent } from './focus-trap.component';

@Directive({
  selector: '[bsFor]'
})
class BsForMockDirective {
  @Input() bsFor!: any;
}

@Component({
  selector: 'bs-modal',
  template: 'modal'
})
class BsModalHostMockComponent {
  
  //#region isOpen
  private _isOpen = false;
  get isOpen() {
    return this._isOpen;
  }
  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    this.isOpenChange.emit(value);
  }
  @Output() isOpenChange = new EventEmitter<boolean>();
  //#endregion

}

describe('FocusTrapComponent', () => {
  let component: FocusTrapComponent;
  let fixture: ComponentFixture<FocusTrapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        FocusTrapComponent,

        // Mock dependencies
        BsForMockDirective,
        BsModalHostMockComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FocusTrapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

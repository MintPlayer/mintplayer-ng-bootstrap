import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSnackbarCloseDirective } from './snackbar-close.directive';

@Component({
  selector: 'snackbar-close-test-component',
  template: `
    <div>
    </div>`
})
class BsSnackbarCloseTestComponent { }

describe('BsSnackbarCloseDirective', () => {
  let fixture: ComponentFixture<BsSnackbarCloseTestComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule
      ],
      declarations: [
        // Unit to test
        BsSnackbarCloseDirective,
        
        // Mock dependencies
        
        
        // Testbench
        BsSnackbarCloseTestComponent,
      ],
      providers: []
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsSnackbarCloseTestComponent);

    // Trigger initial binding
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(fixture).toBeTruthy();
  });

  // // Get element test
  // it('should discover 1 element', () => {
  //   expect(debugElements.length).toEqual(1);
  // });

});

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsNoNoscriptDirective } from './no-noscript.directive';

@Component({
  selector: 'no-noscript-test-component',
  template: `<div bsNoNoscript></div>`
})
class NoNoscriptTestComponent {}

describe('BsNoNoscriptDirective', () => {
  let component: NoNoscriptTestComponent;
  let fixture: ComponentFixture<NoNoscriptTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Directive to test
        BsNoNoscriptDirective,
        // Mock dependencies

        // Testbench
        NoNoscriptTestComponent,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NoNoscriptTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

});

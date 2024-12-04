import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsOffcanvasPushDirective } from './offcanvas-push.directive';

@Component({
  selector: 'bs-offcanvas-test',
  standalone: false,
  template: `<div [bsOffcanvasPush]="pushElement"></div>`
})
class BsOffcanvasPushTestComponent {}

describe('BsOffcanvasPushDirective', () => {
  let component: BsOffcanvasPushTestComponent;
  let fixture: ComponentFixture<BsOffcanvasPushTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Unit to test
        BsOffcanvasPushDirective,
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsOffcanvasPushTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});

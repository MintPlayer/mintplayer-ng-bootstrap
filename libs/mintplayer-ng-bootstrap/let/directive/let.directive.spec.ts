import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsLetDirective } from './let.directive';

@Component({
  selector: 'bs-let-test',
  template: `<ng-container *bsLet="value as item">{{ item }}</ng-container>`
})
class BsLetTestComponent {
  value = 'test-value';
}

describe('BsLetDirective', () => {
  let component: BsLetTestComponent;
  let fixture: ComponentFixture<BsLetTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsLetDirective,
        BsLetTestComponent
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsLetTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});

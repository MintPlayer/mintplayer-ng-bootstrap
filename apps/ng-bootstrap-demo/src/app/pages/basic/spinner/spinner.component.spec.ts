import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpinnerComponent } from './spinner.component';

@Component({
  selector: 'bs-spinner',
  template: '<b>Spinner</b>'
})
class BsSpinnerMockComponent {
  @Input() type: 'border' | 'grow' = 'border';
}

describe('SpinnerComponent', () => {
  let component: SpinnerComponent;
  let fixture: ComponentFixture<SpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        SpinnerComponent,
        
        // Mock dependencies
        BsSpinnerMockComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

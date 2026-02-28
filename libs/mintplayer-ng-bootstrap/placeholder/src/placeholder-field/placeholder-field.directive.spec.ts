import { Component, model } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsPlaceholderComponent } from '../placeholder/placeholder.component';
import { BsPlaceholderFieldDirective } from './placeholder-field.directive';

@Component({
  selector: '[bsPlaceholder]',
  standalone: true,
  template: `
    <div class="placeholder-glow">
      <ng-content></ng-content>
    </div>`,
  providers: [
    { provide: BsPlaceholderComponent, useExisting: BsPlaceholderMockComponent },
  ]
})
class BsPlaceholderMockComponent {
  bsPlaceholder = model<boolean>(false);
  isLoading = model<boolean>(false);
}


@Component({
  selector: 'bs-placeholder-test',
  standalone: true,
  template: `
    <p class="card-text" [bsPlaceholder]="isLoadingValue">
      <span bsPlaceholderField>{{ isLoadingValue ? '' : lines[0] }}</span>
    </p>`,
})
class BsPlaceholderTestComponent {
  isLoadingValue = true;
  lines = ['Hello world'];
}

describe('BsPlaceholderFieldDirective', () => {
  let component: BsPlaceholderTestComponent;
  let fixture: ComponentFixture<BsPlaceholderTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Mock dependencies
        BsPlaceholderMockComponent,
        // Unit to test
        BsPlaceholderFieldDirective,

        // Testbench
        BsPlaceholderTestComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BsPlaceholderTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

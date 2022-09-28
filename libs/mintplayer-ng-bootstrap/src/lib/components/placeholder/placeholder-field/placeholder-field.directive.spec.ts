import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { BsPlaceholderComponent } from '../placeholder/placeholder.component';
import { BsPlaceholderFieldDirective } from './placeholder-field.directive';

@Component({
  selector: '[bsPlaceholder]',
  template: `
    <div class="placeholder-glow">
      <ng-content></ng-content>
    </div>`,
  providers: [
    { provide: BsPlaceholderComponent, useExisting: BsPlaceholderMockComponent },
  ]
})
class BsPlaceholderMockComponent {
  isLoading$ = new BehaviorSubject<boolean>(false);

  @Input() public set bsPlaceholder(value: boolean) {
    this.isLoading$.next(value);
  }
}


@Component({
  selector: 'bs-placeholder-test',
  template: `
    <p class="card-text" [bsPlaceholder]="isLoading">
      <span bsPlaceholderField>{{ isLoading ? '' : lines[0] }}</span>
    </p>`,
})
class BsPlaceholderTestComponent {
  isLoading = true;
  lines = ['Hello world'];
}

describe('BsPlaceholderFieldDirective', () => {
  let component: BsPlaceholderTestComponent;
  let fixture: ComponentFixture<BsPlaceholderTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsPlaceholderFieldDirective,
      
        // Mock dependencies
        BsPlaceholderMockComponent,

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

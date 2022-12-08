import { Component, Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { PlaceholderComponent } from './placeholder.component';

@Component({
  selector: 'bs-placeholder',
  template: '<ng-content></ng-content>'
})
class BsPlaceholderMockComponent {
  @Input() isLoading = false;
}

@Component({
  selector: 'bs-card',
  template: 'card works'
})
class BsCardMockComponent {}

@Component({
  selector: 'bs-card-header',
  template: 'card-header works'
})
class BsCardHeaderMockComponent {}

@Component({
  selector: 'bs-grid',
  template: 'grid'
})
class BsGridMockComponent {}

@Directive({
  selector: '[bsColumn]'
})
class BsGridColumnMockDirective {
  @Input() public bsColumn: string | null = '';
}

describe('PlaceholderComponent', () => {
  let component: PlaceholderComponent;
  let fixture: ComponentFixture<PlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule
      ],
      declarations: [
        // Unit to test
        PlaceholderComponent,
        
        // Mock dependencies
        BsPlaceholderMockComponent,
        BsCardMockComponent,
        BsCardHeaderMockComponent,
        BsGridMockComponent,
        BsGridColumnMockDirective
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

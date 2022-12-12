import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsCardTestingModule, BsGridTestingModule } from '@mintplayer/ng-bootstrap/testing';

import { PlaceholderComponent } from './placeholder.component';

@Component({
  selector: 'bs-placeholder',
  template: '<ng-content></ng-content>'
})
class BsPlaceholderMockComponent {
  @Input() isLoading = false;
}

describe('PlaceholderComponent', () => {
  let component: PlaceholderComponent;
  let fixture: ComponentFixture<PlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        BsCardTestingModule,
        BsGridTestingModule,
      ],
      declarations: [
        // Unit to test
        PlaceholderComponent,
        
        // Mock dependencies
        BsPlaceholderMockComponent,
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

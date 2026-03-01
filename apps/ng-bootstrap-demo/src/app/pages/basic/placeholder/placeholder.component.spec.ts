import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockComponent, MockDirective } from 'ng-mocks';

import { PlaceholderComponent } from './placeholder.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsPlaceholderComponent, BsPlaceholderFieldDirective } from '@mintplayer/ng-bootstrap/placeholder';

describe('PlaceholderComponent', () => {
  let component: PlaceholderComponent;
  let fixture: ComponentFixture<PlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsCardComponent), MockComponent(BsCardHeaderComponent),
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockComponent(BsToggleButtonComponent), MockDirective(BsToggleButtonGroupDirective),
        MockComponent(BsPlaceholderComponent), MockDirective(BsPlaceholderFieldDirective),

        // Unit to test (standalone)
        PlaceholderComponent,
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

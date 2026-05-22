import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockPipe, MockComponent, MockDirective } from 'ng-mocks';
import { BsSplitStringPipe } from '@mintplayer/ng-bootstrap/split-string';

import { SplitStringComponent } from './split-string.component';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';

describe('SplitStringComponent', () => {
  let component: SplitStringComponent;
  let fixture: ComponentFixture<SplitStringComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        // Mock dependencies
        FormsModule,
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockComponent(BsListGroupComponent), MockComponent(BsListGroupItemComponent),
        MockPipe(BsSplitStringPipe),

        // Unit to test (standalone)
        SplitStringComponent,
      ]
    });
    fixture = TestBed.createComponent(SplitStringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

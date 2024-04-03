import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockModule, MockPipe } from 'ng-mocks';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsSplitStringPipe } from '@mintplayer/ng-bootstrap/split-string';

import { SplitStringComponent } from './split-string.component';

describe('SplitStringComponent', () => {
  let component: SplitStringComponent;
  let fixture: ComponentFixture<SplitStringComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        SplitStringComponent
      ],
      imports: [
        // Mock dependencies
        FormsModule,
        MockModule(BsFormModule),
        MockModule(BsGridModule),
        MockModule(BsListGroupModule),
        MockPipe(BsSplitStringPipe),
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

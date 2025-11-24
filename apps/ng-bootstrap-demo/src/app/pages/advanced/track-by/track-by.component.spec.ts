import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDirective, MockModule } from 'ng-mocks';
import { BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

import { TrackByComponent } from './track-by.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TrackByComponent', () => {
  let component: TrackByComponent;
  let fixture: ComponentFixture<TrackByComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MockModule(BsGridComponent, BsGridRowDirective),
        MockModule(BsListGroupComponent, BsListGroupItemComponent),
        MockDirective(BsButtonTypeDirective),
      ],
      declarations: [TrackByComponent]
    });
    fixture = TestBed.createComponent(TrackByComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule } from 'ng-mocks';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { TrackByComponent } from './track-by.component';

describe('TrackByComponent', () => {
  let component: TrackByComponent;
  let fixture: ComponentFixture<TrackByComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridModule),
        MockModule(BsTrackByModule),
        MockModule(BsListGroupModule),
        MockModule(BsButtonTypeModule),
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

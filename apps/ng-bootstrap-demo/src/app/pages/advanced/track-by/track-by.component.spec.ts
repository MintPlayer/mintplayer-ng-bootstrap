import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDirective, MockModule } from 'ng-mocks';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
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
        MockModule(BsGridModule),
        MockModule(BsListGroupModule),
        MockDirective(BsButtonTypeDirective),
        TrackByComponent,
      ]
    });
    fixture = TestBed.createComponent(TrackByComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

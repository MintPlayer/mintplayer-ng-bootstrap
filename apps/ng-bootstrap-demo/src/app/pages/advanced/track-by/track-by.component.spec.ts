import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackByComponent } from './track-by.component';

describe('TrackByComponent', () => {
  let component: TrackByComponent;
  let fixture: ComponentFixture<TrackByComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
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

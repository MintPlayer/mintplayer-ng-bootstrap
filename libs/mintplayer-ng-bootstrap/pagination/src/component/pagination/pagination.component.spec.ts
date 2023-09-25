import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { MockModule } from 'ng-mocks';

import { BsPaginationComponent } from './pagination.component';

describe('BsPaginationComponent', () => {
  let component: BsPaginationComponent;
  let fixture: ComponentFixture<BsPaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsTrackByModule),
      ],
      declarations: [ BsPaginationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsPaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

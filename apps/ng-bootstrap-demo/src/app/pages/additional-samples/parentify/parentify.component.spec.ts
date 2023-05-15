import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { MockModule } from 'ng-mocks';

import { ParentifyComponent } from './parentify.component';

describe('ParentifyComponent', () => {
  let component: ParentifyComponent;
  let fixture: ComponentFixture<ParentifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridModule)
      ],
      declarations: [ ParentifyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParentifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsGridComponent } from './grid.component';
import { MockModule } from 'ng-mocks';
import { BsContainerModule } from '@mintplayer/ng-bootstrap/container';

describe('BsGridComponent', () => {
  let component: BsGridComponent;
  let fixture: ComponentFixture<BsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsGridComponent],
      imports: [
        MockModule(BsContainerModule)
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BsGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

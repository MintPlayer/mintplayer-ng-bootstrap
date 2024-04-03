import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsGridComponent } from './grid.component';
import { MockComponent } from 'ng-mocks';
import { BsContainerComponent } from '@mintplayer/ng-bootstrap/container';

describe('BsGridComponent', () => {
  let component: BsGridComponent;
  let fixture: ComponentFixture<BsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsGridComponent],
      imports: [
        MockComponent(BsContainerComponent)
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

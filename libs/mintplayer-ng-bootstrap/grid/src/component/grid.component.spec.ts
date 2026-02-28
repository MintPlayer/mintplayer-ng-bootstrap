import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsGridComponent } from './grid.component';
import { MockComponent } from 'ng-mocks';
import { BsContainerComponent } from '@mintplayer/ng-bootstrap/container';

describe('BsGridComponent', () => {
  let component: BsGridComponent;
  let fixture: ComponentFixture<BsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsContainerComponent),
        BsGridComponent
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

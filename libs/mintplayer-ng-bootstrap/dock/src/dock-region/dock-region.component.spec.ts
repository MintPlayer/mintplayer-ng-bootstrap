import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDockRegionComponent } from './dock-region.component';

describe('BsDockRegionComponent', () => {
  let component: BsDockRegionComponent;
  let fixture: ComponentFixture<BsDockRegionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsDockRegionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsDockRegionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

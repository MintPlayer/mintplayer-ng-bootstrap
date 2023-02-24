import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDockContainerComponent } from './dock-container.component';

describe('BsDockContainerComponent', () => {
  let component: BsDockContainerComponent;
  let fixture: ComponentFixture<BsDockContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsDockContainerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsDockContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

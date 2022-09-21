import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsToastContainerComponent } from './toast-container.component';

describe('BsToastContainerComponent', () => {
  let component: BsToastContainerComponent;
  let fixture: ComponentFixture<BsToastContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsToastContainerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsToastContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

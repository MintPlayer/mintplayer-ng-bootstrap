import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlideUpDownComponent } from './slide-up-down.component';

describe('SlideUpDownComponent', () => {
  let component: SlideUpDownComponent;
  let fixture: ComponentFixture<SlideUpDownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SlideUpDownComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlideUpDownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

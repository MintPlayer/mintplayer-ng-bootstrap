import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsAlphaStripComponent } from './alpha-strip.component';

describe('BsAlphaStripComponent', () => {
  let component: BsAlphaStripComponent;
  let fixture: ComponentFixture<BsAlphaStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsAlphaStripComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsAlphaStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

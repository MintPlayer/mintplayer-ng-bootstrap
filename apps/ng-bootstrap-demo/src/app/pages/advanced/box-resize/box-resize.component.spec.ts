import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxResizeComponent } from './box-resize.component';

describe('BoxResizeComponent', () => {
  let component: BoxResizeComponent;
  let fixture: ComponentFixture<BoxResizeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BoxResizeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoxResizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

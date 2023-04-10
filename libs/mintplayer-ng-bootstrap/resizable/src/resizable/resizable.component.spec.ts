import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsResizableComponent } from './resizable.component';

describe('BsResizableComponent', () => {
  let component: BsResizableComponent;
  let fixture: ComponentFixture<BsResizableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsResizableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsResizableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsScrollspyComponent } from './scrollspy.component';

describe('ScrollspyComponent', () => {
  let component: BsScrollspyComponent;
  let fixture: ComponentFixture<BsScrollspyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsScrollspyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsScrollspyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

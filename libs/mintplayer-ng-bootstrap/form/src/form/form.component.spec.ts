import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsFormComponent } from './form.component';

describe('BsFormComponent', () => {
  let component: BsFormComponent;
  let fixture: ComponentFixture<BsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

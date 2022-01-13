import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdditionalSamplesComponent } from './additional-samples.component';

describe('AdditionalSamplesComponent', () => {
  let component: AdditionalSamplesComponent;
  let fixture: ComponentFixture<AdditionalSamplesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdditionalSamplesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdditionalSamplesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

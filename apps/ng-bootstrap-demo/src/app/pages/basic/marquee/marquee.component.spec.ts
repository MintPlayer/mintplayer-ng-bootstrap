import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarqueeComponent } from './marquee.component';

describe('MarqueeComponent', () => {
  let component: MarqueeComponent;
  let fixture: ComponentFixture<MarqueeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MarqueeComponent]
    });
    fixture = TestBed.createComponent(MarqueeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

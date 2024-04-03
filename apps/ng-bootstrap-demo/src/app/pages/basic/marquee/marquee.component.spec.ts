import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsMarqueeComponent } from '@mintplayer/ng-bootstrap/marquee';

import { MarqueeComponent } from './marquee.component';

describe('MarqueeComponent', () => {
  let component: MarqueeComponent;
  let fixture: ComponentFixture<MarqueeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        MockComponent(BsMarqueeComponent),
      ],
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

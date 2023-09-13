import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrustHtmlComponent } from './trust-html.component';

describe('TrustHtmlComponent', () => {
  let component: TrustHtmlComponent;
  let fixture: ComponentFixture<TrustHtmlComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TrustHtmlComponent]
    });
    fixture = TestBed.createComponent(TrustHtmlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

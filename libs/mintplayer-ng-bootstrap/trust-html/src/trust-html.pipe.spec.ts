import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTrustHtmlPipe } from './trust-html.pipe';

@Component({
  selector: 'bs-trust-html-test',
  standalone: true,
  imports: [BsTrustHtmlPipe],
  template: `<span [innerHTML]="html | bsTrustHtml"></span>`
})
class BsTrustHtmlTestComponent {
  html = '<b>test</b>';
}

describe('BsTrustHtmlPipe', () => {
  let component: BsTrustHtmlTestComponent;
  let fixture: ComponentFixture<BsTrustHtmlTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsTrustHtmlPipe,
        BsTrustHtmlTestComponent
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsTrustHtmlTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('create an instance', () => {
    expect(component).toBeTruthy();
  });
});

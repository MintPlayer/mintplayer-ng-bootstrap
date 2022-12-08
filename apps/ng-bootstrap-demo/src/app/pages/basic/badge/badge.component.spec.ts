import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Color } from '@mintplayer/ng-bootstrap';
import { BadgeComponent } from './badge.component';

@Component({
  selector: 'bs-badge',
  template: `<ng-content></ng-content>`
})
class BsBadgeMockComponent {
  @Input() type: Color = Color.primary;
}

describe('BadgeComponent', () => {
  let component: BadgeComponent;
  let fixture: ComponentFixture<BadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BadgeComponent,
      
        // Mock dependencies
        BsBadgeMockComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

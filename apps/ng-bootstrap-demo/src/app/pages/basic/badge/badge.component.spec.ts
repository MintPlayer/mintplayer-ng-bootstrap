import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { MockComponent } from 'ng-mocks';
import { BadgeComponent } from './badge.component';

describe('BadgeComponent', () => {
  let component: BadgeComponent;
  let fixture: ComponentFixture<BadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsBadgeComponent),
      ],
      declarations: [
        // Unit to test
        BadgeComponent,
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

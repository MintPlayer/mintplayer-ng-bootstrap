import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsBadgeTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { BadgeComponent } from './badge.component';

describe('BadgeComponent', () => {
  let component: BadgeComponent;
  let fixture: ComponentFixture<BadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsBadgeTestingModule,
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

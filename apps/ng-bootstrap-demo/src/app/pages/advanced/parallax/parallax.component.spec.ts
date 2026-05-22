import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsParallaxComponent } from '@mintplayer/ng-bootstrap/parallax';
import { ParallaxComponent } from './parallax.component';

describe('ParallaxComponent', () => {
  let component: ParallaxComponent;
  let fixture: ComponentFixture<ParallaxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ParallaxComponent,

        MockComponent(BsParallaxComponent)
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ParallaxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCloseTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { CloseComponent } from './close.component';

describe('CloseComponent', () => {
  let component: CloseComponent;
  let fixture: ComponentFixture<CloseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsCloseTestingModule,
      ],
      declarations: [
        // Unit to test
        CloseComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CloseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

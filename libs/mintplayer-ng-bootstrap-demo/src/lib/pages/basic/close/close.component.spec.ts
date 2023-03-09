import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCloseModule } from '@mintplayer/ng-bootstrap/close';
import { MockModule } from 'ng-mocks';
import { CloseComponent } from './close.component';

describe('CloseComponent', () => {
  let component: CloseComponent;
  let fixture: ComponentFixture<CloseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsCloseModule),
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridTestingModule, BsOffcanvasTestingModule } from '@mintplayer/ng-bootstrap/testing';

import { OffcanvasComponent } from './offcanvas.component';

describe('OffcanvasComponent', () => {
  let component: OffcanvasComponent;
  let fixture: ComponentFixture<OffcanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsGridTestingModule,
        BsOffcanvasTestingModule
      ],
      declarations: [
        // Unit to test
        OffcanvasComponent,
      ],
      providers: [
        { provide: 'GIT_REPO', useValue: 'https://github.com' },
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OffcanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

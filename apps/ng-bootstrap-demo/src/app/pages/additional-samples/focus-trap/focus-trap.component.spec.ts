import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsForModule } from '@mintplayer/ng-bootstrap/for';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsModalModule } from '@mintplayer/ng-bootstrap/modal';
import { MockModule } from 'ng-mocks';
import { FocusTrapComponent } from './focus-trap.component';

describe('FocusTrapComponent', () => {
  let component: FocusTrapComponent;
  let fixture: ComponentFixture<FocusTrapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsForModule),
        MockModule(BsFormModule),
        MockModule(BsGridModule),
        MockModule(BsModalModule),
        MockModule(BsButtonTypeModule),
      ],
      declarations: [
        // Unit to test
        FocusTrapComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FocusTrapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

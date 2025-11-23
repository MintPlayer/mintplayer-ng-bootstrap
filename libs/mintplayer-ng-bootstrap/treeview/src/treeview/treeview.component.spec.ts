import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { MockModule } from 'ng-mocks';
import { BsTreeviewComponent } from './treeview.component';

describe('BsTreeviewComponent', () => {
  let component: BsTreeviewComponent;
  let fixture: ComponentFixture<BsTreeviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MockModule(BsListGroupComponent, BsListGroupItemComponent)
      ],
      declarations: [BsTreeviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsTreeviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

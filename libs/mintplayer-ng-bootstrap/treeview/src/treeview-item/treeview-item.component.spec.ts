import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockModule, MockProvider } from 'ng-mocks';
import { BsTreeviewItemComponent } from './treeview-item.component';
import { BsTreeviewComponent } from '../treeview/treeview.component';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';

describe('BsTreeviewItemComponent', () => {
  let component: BsTreeviewItemComponent;
  let fixture: ComponentFixture<BsTreeviewItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsListGroupModule)
      ],
      declarations: [
        MockComponent(BsTreeviewComponent),
        BsTreeviewItemComponent
      ],
      providers: [
        MockProvider(BsTreeviewComponent)
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BsTreeviewItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

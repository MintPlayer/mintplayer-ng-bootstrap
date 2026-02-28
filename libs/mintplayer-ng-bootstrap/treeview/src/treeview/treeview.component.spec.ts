import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockComponent } from 'ng-mocks';
import { BsTreeviewComponent } from './treeview.component';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';

describe('BsTreeviewComponent', () => {
  let component: BsTreeviewComponent;
  let fixture: ComponentFixture<BsTreeviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MockComponent(BsListGroupComponent), MockComponent(BsListGroupItemComponent),
        BsTreeviewComponent
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BsTreeviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

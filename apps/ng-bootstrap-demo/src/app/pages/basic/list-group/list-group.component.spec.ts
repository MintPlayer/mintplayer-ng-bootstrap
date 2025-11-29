import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { MockModule } from 'ng-mocks';
import { ListGroupComponent } from './list-group.component';

describe('ListGroupComponent', () => {
  let component: ListGroupComponent;
  let fixture: ComponentFixture<ListGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsListGroupModule),
        ListGroupComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ListGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

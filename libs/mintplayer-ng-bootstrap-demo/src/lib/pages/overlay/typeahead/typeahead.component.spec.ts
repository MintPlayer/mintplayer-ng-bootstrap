import { JsonPipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTypeaheadModule } from '@mintplayer/ng-bootstrap/typeahead';
import { MockModule } from 'ng-mocks';
import { TypeaheadComponent } from './typeahead.component';


describe('TypeaheadComponent', () => {
  let component: TypeaheadComponent;
  let fixture: ComponentFixture<TypeaheadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsTypeaheadModule),
      ],
      declarations: [
        // Unit to test
        TypeaheadComponent,
      ],
      providers: [JsonPipe]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TypeaheadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

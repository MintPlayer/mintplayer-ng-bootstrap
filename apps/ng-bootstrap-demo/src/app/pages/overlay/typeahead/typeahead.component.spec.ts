import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TypeaheadComponent } from './typeahead.component';

@Pipe({
  name: 'json'
})
class JsonMockPipe implements PipeTransform {
  transform(value: any, ...args: any[]) {
    return 'json';
  }
}

describe('TypeaheadComponent', () => {
  let component: TypeaheadComponent;
  let fixture: ComponentFixture<TypeaheadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        TypeaheadComponent,
      ],
      providers: [
        // Mock dependencies
        JsonMockPipe
      ]
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

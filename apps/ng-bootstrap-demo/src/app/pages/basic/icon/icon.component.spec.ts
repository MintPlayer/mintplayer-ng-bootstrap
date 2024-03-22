import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IconComponent } from './icon.component';
import { MockModule } from 'ng-mocks';
import { BsCodeSnippetModule } from '@mintplayer/ng-bootstrap/code-snippet';

describe('IconComponent', () => {
  let component: IconComponent;
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IconComponent],
      imports: [
        MockModule(BsCodeSnippetModule),
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(IconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsDockModule } from '@mintplayer/ng-bootstrap/dock';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';

import { DockComponent } from './dock.component';

describe('DockComponent', () => {
  let component: DockComponent;
  let fixture: ComponentFixture<DockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsDockModule),
        MockComponent(BsBadgeComponent),
        MockDirective(BsButtonTypeDirective)
      ],
      declarations: [ DockComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

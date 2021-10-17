import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Color } from '@mintplayer/ng-bootstrap';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Component to test
        AppComponent,
      
        // Mock components
        BsNavbarMockComponent,
        BsAlertMockComponent,
        BsAlertCloseMockComponent,
        BsCardMockComponent,
        BsCardHeaderMockComponent,
        BsListGroupMockComponent,
        BsListGroupItemMockComponent,
        BsCalendarMockComponent,
        BsAccordionMockComponent,
        BsAccordionTabMockComponent,
        BsAccordionTabHeaderMockComponent,
        BsTabControlMockComponent,
        BsTabPageMockComponent,
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'ng-bootstrap-demo'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('ng-bootstrap-demo');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Welcome to ng-bootstrap-demo!'
    );
  });
});


@Component({
  selector: 'bs-navbar',
  template: 'navbar works'
})
class BsNavbarMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-alert',
  template: 'alert works'
})
class BsAlertMockComponent {
  constructor() {
  }
  
  @Input() public type: Color = Color.primary;
}

@Component({
  selector: 'bs-alert-close',
  template: 'alert-close works'
})
class BsAlertCloseMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-card',
  template: 'card works'
})
class BsCardMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-card-header',
  template: 'card-header works'
})
class BsCardHeaderMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-list-group',
  template: 'list-group works'
})
class BsListGroupMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-list-group-item',
  template: 'list-group-item works'
})
class BsListGroupItemMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-calendar',
  template: 'calendar works'
})
class BsCalendarMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-accordion',
  template: 'accordion works'
})
class BsAccordionMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-accordion-tab',
  template: 'accordion-tab works'
})
class BsAccordionTabMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-accordion-tab-header',
  template: 'accordion-tab-header works'
})
class BsAccordionTabHeaderMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-tab-control',
  template: 'tab-control works'
})
class BsTabControlMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-tab-page',
  template: 'tab-page works'
})
class BsTabPageMockComponent {
  constructor() {
  }
  
  @Input() disabled: boolean = false;
}
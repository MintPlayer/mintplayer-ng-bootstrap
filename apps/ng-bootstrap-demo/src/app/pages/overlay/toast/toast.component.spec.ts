import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToastComponent] }).compileComponents();
    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('queues a toast and renders it in the toaster', () => {
    component.addToast('Saved');
    fixture.detectChanges();
    expect(component.toasts.toasts.map((t) => t.data)).toEqual(['Saved']);
    const toast = (fixture.nativeElement as HTMLElement).querySelector('bs-toaster .toast-body');
    expect(toast?.textContent?.trim()).toBe('Saved');
  });
});

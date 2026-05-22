import type { Direction, ResizeOperation } from '../types';
import { ResizeState } from '../types';

export interface SplitterState {
  orientation: Direction;
  panelSizes: number[];
  previewSizes: number[] | null;
  resizeOperation: ResizeOperation | null;
}

export type SplitterStateListener = (state: SplitterState) => void;

export class SplitterStateManager {
  private state: SplitterState;
  private listeners: Set<SplitterStateListener> = new Set();

  constructor(initialState?: Partial<SplitterState>) {
    this.state = {
      orientation: 'horizontal',
      panelSizes: [],
      previewSizes: null,
      resizeOperation: null,
      ...initialState,
    };
  }

  getState(): SplitterState {
    return { ...this.state };
  }

  subscribe(listener: SplitterStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const stateCopy = this.getState();
    for (const listener of this.listeners) {
      listener(stateCopy);
    }
  }

  setOrientation(orientation: Direction): void {
    if (this.state.orientation !== orientation) {
      this.state = { ...this.state, orientation };
      this.notifyListeners();
    }
  }

  setPanelSizes(sizes: number[]): void {
    this.state = { ...this.state, panelSizes: [...sizes] };
    this.notifyListeners();
  }

  setPreviewSizes(sizes: number[] | null): void {
    this.state = { ...this.state, previewSizes: sizes ? [...sizes] : null };
    this.notifyListeners();
  }

  startResize(operation: ResizeOperation): void {
    this.state = {
      ...this.state,
      resizeOperation: { ...operation },
    };
    this.notifyListeners();
  }

  updateResize(previewSizes: number[]): void {
    this.state = {
      ...this.state,
      previewSizes: [...previewSizes],
    };
    this.notifyListeners();
  }

  endResize(finalSizes: number[]): void {
    this.state = {
      ...this.state,
      panelSizes: [...finalSizes],
      previewSizes: null,
      resizeOperation: null,
    };
    this.notifyListeners();
  }

  cancelResize(): void {
    this.state = {
      ...this.state,
      previewSizes: null,
      resizeOperation: null,
    };
    this.notifyListeners();
  }

  isResizing(): boolean {
    return this.state.resizeOperation?.state === ResizeState.Resizing;
  }
}

import type { Direction, Point, ResizeOperation } from '../types';
import { ResizeState } from '../types';

export interface ResizeManagerOptions {
  minPanelSize?: number;
}

export class ResizeManager {
  private options: Required<ResizeManagerOptions>;

  constructor(options: ResizeManagerOptions = {}) {
    this.options = {
      minPanelSize: options.minPanelSize ?? 50,
    };
  }

  computePanelSizes(
    panels: HTMLElement[],
    orientation: Direction
  ): number[] {
    return panels.map((panel) => {
      const rect = panel.getBoundingClientRect();
      return orientation === 'horizontal' ? rect.width : rect.height;
    });
  }

  createResizeOperation(
    startPoint: Point,
    currentSizes: number[],
    dividerIndex: number,
    dividerElement: HTMLElement
  ): ResizeOperation {
    return {
      state: ResizeState.Resizing,
      startPosition: { ...startPoint },
      sizes: [...currentSizes],
      indexBefore: dividerIndex,
      indexAfter: dividerIndex + 1,
      dividerElement,
    };
  }

  calculatePreviewSizes(
    operation: ResizeOperation,
    currentPoint: Point,
    orientation: Direction
  ): number[] {
    const { startPosition, sizes, indexBefore, indexAfter } = operation;
    const delta =
      orientation === 'horizontal'
        ? currentPoint.x - startPosition.x
        : currentPoint.y - startPosition.y;

    const newSizes = [...sizes];
    const sizeBefore = sizes[indexBefore];
    const sizeAfter = sizes[indexAfter];

    let newSizeBefore = sizeBefore + delta;
    let newSizeAfter = sizeAfter - delta;

    // Apply minimum size constraints
    if (newSizeBefore < this.options.minPanelSize) {
      const adjustment = this.options.minPanelSize - newSizeBefore;
      newSizeBefore = this.options.minPanelSize;
      newSizeAfter -= adjustment;
    }

    if (newSizeAfter < this.options.minPanelSize) {
      const adjustment = this.options.minPanelSize - newSizeAfter;
      newSizeAfter = this.options.minPanelSize;
      newSizeBefore -= adjustment;
    }

    // Final clamp
    newSizeBefore = Math.max(newSizeBefore, this.options.minPanelSize);
    newSizeAfter = Math.max(newSizeAfter, this.options.minPanelSize);

    newSizes[indexBefore] = newSizeBefore;
    newSizes[indexAfter] = newSizeAfter;

    return newSizes;
  }

  setMinPanelSize(size: number): void {
    this.options.minPanelSize = size;
  }

  getMinPanelSize(): number {
    return this.options.minPanelSize;
  }
}

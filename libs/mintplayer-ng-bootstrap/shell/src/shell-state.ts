export type BsShellState = 'auto' | 'show' | 'hide';

/** Payload of `(statechange)`: whether the sidebar is now open. */
export interface BsShellStateChange {
  open: boolean;
}

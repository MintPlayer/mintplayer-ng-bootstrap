export const splitterStyles = `
:host {
  display: block;
  width: 100%;
  height: 100%;

  --mp-splitter-size: 8px;
  --mp-splitter-thumb-margin: 3px;
  --mp-splitter-divider-color: #eee;
  --mp-splitter-divider-hover-color: #1389fd;
}

:host([touch-mode]) {
  --mp-splitter-thumb-margin: 20px;
}

* {
  box-sizing: border-box;
}

.splitter-container {
  display: flex;
  width: 100%;
  height: 100%;
}

.splitter-container.horizontal {
  flex-direction: row;
}

.splitter-container.vertical {
  flex-direction: column;
}

.panel-wrapper {
  overflow: hidden;
  position: relative;
  flex-grow: 1;
}

/* Divider base styles */
.divider {
  flex-shrink: 0;
  transition: background-color 0.15s ease-in-out;
  z-index: 3;
  touch-action: none;
}

.divider::before {
  content: "";
  display: block;
  background-color: var(--mp-splitter-divider-color);
  background-position: center center;
  background-repeat: no-repeat;
}

.divider:hover::before,
.divider.active::before {
  background-color: var(--mp-splitter-divider-hover-color);
  border-radius: calc(var(--mp-splitter-size) / 2);
}

/* Horizontal splitter styles */
.splitter-container.horizontal > .divider {
  width: calc(var(--mp-splitter-size) + 2 * var(--mp-splitter-thumb-margin));
  height: 100%;
  cursor: col-resize;
  border-left: var(--mp-splitter-thumb-margin) solid transparent;
  border-right: var(--mp-splitter-thumb-margin) solid transparent;
}

.splitter-container.horizontal > .divider::before {
  height: 100%;
  width: var(--mp-splitter-size);
  margin: 0 auto;
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==);
}

.splitter-container.horizontal > .panel-wrapper:not(:first-child) {
  margin-left: calc(-1 * var(--mp-splitter-thumb-margin));
}

.splitter-container.horizontal > .panel-wrapper:not(:last-child) {
  margin-right: calc(-1 * var(--mp-splitter-thumb-margin));
}

/* Vertical splitter styles */
.splitter-container.vertical > .divider {
  width: 100%;
  height: calc(var(--mp-splitter-size) + 2 * var(--mp-splitter-thumb-margin));
  cursor: row-resize;
  border-top: var(--mp-splitter-thumb-margin) solid transparent;
  border-bottom: var(--mp-splitter-thumb-margin) solid transparent;
}

.splitter-container.vertical > .divider::before {
  height: var(--mp-splitter-size);
  width: 100%;
  margin: auto 0;
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFCAMAAABl/6zIAAAABlBMVEUAAADMzMzIT8AyAAAAAXRSTlMAQObYZgAAABRJREFUeAFjYGRkwIMJSeMHlBkOABP7AEGzSuPKAAAAAElFTkSuQmCC);
}

.splitter-container.vertical > .panel-wrapper:not(:first-child) {
  margin-top: calc(-1 * var(--mp-splitter-thumb-margin));
}

.splitter-container.vertical > .panel-wrapper:not(:last-child) {
  margin-bottom: calc(-1 * var(--mp-splitter-thumb-margin));
}

/* Resizing state */
:host([resizing]) .splitter-container {
  cursor: col-resize;
  user-select: none;
}

:host([resizing]) .splitter-container.vertical {
  cursor: row-resize;
}

/* Slot content styling */
::slotted(*) {
  width: 100%;
  height: 100%;
}
`;

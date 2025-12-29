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
}

.panel-wrapper.flex-grow {
  flex-grow: 1;
}

/* Divider base styles */
.divider {
  flex-shrink: 0;
  transition: background-color 0.15s ease-in-out;
  z-index: 3;
  position: relative;
  touch-action: none;
}

.divider::before {
  content: "";
  display: block;
  background-color: var(--mp-splitter-divider-color);
  background-position: center center;
  background-repeat: no-repeat;
  position: absolute;
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
}

.splitter-container.horizontal > .divider::before {
  height: 100%;
  width: var(--mp-splitter-size);
  left: var(--mp-splitter-thumb-margin);
  top: 0;
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==);
}

/* Vertical splitter styles */
.splitter-container.vertical > .divider {
  width: 100%;
  height: calc(var(--mp-splitter-size) + 2 * var(--mp-splitter-thumb-margin));
  cursor: row-resize;
}

.splitter-container.vertical > .divider::before {
  width: 100%;
  height: var(--mp-splitter-size);
  top: var(--mp-splitter-thumb-margin);
  left: 0;
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFCAMAAABl/6zIAAAABlBMVEUAAADMzMzIT8AyAAAAAXRSTlMAQObYZgAAABRJREFUeAFjYGRkwIMJSeMHlBkOABP7AEGzSuPKAAAAAElFTkSuQmCC);
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

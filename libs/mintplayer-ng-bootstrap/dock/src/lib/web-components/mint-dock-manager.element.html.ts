export const dockManagerHtml = `
  <div class="dock-root">
    <div class="dock-docked"></div>
    <div class="dock-floating-layer"></div>
  </div>
  <div class="dock-drop-indicator"></div>
  <div class="dock-drop-joystick" data-visible="false">
    <div class="dock-drop-joystick__spacer"></div>
    <button
      class="dock-drop-joystick__button"
      type="button"
      data-zone="top"
      aria-label="Dock to top"
    >
      ↑
    </button>
    <div class="dock-drop-joystick__spacer"></div>
    <button
      class="dock-drop-joystick__button"
      type="button"
      data-zone="left"
      aria-label="Dock to left"
    >
      ←
    </button>
    <button
      class="dock-drop-joystick__button"
      type="button"
      data-zone="center"
      aria-label="Dock to center"
    >
      •
    </button>
    <button
      class="dock-drop-joystick__button"
      type="button"
      data-zone="right"
      aria-label="Dock to right"
    >
      →
    </button>
    <div class="dock-drop-joystick__spacer"></div>
    <button
      class="dock-drop-joystick__button"
      type="button"
      data-zone="bottom"
      aria-label="Dock to bottom"
    >
      ↓
    </button>
    <div class="dock-drop-joystick__spacer"></div>
  </div>
`;


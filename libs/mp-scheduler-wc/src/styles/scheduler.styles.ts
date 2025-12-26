/**
 * Scheduler CSS styles as a template literal
 */
export const schedulerStyles = `
  :host {
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    font-size: 14px;
    --scheduler-border-color: #ddd;
    --scheduler-header-bg: #f8f9fa;
    --scheduler-today-bg: #fff3cd;
    --scheduler-slot-height: 40px;
    --scheduler-time-gutter-width: 60px;
    --scheduler-event-border-radius: 4px;
    --scheduler-now-indicator-color: #dc3545;
    --scheduler-preview-bg: rgba(0, 123, 255, 0.3);
    --scheduler-greyed-slot-bg: rgba(0, 0, 0, 0.1);
  }

  * {
    box-sizing: border-box;
  }

  .scheduler-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid var(--scheduler-border-color);
    border-radius: 4px;
    overflow: hidden;
    background: #fff;
  }

  /* Header */
  .scheduler-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--scheduler-header-bg);
    border-bottom: 1px solid var(--scheduler-border-color);
    flex-shrink: 0;
  }

  .scheduler-nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .scheduler-nav button {
    padding: 6px 12px;
    border: 1px solid var(--scheduler-border-color);
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    font-size: 14px;
  }

  .scheduler-nav button:hover {
    background: #e9ecef;
  }

  .scheduler-title {
    font-size: 18px;
    font-weight: 600;
  }

  .scheduler-view-switcher {
    display: flex;
    gap: 4px;
  }

  .scheduler-view-switcher button {
    padding: 6px 12px;
    border: 1px solid var(--scheduler-border-color);
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    font-size: 13px;
  }

  .scheduler-view-switcher button:hover {
    background: #e9ecef;
  }

  .scheduler-view-switcher button.active {
    background: #0d6efd;
    color: #fff;
    border-color: #0d6efd;
  }

  /* Main content area */
  .scheduler-body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .scheduler-sidebar {
    width: var(--scheduler-time-gutter-width);
    flex-shrink: 0;
    border-right: 1px solid var(--scheduler-border-color);
    background: var(--scheduler-header-bg);
  }

  .scheduler-content {
    flex: 1;
    overflow: auto;
    position: relative;
  }

  /* Week/Day View Grid */
  .scheduler-grid {
    display: grid;
    min-width: 100%;
  }

  .scheduler-day-headers {
    display: flex;
    border-bottom: 1px solid var(--scheduler-border-color);
    background: var(--scheduler-header-bg);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .scheduler-day-header {
    flex: 1;
    text-align: center;
    padding: 8px 4px;
    border-right: 1px solid var(--scheduler-border-color);
    font-weight: 500;
  }

  .scheduler-day-header:last-child {
    border-right: none;
  }

  .scheduler-day-header.today {
    background: var(--scheduler-today-bg);
  }

  .scheduler-day-header .day-name {
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
  }

  .scheduler-day-header .day-number {
    font-size: 20px;
    font-weight: 600;
    margin-top: 2px;
  }

  .scheduler-time-grid {
    display: flex;
    position: relative;
  }

  .scheduler-time-gutter {
    width: var(--scheduler-time-gutter-width);
    flex-shrink: 0;
    border-right: 1px solid var(--scheduler-border-color);
    background: var(--scheduler-header-bg);
  }

  .scheduler-time-slot-label {
    height: var(--scheduler-slot-height);
    padding: 0 8px;
    font-size: 12px;
    color: #666;
    text-align: right;
    position: relative;
    top: -8px;
  }

  .scheduler-days-container {
    display: flex;
    flex: 1;
    position: relative;
  }

  .scheduler-day-column {
    flex: 1;
    position: relative;
    border-right: 1px solid var(--scheduler-border-color);
  }

  .scheduler-day-column:last-child {
    border-right: none;
  }

  .scheduler-time-slot {
    height: var(--scheduler-slot-height);
    border-bottom: 1px solid #eee;
    position: relative;
  }

  .scheduler-time-slot:nth-child(2n) {
    border-bottom-color: var(--scheduler-border-color);
  }

  .scheduler-time-slot.greyed {
    background: var(--scheduler-greyed-slot-bg);
  }

  /* Events */
  .scheduler-events-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .scheduler-event {
    position: absolute;
    border-radius: var(--scheduler-event-border-radius);
    padding: 2px 4px;
    font-size: 12px;
    overflow: hidden;
    cursor: pointer;
    pointer-events: auto;
    border-left: 3px solid rgba(0, 0, 0, 0.2);
  }

  .scheduler-event:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .scheduler-event.selected {
    box-shadow: 0 0 0 3px #212529;
  }

  .scheduler-event .event-title {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .scheduler-event .event-time {
    font-size: 11px;
    opacity: 0.8;
  }

  .scheduler-event.preview {
    background: var(--scheduler-preview-bg);
    border: 2px dashed #0d6efd;
    pointer-events: none;
  }

  /* Resize handles */
  .scheduler-event .resize-handle {
    position: absolute;
    left: 0;
    right: 0;
    height: 8px;
    cursor: ns-resize;
  }

  .scheduler-event .resize-handle.top {
    top: 0;
  }

  .scheduler-event .resize-handle.bottom {
    bottom: 0;
  }

  /* Now indicator */
  .scheduler-now-indicator {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--scheduler-now-indicator-color);
    z-index: 5;
    pointer-events: none;
  }

  .scheduler-now-indicator::before {
    content: '';
    position: absolute;
    left: -4px;
    top: -4px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--scheduler-now-indicator-color);
  }

  /* Month View */
  .scheduler-month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-auto-rows: minmax(100px, 1fr);
    height: 100%;
  }

  .scheduler-month-day {
    border-right: 1px solid var(--scheduler-border-color);
    border-bottom: 1px solid var(--scheduler-border-color);
    padding: 4px;
    overflow: hidden;
  }

  .scheduler-month-day:nth-child(7n) {
    border-right: none;
  }

  .scheduler-month-day.other-month {
    background: #f8f9fa;
    color: #adb5bd;
  }

  .scheduler-month-day.today {
    background: var(--scheduler-today-bg);
  }

  .scheduler-month-day .day-number {
    font-weight: 500;
    margin-bottom: 4px;
  }

  .scheduler-month-day .month-events {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .scheduler-month-event {
    padding: 2px 4px;
    border-radius: 2px;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .scheduler-more-link {
    font-size: 11px;
    color: #0d6efd;
    cursor: pointer;
    margin-top: 2px;
  }

  /* Year View */
  .scheduler-year-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    padding: 16px;
  }

  .scheduler-year-month {
    border: 1px solid var(--scheduler-border-color);
    border-radius: 4px;
    overflow: hidden;
  }

  .scheduler-year-month-header {
    padding: 8px;
    background: var(--scheduler-header-bg);
    font-weight: 600;
    text-align: center;
    cursor: pointer;
  }

  .scheduler-year-month-header:hover {
    background: #e9ecef;
  }

  .scheduler-mini-month {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    padding: 4px;
  }

  .scheduler-mini-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    cursor: pointer;
    border-radius: 50%;
  }

  .scheduler-mini-day:hover {
    background: #e9ecef;
  }

  .scheduler-mini-day.has-events {
    font-weight: 600;
  }

  .scheduler-mini-day.has-events::after {
    content: '';
    position: absolute;
    bottom: 2px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #0d6efd;
  }

  .scheduler-mini-day.today {
    background: var(--scheduler-today-bg);
  }

  .scheduler-mini-day.other-month {
    color: #adb5bd;
  }

  /* Timeline View */
  .scheduler-timeline {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .scheduler-timeline-header {
    display: flex;
    border-bottom: 1px solid var(--scheduler-border-color);
    background: var(--scheduler-header-bg);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .scheduler-resource-header {
    width: 200px;
    flex-shrink: 0;
    padding: 8px;
    border-right: 1px solid var(--scheduler-border-color);
    font-weight: 600;
  }

  .scheduler-timeline-slots-header {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .scheduler-timeline-slot-header {
    flex-shrink: 0;
    padding: 8px;
    text-align: center;
    border-right: 1px solid var(--scheduler-border-color);
    font-size: 12px;
  }

  .scheduler-timeline-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: auto;
  }

  .scheduler-timeline-row {
    display: flex;
    border-bottom: 1px solid var(--scheduler-border-color);
    min-height: 40px;
  }

  .scheduler-timeline-row.group {
    background: var(--scheduler-header-bg);
    font-weight: 600;
  }

  .scheduler-resource-cell {
    width: 200px;
    flex-shrink: 0;
    padding: 8px;
    border-right: 1px solid var(--scheduler-border-color);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .scheduler-resource-cell .expand-toggle {
    cursor: pointer;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .scheduler-timeline-slots {
    display: flex;
    flex: 1;
    position: relative;
  }

  .scheduler-timeline-slot {
    flex-shrink: 0;
    border-right: 1px solid #eee;
    height: 100%;
  }

  .scheduler-timeline-slot.greyed {
    background: var(--scheduler-greyed-slot-bg);
  }

  .scheduler-timeline-events {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .scheduler-timeline-event {
    position: absolute;
    height: calc(100% - 4px);
    top: 2px;
    border-radius: var(--scheduler-event-border-radius);
    padding: 2px 6px;
    font-size: 12px;
    overflow: hidden;
    cursor: pointer;
    pointer-events: auto;
  }

  .scheduler-timeline-event.selected {
    box-shadow: 0 0 0 3px #212529;
  }

  /* Loading state */
  .scheduler-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #666;
  }

  /* Empty state */
  .scheduler-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #666;
    font-style: italic;
  }

  /* Scrollbar styling */
  .scheduler-content::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .scheduler-content::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .scheduler-content::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }

  .scheduler-content::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }
`;

export default schedulerStyles;

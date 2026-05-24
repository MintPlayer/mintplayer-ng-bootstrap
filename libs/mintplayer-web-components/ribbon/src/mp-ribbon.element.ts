import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { LiveAnnouncerController } from '@mintplayer/web-components/a11y';
import type { RibbonGroupSize, RibbonReduceStep } from './mp-ribbon-tab.element';

type RibbonItemSize = 'large' | 'medium' | 'small';

interface TabEntry {
  tabId: string;
  label: string;
  element: HTMLElement;
  contextualColor?: string;
  contextualSetLabel?: string;
}

interface KeyTipBadge {
  tip: string;
  target: HTMLElement;
  rect: { left: number; top: number };
}

interface ContextualSetEntry {
  label: string;
  color: string;
  tabIds: string[];
}

/**
 * mp-ribbon — Microsoft Office–style Ribbon web component.
 *
 * Manages a tab strip with groupable items, overflow behavior, sizing,
 * contextual tabs, Quick Access Toolbar, and KeyTips.
 *
 * Phase 1: Core WC structure + tab strip navigation (roving tabindex, arrow keys)
 */
export class MpRibbon extends LitElement {
  static override styles = css`
    :host {
      display: block;
      /* Tell the UA to pick the right scheme for native form controls
         inside the ribbon (selects, color inputs, etc). */
      color-scheme: light dark;
      /* ---- Default tokens (neutral, Bootstrap-anchored) ---- */
      --bs-ribbon-app-accent: var(--bs-primary, #0d6efd);
      --bs-ribbon-app-accent-on-dark:
        color-mix(in oklab, var(--bs-ribbon-app-accent) 55%, white 45%);
      --bs-ribbon-font-family: inherit;
      --bs-ribbon-container-bg: var(--bs-body-bg, #fafafa);
      --bs-ribbon-container-border: var(--bs-border-color, #e0e0e0);
      --bs-ribbon-tabstrip-bg: var(--bs-tertiary-bg, #f5f5f5);
      --bs-ribbon-tabstrip-border: var(--bs-border-color, #d0d0d0);
      --bs-ribbon-tab-idle-color: inherit;
      --bs-ribbon-tab-hover-bg: var(--bs-secondary-bg, #f0f0f0);
      --bs-ribbon-tab-active-bg: transparent;
      --bs-ribbon-tab-active-color: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-active-indicator-color: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-active-indicator-width: 2px;
      --bs-ribbon-tab-radius: 0;
      --bs-ribbon-tab-padding: 10px 16px;
      --bs-ribbon-tabpanel-bg: var(--bs-body-bg, #fff);
      --bs-ribbon-group-separator: var(--bs-border-color, #e0e0e0);
      --bs-ribbon-group-separator-inset: 0px;
      --bs-ribbon-group-label-color: var(--bs-secondary-color, #6c757d);
      --bs-ribbon-item-hover-bg: var(--bs-secondary-bg, #e9ecef);
      --bs-ribbon-item-hover-border: var(--bs-border-color, #ced4da);
      --bs-ribbon-item-pressed-bg: var(--bs-secondary-bg, #dee2e6);
      --bs-ribbon-item-radius: 3px;
    }

    /* ---- Office 2007: glossy blue gradient, honey hover ---- */
    :host([version="office-2007"]) {
      --bs-ribbon-font-family: "Segoe UI", Tahoma, sans-serif;
      --bs-ribbon-container-bg: linear-gradient(#F4F8FD, #DCE7F5);
      --bs-ribbon-container-border: #5C85B6;
      --bs-ribbon-tabstrip-bg: linear-gradient(#C7DEFD, #A4C5F4);
      --bs-ribbon-tabstrip-border: #5C85B6;
      --bs-ribbon-tab-idle-color: #1F3A5F;
      --bs-ribbon-tab-hover-bg: linear-gradient(#FFE8A1, #FFC759);
      --bs-ribbon-tab-active-bg: linear-gradient(#F4F8FD, #DCE7F5);
      --bs-ribbon-tab-active-color: #1F3A5F;
      --bs-ribbon-tab-active-indicator-color: transparent;
      --bs-ribbon-tab-active-indicator-width: 0px;
      --bs-ribbon-tab-radius: 6px 6px 0 0;
      --bs-ribbon-tabpanel-bg: linear-gradient(#F4F8FD, #DCE7F5);
      --bs-ribbon-group-separator: rgba(0, 0, 0, 0.18);
      --bs-ribbon-group-separator-inset: 0px;
      --bs-ribbon-group-label-color: #3B5A82;
      --bs-ribbon-item-hover-bg: linear-gradient(#FFE8A1, #FFC759);
      --bs-ribbon-item-hover-border: #D9A03C;
      --bs-ribbon-item-pressed-bg: linear-gradient(#F5B23A, #E08A1A);
      --bs-ribbon-item-radius: 2px;
    }

    /* ---- Office 2010: neutral silver, soft cream hover ---- */
    :host([version="office-2010"]) {
      --bs-ribbon-font-family: "Segoe UI", Calibri, sans-serif;
      --bs-ribbon-container-bg: #F2F4F6;
      --bs-ribbon-container-border: #B8BDC2;
      --bs-ribbon-tabstrip-bg: linear-gradient(#E8ECEF, #D6DBE0);
      --bs-ribbon-tabstrip-border: #B8BDC2;
      --bs-ribbon-tab-idle-color: #2D2D2D;
      --bs-ribbon-tab-hover-bg: linear-gradient(#FFF6D8, #FFEAB0);
      --bs-ribbon-tab-active-bg: #F2F4F6;
      --bs-ribbon-tab-active-color: #2D2D2D;
      --bs-ribbon-tab-active-indicator-color: transparent;
      --bs-ribbon-tab-active-indicator-width: 0px;
      --bs-ribbon-tab-radius: 0;
      --bs-ribbon-tabpanel-bg: #F2F4F6;
      --bs-ribbon-group-separator: #C8CDD2;
      --bs-ribbon-group-separator-inset: 0px;
      --bs-ribbon-group-label-color: #5E6770;
      --bs-ribbon-item-hover-bg: #FFEFB7;
      --bs-ribbon-item-hover-border: #E8C46A;
      --bs-ribbon-item-pressed-bg: #F5DC8A;
      --bs-ribbon-item-radius: 2px;
    }

    /* ---- Office 2013: flat white panel, app-tinted strip ---- */
    :host([version="office-2013"]) {
      --bs-ribbon-app-accent: #2B579A;
      --bs-ribbon-font-family: "Segoe UI", sans-serif;
      --bs-ribbon-container-bg: #FFFFFF;
      --bs-ribbon-container-border: #D2D2D2;
      --bs-ribbon-tabstrip-bg: color-mix(
        in srgb,
        var(--bs-ribbon-app-accent) 18%,
        #FFFFFF
      );
      --bs-ribbon-tabstrip-border: color-mix(
        in srgb,
        var(--bs-ribbon-app-accent) 40%,
        #FFFFFF
      );
      --bs-ribbon-tab-idle-color: #444;
      --bs-ribbon-tab-hover-bg: rgba(0, 0, 0, 0.04);
      --bs-ribbon-tab-active-bg: #FFFFFF;
      --bs-ribbon-tab-active-color: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-active-indicator-color: transparent;
      --bs-ribbon-tab-active-indicator-width: 0px;
      --bs-ribbon-tab-radius: 0;
      --bs-ribbon-tabpanel-bg: #FFFFFF;
      --bs-ribbon-group-separator: #D2D2D2;
      --bs-ribbon-group-separator-inset: 8px;
      --bs-ribbon-group-label-color: #666;
      --bs-ribbon-item-hover-bg: #EAEAEA;
      --bs-ribbon-item-hover-border: transparent;
      --bs-ribbon-item-pressed-bg: #D6D6D6;
      --bs-ribbon-item-radius: 0;
    }

    /* ---- Office 2016: full app-accent strip, white panel ---- */
    :host([version="office-2016"]) {
      --bs-ribbon-app-accent: #2B579A;
      --bs-ribbon-font-family: "Segoe UI", sans-serif;
      --bs-ribbon-container-bg: #FFFFFF;
      --bs-ribbon-container-border: #D2D2D2;
      --bs-ribbon-tabstrip-bg: var(--bs-ribbon-app-accent);
      --bs-ribbon-tabstrip-border: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.85);
      --bs-ribbon-tab-hover-bg: rgba(255, 255, 255, 0.15);
      --bs-ribbon-tab-active-bg: #FFFFFF;
      --bs-ribbon-tab-active-color: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-active-indicator-color: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-active-indicator-width: 2px;
      --bs-ribbon-tab-radius: 0;
      --bs-ribbon-tabpanel-bg: #FFFFFF;
      --bs-ribbon-group-separator: #D2D2D2;
      --bs-ribbon-group-separator-inset: 8px;
      --bs-ribbon-group-label-color: #666;
      --bs-ribbon-item-hover-bg: #E6E6E6;
      --bs-ribbon-item-hover-border: transparent;
      --bs-ribbon-item-pressed-bg: #CCCCCC;
      --bs-ribbon-item-radius: 0;
    }

    /* ============================================================
       DARK MODE
       office-2013 → "Dark Gray" (Microsoft-shipped)
       office-2016 → "Black" (Microsoft-shipped)
       office-2007 → reconstructed from the original Black colour scheme
       office-2010 → reconstructed from the original Black colour scheme
       Each block exists twice: once for explicit [colorScheme]="dark"
       and once under @media (prefers-color-scheme: dark) for
       [colorScheme]="auto" — keeps cascade specificity equal.
       Each block only sets the tokens that *differ* from its light
       counterpart; same-value tokens (font-family, tab-radius, etc.)
       continue to cascade from the per-version light block.
       ============================================================ */

    /* Office 2007 — Black scheme (reconstructed) */
    :host([color-scheme="dark"][version="office-2007"]) {
      color: rgba(255, 255, 255, 0.87);
      --bs-ribbon-container-bg: linear-gradient(#2B2F38, #1E2024);
      --bs-ribbon-container-border: #15171A;
      --bs-ribbon-tabstrip-bg: linear-gradient(#252830, #15171A);
      --bs-ribbon-tabstrip-border: #15171A;
      --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.78);
      --bs-ribbon-tab-hover-bg: #3A3A3A;
      --bs-ribbon-tab-active-bg: linear-gradient(#2B2F38, #1E2024);
      --bs-ribbon-tab-active-color: #FFFFFF;
      --bs-ribbon-tabpanel-bg: linear-gradient(#2B2F38, #1E2024);
      --bs-ribbon-group-separator: rgba(255, 255, 255, 0.10);
      --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.60);
      --bs-ribbon-item-hover-bg: #3F3F3F;
      --bs-ribbon-item-hover-border: rgba(255, 255, 255, 0.15);
      --bs-ribbon-item-pressed-bg: #4A4A4A;
    }

    /* Office 2010 — Black scheme (reconstructed) */
    :host([color-scheme="dark"][version="office-2010"]) {
      color: rgba(255, 255, 255, 0.87);
      --bs-ribbon-container-bg: #2A2C2F;
      --bs-ribbon-container-border: #1A1A1A;
      --bs-ribbon-tabstrip-bg: linear-gradient(#34373B, #25282B);
      --bs-ribbon-tabstrip-border: #1A1A1A;
      --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.78);
      --bs-ribbon-tab-hover-bg: #3A3A3A;
      --bs-ribbon-tab-active-bg: #2A2C2F;
      --bs-ribbon-tab-active-color: #FFFFFF;
      --bs-ribbon-tabpanel-bg: #2A2C2F;
      --bs-ribbon-group-separator: rgba(255, 255, 255, 0.10);
      --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.60);
      --bs-ribbon-item-hover-bg: #3F3F3F;
      --bs-ribbon-item-hover-border: rgba(255, 255, 255, 0.15);
      --bs-ribbon-item-pressed-bg: #4A4A4A;
    }

    /* Office 2016 — Black */
    :host([color-scheme="dark"][version="office-2016"]) {
      color: rgba(255, 255, 255, 0.87);
      --bs-ribbon-container-bg: #262626;
      --bs-ribbon-container-border: #1A1A1A;
      --bs-ribbon-tabstrip-bg: #1F1F1F;
      --bs-ribbon-tabstrip-border: #1A1A1A;
      --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.78);
      --bs-ribbon-tab-hover-bg: #3A3A3A;
      --bs-ribbon-tab-active-bg: #363636;
      --bs-ribbon-tab-active-color: #FFFFFF;
      --bs-ribbon-tab-active-indicator-color: var(--bs-ribbon-app-accent-on-dark);
      --bs-ribbon-tabpanel-bg: #363636;
      --bs-ribbon-group-separator: rgba(255, 255, 255, 0.10);
      --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.60);
      --bs-ribbon-item-hover-bg: #3F3F3F;
      --bs-ribbon-item-hover-border: rgba(255, 255, 255, 0.15);
      --bs-ribbon-item-pressed-bg: #4A4A4A;
    }

    /* Office 2013 — Dark Gray */
    :host([color-scheme="dark"][version="office-2013"]) {
      color: rgba(255, 255, 255, 0.87);
      --bs-ribbon-container-bg: #444444;
      --bs-ribbon-container-border: #2B2B2B;
      --bs-ribbon-tabstrip-bg: #2B2B2B;
      --bs-ribbon-tabstrip-border: #1F1F1F;
      --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.70);
      --bs-ribbon-tab-hover-bg: #525252;
      --bs-ribbon-tab-active-bg: #444444;
      --bs-ribbon-tab-active-color: #FFFFFF;
      --bs-ribbon-tab-active-indicator-color: transparent;
      --bs-ribbon-tabpanel-bg: #444444;
      --bs-ribbon-group-separator: rgba(255, 255, 255, 0.08);
      --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.55);
      --bs-ribbon-item-hover-bg: #5A5A5A;
      --bs-ribbon-item-hover-border: transparent;
      --bs-ribbon-item-pressed-bg: #6A6A6A;
    }

    @media (prefers-color-scheme: dark) {
      :host([color-scheme="auto"][version="office-2007"]) {
        color: rgba(255, 255, 255, 0.87);
        --bs-ribbon-container-bg: linear-gradient(#2B2F38, #1E2024);
        --bs-ribbon-container-border: #15171A;
        --bs-ribbon-tabstrip-bg: linear-gradient(#252830, #15171A);
        --bs-ribbon-tabstrip-border: #15171A;
        --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.78);
        --bs-ribbon-tab-hover-bg: #3A3A3A;
        --bs-ribbon-tab-active-bg: linear-gradient(#2B2F38, #1E2024);
        --bs-ribbon-tab-active-color: #FFFFFF;
        --bs-ribbon-tabpanel-bg: linear-gradient(#2B2F38, #1E2024);
        --bs-ribbon-group-separator: rgba(255, 255, 255, 0.10);
        --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.60);
        --bs-ribbon-item-hover-bg: #3F3F3F;
        --bs-ribbon-item-hover-border: rgba(255, 255, 255, 0.15);
        --bs-ribbon-item-pressed-bg: #4A4A4A;
      }
      :host([color-scheme="auto"][version="office-2010"]) {
        color: rgba(255, 255, 255, 0.87);
        --bs-ribbon-container-bg: #2A2C2F;
        --bs-ribbon-container-border: #1A1A1A;
        --bs-ribbon-tabstrip-bg: linear-gradient(#34373B, #25282B);
        --bs-ribbon-tabstrip-border: #1A1A1A;
        --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.78);
        --bs-ribbon-tab-hover-bg: #3A3A3A;
        --bs-ribbon-tab-active-bg: #2A2C2F;
        --bs-ribbon-tab-active-color: #FFFFFF;
        --bs-ribbon-tabpanel-bg: #2A2C2F;
        --bs-ribbon-group-separator: rgba(255, 255, 255, 0.10);
        --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.60);
        --bs-ribbon-item-hover-bg: #3F3F3F;
        --bs-ribbon-item-hover-border: rgba(255, 255, 255, 0.15);
        --bs-ribbon-item-pressed-bg: #4A4A4A;
      }
      :host([color-scheme="auto"][version="office-2016"]) {
        color: rgba(255, 255, 255, 0.87);
        --bs-ribbon-container-bg: #262626;
        --bs-ribbon-container-border: #1A1A1A;
        --bs-ribbon-tabstrip-bg: #1F1F1F;
        --bs-ribbon-tabstrip-border: #1A1A1A;
        --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.78);
        --bs-ribbon-tab-hover-bg: #3A3A3A;
        --bs-ribbon-tab-active-bg: #363636;
        --bs-ribbon-tab-active-color: #FFFFFF;
        --bs-ribbon-tab-active-indicator-color: var(--bs-ribbon-app-accent-on-dark);
        --bs-ribbon-tabpanel-bg: #363636;
        --bs-ribbon-group-separator: rgba(255, 255, 255, 0.10);
        --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.60);
        --bs-ribbon-item-hover-bg: #3F3F3F;
        --bs-ribbon-item-hover-border: rgba(255, 255, 255, 0.15);
        --bs-ribbon-item-pressed-bg: #4A4A4A;
      }
      :host([color-scheme="auto"][version="office-2013"]) {
        color: rgba(255, 255, 255, 0.87);
        --bs-ribbon-container-bg: #444444;
        --bs-ribbon-container-border: #2B2B2B;
        --bs-ribbon-tabstrip-bg: #2B2B2B;
        --bs-ribbon-tabstrip-border: #1F1F1F;
        --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.70);
        --bs-ribbon-tab-hover-bg: #525252;
        --bs-ribbon-tab-active-bg: #444444;
        --bs-ribbon-tab-active-color: #FFFFFF;
        --bs-ribbon-tab-active-indicator-color: transparent;
        --bs-ribbon-tabpanel-bg: #444444;
        --bs-ribbon-group-separator: rgba(255, 255, 255, 0.08);
        --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.55);
        --bs-ribbon-item-hover-bg: #5A5A5A;
        --bs-ribbon-item-hover-border: transparent;
        --bs-ribbon-item-pressed-bg: #6A6A6A;
      }
    }

    /* ============================================================
       TOUCH MODE (FR-37 / FR-38)
       Bumps tab buttons to WCAG-recommended ≥44px tall when the
       primary pointer is coarse (touch / stylus) or when the
       consumer explicitly opts in via [touchMode]="on".
       Item-level bumps live in mp-ribbon-button / -toggle / -checkbox
       / etc. so each item kind controls its own padding ramp.
       ============================================================ */
    :host([touch-mode="on"]) .ribbon-tab,
    :host([touch-mode="on"]) .ribbon-contextual-group-tabs > .ribbon-tab {
      min-height: 44px;
      padding: 12px 18px;
    }
    @media (pointer: coarse) {
      :host([touch-mode="auto"]) .ribbon-tab,
      :host([touch-mode="auto"]) .ribbon-contextual-group-tabs > .ribbon-tab {
        min-height: 44px;
        padding: 12px 18px;
      }
    }

    /* Contextual band: dark mode bypasses the JS-computed luminance
       text rule. Hue is desaturated + darkened so it doesn't punch
       through dark chrome; text is always white. */
    :host([color-scheme="dark"]) .ribbon-contextual-group-band {
      background: color-mix(
        in oklab,
        var(--bs-ribbon-contextual-color) 40%,
        #1F1F1F 60%
      );
      color: #FFFFFF;
    }
    @media (prefers-color-scheme: dark) {
      :host([color-scheme="auto"]) .ribbon-contextual-group-band {
        background: color-mix(
          in oklab,
          var(--bs-ribbon-contextual-color) 40%,
          #1F1F1F 60%
        );
        color: #FFFFFF;
      }
    }

    .ribbon-container {
      border: 1px solid;
      border-color: var(--bs-ribbon-container-border);
      background: var(--bs-ribbon-container-bg);
      font-family: var(--bs-ribbon-font-family);
    }
    .ribbon-tabstrip {
      /* Wraps the tablist + tell-me so the search box can sit at the
         trailing edge VISUALLY without violating ARIA's role=tablist
         child constraints (axe-core's aria-required-children rule —
         tablist's allowed children are role=tab only). */
      display: flex;
      align-items: flex-end;
      border-bottom: 1px solid;
      border-bottom-color: var(--bs-ribbon-tabstrip-border);
      background: var(--bs-ribbon-tabstrip-bg);
    }
    .ribbon-tablist {
      display: flex;
      align-items: flex-end;
      flex: 1 1 auto;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: thin;
    }
    .ribbon-tab {
      flex: 0 0 auto;
    }
    /* "Tell Me" slot (FR-24): consumer-projected search/command-palette
       area pinned to the trailing edge of the tab strip. Now a sibling
       of role="tablist", not a child, so the ARIA tree stays clean. */
    .ribbon-tell-me {
      flex: 0 0 auto;
      padding-inline: 6px;
      align-self: center;
      display: flex;
      align-items: center;
    }
    .ribbon-tell-me:empty { display: none; }
    .ribbon-tab {
      padding: var(--bs-ribbon-tab-padding);
      background: transparent;
      border: none;
      border-bottom: var(--bs-ribbon-tab-active-indicator-width) solid
        transparent;
      border-radius: var(--bs-ribbon-tab-radius);
      cursor: pointer;
      font-size: 14px;
      color: var(--bs-ribbon-tab-idle-color);
      transition: background 0.15s ease, color 0.15s ease;
    }

    /* FR-18: honour prefers-reduced-motion. Disable hover/active colour
       transitions on the tab strip + any future animations inside the
       ribbon's shadow root. Slotted item elements (mp-ribbon-button etc.)
       each carry their own reduced-motion block where they introduce
       transitions; today only the tab strip has any. */
    @media (prefers-reduced-motion: reduce) {
      .ribbon-tab,
      .ribbon-tab:hover,
      .ribbon-tab.active {
        transition: none;
      }
      * {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
    }
    .ribbon-tab:hover { background: var(--bs-ribbon-tab-hover-bg); }
    .ribbon-tab.active {
      background: var(--bs-ribbon-tab-active-bg);
      border-bottom-color: var(--bs-ribbon-tab-active-indicator-color);
      color: var(--bs-ribbon-tab-active-color);
      font-weight: 500;
    }
    .ribbon-tab:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent);
      outline-offset: -2px;
    }
    .ribbon-content {
      padding: 0;
      background: var(--bs-ribbon-tabpanel-bg);
      overflow: hidden;
    }
    .ribbon-contextual-group {
      display: inline-flex;
      flex-direction: column;
      align-self: flex-end;
    }
    .ribbon-contextual-group-band {
      background: var(--bs-ribbon-contextual-color, #F0AF84);
      color: var(--ribbon-contextual-text, #262626);
      font-size: 11px;
      font-weight: 400;
      line-height: 1.3;
      padding: 5px 12px;
      text-align: center;
      white-space: nowrap;
    }
    .ribbon-contextual-group-tabs {
      display: flex;
      flex-direction: row;
      align-self: stretch;
    }
    .ribbon-contextual-group-tabs > .ribbon-tab {
      flex: 1 0 auto;
      text-align: center;
      justify-content: center;
    }
    /* Contextual tabs no longer need a coloured top-border — the band
       directly above them is the visual indicator. Keeping their layout
       identical to plain tabs avoids the colour from the band appearing
       to bleed 3px down into the tab. */

    /* KeyTips overlay (FR-12). Position: fixed badges anchored to each
       tab / item via getBoundingClientRect; one shadow-DOM layer renders
       all badges. Office-style yellow tile with a thin border. */
    .keytip-badge {
      position: fixed;
      z-index: 1100;
      min-width: 18px;
      padding: 1px 5px;
      background: #FFFFFF;
      border: 1px solid #919191;
      color: #444;
      font-size: 11px;
      font-family: var(--bs-ribbon-font-family, "Segoe UI", sans-serif);
      font-weight: 600;
      line-height: 1.2;
      text-align: center;
      pointer-events: none;
      box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.15);
    }
    :host([color-scheme="dark"]) .keytip-badge {
      background: #2A2A2A;
      border-color: #6E6E6E;
      color: #F2F2F2;
    }
    @media (prefers-color-scheme: dark) {
      :host([color-scheme="auto"]) .keytip-badge {
        background: #2A2A2A;
        border-color: #6E6E6E;
        color: #F2F2F2;
      }
    }
  `;

  /** Currently active tab ID. */
  @property({ type: String, attribute: 'active-tab-id', reflect: true })
  activeTabId: string = '';

  /**
   * Internal list of `<mp-ribbon-tab>` children, populated on slotchange.
   * Source of truth: light-DOM children of this ribbon.
   */
  @state()
  private tabsList: TabEntry[] = [];

  /** Visible contextual tab sets (for the coloured header band). */
  @state()
  private contextualSets: ContextualSetEntry[] = [];

  /** Cached reference to the default slot for re-processing on visibility changes. */
  private contentSlot: HTMLSlotElement | null = null;

  /** Layout mode: 'classic' | 'simplified' (FR-8 / FR-39). */
  @property({ type: String, reflect: true })
  layout: 'classic' | 'simplified' = 'classic';

  /** True if ribbon is minimized (shows only tab strip) */
  @property({ type: Boolean })
  minimized: boolean = false;

  /** Visual version theme. */
  @property({ type: String, reflect: true })
  version: 'office-2007' | 'office-2010' | 'office-2013' | 'office-2016' =
    'office-2016';

  /**
   * Light/dark mode. `auto` follows `prefers-color-scheme` and ancestor
   * `data-bs-theme="dark"` (via the Bootstrap fallback variable chain).
   * Explicit `dark` / `light` always overrides those. Dark variants ship
   * for office-2013 (Dark Gray) and office-2016 (Black); on office-2007
   * and office-2010 `dark` is a documented no-op (those versions never
   * had a Microsoft-shipped dark mode).
   */
  @property({ type: String, attribute: 'color-scheme', reflect: true })
  colorScheme: 'light' | 'dark' | 'auto' = 'auto';

  /**
   * Touch-friendly sizing. `on` bumps tab buttons + item buttons + menu
   * items to ≥44px tall (WCAG 2.5.5 / Apple HIG / Material Design). `auto`
   * follows `@media (pointer: coarse)`. `off` always uses the dense
   * desktop sizing regardless of input device.
   */
  @property({ type: String, attribute: 'touch-mode', reflect: true })
  touchMode: 'on' | 'off' | 'auto' = 'auto';

  /**
   * KeyTips on/off (FR-12). `on` (default) enables Alt-overlay shortcuts to
   * tabs + items with two-level drill-down. `off` skips the keydown
   * registration entirely — useful when KeyTips would conflict with a host
   * app's own Alt menu, or as a screen-reader-aware disable path.
   */
  @property({ type: String, attribute: 'key-tips' })
  keyTips: 'on' | 'off' = 'on';

  /**
   * KeyTips state machine: 'off' when overlay is hidden, 'tabs' showing
   * tip badges next to each tab, 'items' showing tip badges next to each
   * item in the active tab. Esc unwinds one level at a time.
   */
  @state()
  private keyTipMode: 'off' | 'tabs' | 'items' = 'off';

  @state()
  private keyTipBadges: KeyTipBadge[] = [];

  private currentTabIndex = 0;
  private resizeObserver?: ResizeObserver;
  private reflowFrame: number = 0;
  private readonly naturalWidths = new WeakMap<HTMLElement, number>();

  private readonly liveAnnouncer = new LiveAnnouncerController(this);
  private readonly collapsedGroupLabels = new WeakMap<HTMLElement, string>();
  private readonly previousCollapsedGroups = new Set<HTMLElement>();
  /** Last-seen hidden state per contextual-set label; lets us announce only transitions. */
  private readonly contextualSetHiddenState = new Map<string, boolean>();

  /**
   * FR-6: how many reduceOrder steps the active tab currently has applied.
   * Keyed by the tab host so per-tab state survives switching.
   */
  private readonly appliedReduceSteps = new WeakMap<HTMLElement, number>();

  /**
   * FR-6: original (consumer-declared) `size` of every slotted item host,
   * saved the first time the reflow downsizes the item. Restoring this is
   * how the group "expands back to large" when room reappears.
   */
  private readonly originalItemSizes = new WeakMap<HTMLElement, RibbonItemSize>();

  private get tabElements(): HTMLElement[] {
    return Array.from(this.renderRoot.querySelectorAll<HTMLElement>('[role="tab"]'));
  }

  constructor() {
    super();
  }

  override connectedCallback() {
    super.connectedCallback();
    // role="region" + aria-label gives the ribbon a screen-reader landmark
    // without claiming role="application", which would tell AT to disable
    // its own keyboard handling. The ribbon plays nicely with the browser's
    // default tab navigation, so it's a region, not an application.
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Ribbon');

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleReflow());
      this.resizeObserver.observe(this);
    }

    this.addEventListener(
      'contextual-visibility-change',
      this.onContextualVisibilityChange
    );
    this.addEventListener('keydown', this.onHostKeyDown);
    // KeyTips listens at the document level — Alt anywhere on the page
    // activates the overlay so the user can pop it up without clicking
    // into the ribbon first. Matches Office's behaviour.
    document.addEventListener('keydown', this.onKeyTipKeyDown);
    document.addEventListener('keyup', this.onKeyTipKeyUp);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    if (this.reflowFrame) cancelAnimationFrame(this.reflowFrame);
    this.removeEventListener(
      'contextual-visibility-change',
      this.onContextualVisibilityChange
    );
    this.removeEventListener('keydown', this.onHostKeyDown);
    document.removeEventListener('keydown', this.onKeyTipKeyDown);
    document.removeEventListener('keyup', this.onKeyTipKeyUp);
  }

  /** Tracked so we can swallow the browser's "focus menu bar on Alt-up". */
  private altPressed = false;
  /** Set when the user combines Alt with another key — suppresses menu-bar focus. */
  private altUsedForCombo = false;

  private onKeyTipKeyDown = (event: KeyboardEvent): void => {
    if (this.keyTips !== 'on') return;
    if (event.key === 'Alt' && !event.repeat) {
      this.altPressed = true;
      this.altUsedForCombo = false;
      return;
    }
    if (event.altKey && event.key !== 'Alt') {
      // Combos like Alt+Tab, Alt+F4 — don't activate KeyTips, but mark Alt
      // as "consumed" so onKeyTipKeyUp doesn't toggle on release.
      this.altUsedForCombo = true;
      return;
    }
    if (this.keyTipMode === 'off') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.keyTipMode === 'items') this.openKeyTipsTabsLevel();
      else this.closeKeyTips();
      return;
    }
    if (event.key.length === 1) {
      const letter = event.key.toUpperCase();
      const badge = this.keyTipBadges.find((b) => b.tip === letter);
      if (!badge) return;
      event.preventDefault();
      if (this.keyTipMode === 'tabs') {
        const tabId = badge.target.getAttribute('data-tab-id');
        if (tabId) this.selectTab(tabId);
        this.openKeyTipsItemsLevel();
      } else {
        this.activateKeyTipTarget(badge.target);
        this.closeKeyTips();
      }
    }
  };

  private onKeyTipKeyUp = (event: KeyboardEvent): void => {
    if (this.keyTips !== 'on') return;
    if (event.key === 'Alt') {
      this.altPressed = false;
      if (this.altUsedForCombo) {
        this.altUsedForCombo = false;
        return;
      }
      // Plain Alt press → toggle KeyTips. preventDefault on keyup suppresses
      // Chrome / Firefox menu-bar focus on the same Alt press.
      event.preventDefault();
      if (this.keyTipMode !== 'off') this.closeKeyTips();
      else this.openKeyTipsTabsLevel();
    }
  };

  private openKeyTipsTabsLevel(): void {
    this.keyTipMode = 'tabs';
    this.keyTipBadges = this.deriveTabBadges();
  }

  private openKeyTipsItemsLevel(): void {
    this.keyTipMode = 'items';
    // Wait for tab selection to render before measuring item rects.
    requestAnimationFrame(() => {
      this.keyTipBadges = this.deriveItemBadges();
    });
  }

  private closeKeyTips(): void {
    this.keyTipMode = 'off';
    this.keyTipBadges = [];
  }

  /**
   * Activate the underlying target. For tabs, switch tabs (handled in the
   * caller). For items, dispatch the appropriate event — `mp-ribbon-button`
   * etc. listen for `click` and fire their own `item-click`; for dropdown
   * triggers, click opens the menu. delegatesFocus + `click()` covers both.
   */
  private activateKeyTipTarget(target: HTMLElement): void {
    target.focus();
    target.click();
  }

  /**
   * Deterministic 1-letter tip allocator (FR-12). Tries (in order):
   * 1. Explicit `data-key-tip` attribute on the element.
   * 2. First letter of the label that isn't already taken.
   * 3. Subsequent consonants in the label.
   * 4. Other letters of the label.
   * 5. Digits 1-9 then 0 (fallback when every letter is taken).
   */
  private allocateKeyTip(label: string, explicit: string | null, used: Set<string>): string {
    if (explicit) {
      const tip = explicit.toUpperCase().slice(0, 1);
      used.add(tip);
      return tip;
    }
    const normalized = (label ?? '').toUpperCase();
    const isVowel = (ch: string) => 'AEIOU'.includes(ch);
    // First-letter pass
    if (normalized.length > 0) {
      const first = normalized[0];
      if (/[A-Z0-9]/.test(first) && !used.has(first)) {
        used.add(first);
        return first;
      }
    }
    // Consonants pass
    for (let i = 1; i < normalized.length; i++) {
      const ch = normalized[i];
      if (/[A-Z]/.test(ch) && !isVowel(ch) && !used.has(ch)) {
        used.add(ch);
        return ch;
      }
    }
    // Any remaining letter
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      if (/[A-Z]/.test(ch) && !used.has(ch)) {
        used.add(ch);
        return ch;
      }
    }
    // Digits
    for (const ch of '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0') {
      if (!used.has(ch)) {
        used.add(ch);
        return ch;
      }
    }
    return '?';
  }

  /** Compute key-tip badges anchored under each tab button in the strip. */
  private deriveTabBadges(): KeyTipBadge[] {
    const result: KeyTipBadge[] = [];
    const used = new Set<string>();
    const tabButtons = this.tabElements;
    for (const button of tabButtons) {
      const tabId = button.getAttribute('data-tab-id') ?? '';
      const sourceTab = this.tabsList.find((t) => t.tabId === tabId)?.element;
      // Explicit `data-key-tip` can live on the rendered button or on the
      // light-DOM <mp-ribbon-tab> source — the source is the consumer-facing
      // surface, so check both.
      const explicit =
        button.getAttribute('data-key-tip') ??
        sourceTab?.getAttribute('data-key-tip') ??
        null;
      const label = button.textContent ?? '';
      const tip = this.allocateKeyTip(label, explicit, used);
      const r = button.getBoundingClientRect();
      result.push({ tip, target: button, rect: { left: r.left + 4, top: r.bottom - 4 } });
    }
    return result;
  }

  /** Compute key-tip badges for every item inside the currently active tab. */
  private deriveItemBadges(): KeyTipBadge[] {
    const activeTab = this.tabsList.find((t) => t.tabId === this.activeTabId);
    if (!activeTab) return [];
    const groups = this.collectActiveGroups(activeTab.element);
    const used = new Set<string>();
    const result: KeyTipBadge[] = [];
    for (const group of groups) {
      // Collapsed groups: badge anchors to the popup trigger button instead.
      if (group.getAttribute('data-resolved-size') === 'popup') {
        const trigger = group.shadowRoot?.querySelector<HTMLElement>(
          '.ribbon-popup-trigger'
        );
        if (trigger) {
          const explicit = group.getAttribute('data-key-tip');
          const label = group.getAttribute('label') ?? '';
          const tip = this.allocateKeyTip(label, explicit, used);
          const r = trigger.getBoundingClientRect();
          result.push({ tip, target: trigger, rect: { left: r.left + 4, top: r.bottom - 6 } });
        }
        continue;
      }
      // Expanded group: badge each item inside.
      const items = this.collectGroupItems(group);
      for (const item of items) {
        if (item.hasAttribute('disabled')) continue;
        const explicit = item.getAttribute('data-key-tip');
        const label = item.getAttribute('label') ?? '';
        const tip = this.allocateKeyTip(label, explicit, used);
        const r = item.getBoundingClientRect();
        result.push({ tip, target: item, rect: { left: r.left + 2, top: r.bottom - 6 } });
      }
    }
    return result;
  }

  /**
   * Host-level keydown for ribbon-wide shortcuts. Fires whenever focus is
   * inside the ribbon's subtree (the tab strip or any slotted group).
   * - Ctrl+F1 toggles minimize/restore (Office).
   * - Ctrl+ArrowLeft/Right jumps focus between groups in the active tab.
   */
  private onHostKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey && event.key === 'F1') {
      event.preventDefault();
      this.toggleMinimizedFromUser();
      return;
    }
    if (event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const path = event.composedPath();
      // Skip if focus is on a ribbon tab — the tablist's arrow handler owns that.
      if (path.some((n) => n instanceof HTMLElement && n.getAttribute('role') === 'tab')) {
        return;
      }
      const fromGroup = path.find(
        (n) => n instanceof HTMLElement && n.tagName === 'MP-RIBBON-GROUP'
      ) as HTMLElement | undefined;
      if (fromGroup) {
        // In RTL, ArrowLeft visually points to the "next" group (because DOM
        // order renders right-to-left), so the direction flips.
        const rtl = getComputedStyle(this).direction === 'rtl';
        const rightIsForward = !rtl;
        const direction =
          (event.key === 'ArrowRight') === rightIsForward ? 1 : -1;
        if (this.moveFocusBetweenGroups(fromGroup, direction)) {
          event.preventDefault();
        }
      }
    }
  };

  private toggleMinimizedFromUser(): void {
    this.minimized = !this.minimized;
    this.dispatchEvent(
      new CustomEvent('minimize-toggle', {
        detail: { minimized: this.minimized },
        bubbles: true,
        composed: true,
      })
    );
  }

  private moveFocusBetweenGroups(fromGroup: HTMLElement, direction: 1 | -1): boolean {
    const activeTab = this.tabsList.find((t) => t.tabId === this.activeTabId);
    if (!activeTab) return false;
    const groups = this.collectActiveGroups(activeTab.element).filter(
      (g) => g.getAttribute('data-resolved-size') !== 'popup' || g.hasAttribute('data-popup-open')
    );
    if (groups.length === 0) return false;

    const currentIdx = groups.indexOf(fromGroup);
    if (currentIdx === -1) return false;

    const nextIdx = currentIdx + direction;
    if (nextIdx < 0 || nextIdx >= groups.length) return false;

    const target = this.firstFocusableInGroup(groups[nextIdx]);
    if (target) {
      target.focus();
      return true;
    }
    return false;
  }

  private firstFocusableInGroup(group: HTMLElement): HTMLElement | null {
    // Items may be raw Lit elements (`<mp-ribbon-button>`) or Angular wrappers
    // (`<bs-ribbon-button>` is `display: contents`). Walk descendants for any
    // `mp-ribbon-*` item host — those use `delegatesFocus`, so focusing the
    // host forwards into the inner shadow-root button. Prefer the item that
    // currently has `tabindex="0"` (the group's roving "active") so jumping
    // back into a group restores its last-focused position.
    const candidates = Array.from(
      group.querySelectorAll<HTMLElement>(
        'mp-ribbon-button, mp-ribbon-toggle-button, mp-ribbon-checkbox, mp-ribbon-combobox, ' +
          'mp-ribbon-color-picker, mp-ribbon-group-button, mp-ribbon-split-button, ' +
          'mp-ribbon-dropdown-button, mp-ribbon-gallery, mp-ribbon-template-item'
      )
    ).filter((candidate) => !candidate.hasAttribute('disabled'));
    if (candidates.length === 0) return null;
    return candidates.find((c) => c.getAttribute('tabindex') === '0') ?? candidates[0];
  }

  private onContextualVisibilityChange = (event: Event): void => {
    const detail = (event as CustomEvent<{ hidden: boolean; label: string }>).detail;
    if (detail?.label) {
      const previous = this.contextualSetHiddenState.get(detail.label);
      if (previous !== undefined && previous !== detail.hidden) {
        this.liveAnnouncer.announce(
          detail.hidden
            ? `${detail.label}, contextual, hidden`
            : `${detail.label}, contextual, now available`
        );
      }
      this.contextualSetHiddenState.set(detail.label, detail.hidden);
    }
    if (this.contentSlot) this.processSlot(this.contentSlot);
  };

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('activeTabId')) {
      this.applyActiveAttribute();
      // Keep the roving-focus cursor (`currentTabIndex`) aligned with the
      // active tab. `currentTabIndex` is normally advanced by arrow keys,
      // but if `activeTabId` is set externally (initial attribute, demo
      // signal flip, or another script writing the property), the first
      // subsequent arrow press would otherwise start from the wrong index.
      const idx = this.tabsList.findIndex((t) => t.tabId === this.activeTabId);
      if (idx >= 0) this.currentTabIndex = idx;
    }
    if (changed.has('activeTabId') || changed.has('minimized')) {
      this.scheduleReflow();
    }
    if (changed.has('minimized') && changed.get('minimized') !== undefined) {
      this.liveAnnouncer.announce(
        this.minimized ? 'Ribbon minimized' : 'Ribbon restored'
      );
    }
    if (changed.has('layout')) {
      this.applyLayoutPropagation();
      this.scheduleReflow();
    }
  }

  /**
   * FR-39: stamp `data-ribbon-layout` on every slotted descendant so each
   * element's shadow-DOM CSS can switch to its Simplified rendering. Walking
   * the light-DOM tree is necessary because CSS custom properties can be
   * read in `var()` values but not as conditional selectors.
   *
   * Also force every item's `size` to `small` in Simplified, and restore
   * the consumer-declared original size (saved in `originalItemSizes` by
   * the FR-6 path) when switching back to Classic.
   */
  private applyLayoutPropagation(): void {
    const layoutValue = this.layout === 'simplified' ? 'simplified' : 'classic';
    const descendants = this.querySelectorAll<HTMLElement>(
      'mp-ribbon-tab, mp-ribbon-group, ' +
        'mp-ribbon-button, mp-ribbon-toggle-button, mp-ribbon-checkbox, ' +
        'mp-ribbon-combobox, mp-ribbon-color-picker, mp-ribbon-group-button, ' +
        'mp-ribbon-split-button, mp-ribbon-dropdown-button, mp-ribbon-gallery'
    );
    for (const el of Array.from(descendants)) {
      el.setAttribute('data-ribbon-layout', layoutValue);
    }
    const items = this.querySelectorAll<HTMLElement>(
      'mp-ribbon-button, mp-ribbon-toggle-button, mp-ribbon-checkbox, ' +
        'mp-ribbon-combobox, mp-ribbon-color-picker, mp-ribbon-group-button, ' +
        'mp-ribbon-split-button, mp-ribbon-dropdown-button, mp-ribbon-gallery'
    );
    if (this.layout === 'simplified') {
      for (const item of Array.from(items)) {
        if (!this.originalItemSizes.has(item)) {
          const cur = (item.getAttribute('size') as RibbonItemSize) ?? 'medium';
          this.originalItemSizes.set(item, cur);
        }
        if (item.getAttribute('size') !== 'small') {
          item.setAttribute('size', 'small');
        }
      }
    } else {
      // Classic: restore each item to the size we saved before the flip.
      for (const item of Array.from(items)) {
        const original = this.originalItemSizes.get(item);
        if (original && item.getAttribute('size') !== original) {
          item.setAttribute('size', original);
        }
      }
    }
  }

  override render(): TemplateResult {
    return html`
      <div class="ribbon-container">
        <div class="ribbon-tabstrip">
          <div
            role="tablist"
            class="ribbon-tablist"
            @keydown="${this.onTabListKeydown}"
          >
            ${this.renderTabStripItems()}
          </div>
          <div class="ribbon-tell-me">
            <slot name="tell-me"></slot>
          </div>
        </div>

        ${!this.minimized
          ? html`<div class="ribbon-content">
              <slot @slotchange="${this.onSlotChange}"></slot>
            </div>`
          : html`<div hidden><slot @slotchange="${this.onSlotChange}"></slot></div>`}
      </div>
      ${this.keyTipMode !== 'off' ? this.renderKeyTipOverlay() : nothing}
      ${this.liveAnnouncer.template()}
    `;
  }

  private renderKeyTipOverlay(): TemplateResult {
    return html`
      ${this.keyTipBadges.map(
        (b) => html`
          <span
            class="keytip-badge"
            style="left: ${b.rect.left}px; top: ${b.rect.top}px;"
            aria-hidden="true"
          >${b.tip}</span>
        `
      )}
    `;
  }

  private renderTabStripItems(): TemplateResult[] {
    const result: TemplateResult[] = [];
    let i = 0;
    while (i < this.tabsList.length) {
      const tab = this.tabsList[i];
      if (!tab.contextualColor || !tab.contextualSetLabel) {
        result.push(this.renderTabButton(tab, i));
        i++;
        continue;
      }
      const setLabel = tab.contextualSetLabel;
      const setColor = tab.contextualColor;
      const runStart = i;
      while (
        i < this.tabsList.length &&
        this.tabsList[i].contextualSetLabel === setLabel &&
        this.tabsList[i].contextualColor === setColor
      ) {
        i++;
      }
      const groupTabs = this.tabsList.slice(runStart, i);
      const textColor = this.getBandTextColor(setColor);
      const wrapperStyle =
        `--bs-ribbon-contextual-color: ${setColor};` +
        `--ribbon-contextual-text: ${textColor};`;
      result.push(html`
        <div class="ribbon-contextual-group" style="${wrapperStyle}">
          <div class="ribbon-contextual-group-band">${setLabel}</div>
          <div class="ribbon-contextual-group-tabs">
            ${groupTabs.map((t, idx) =>
              this.renderTabButton(t, runStart + idx)
            )}
          </div>
        </div>
      `);
    }
    return result;
  }

  /**
   * Office-faithful contrast rule: dark text on pastel bands, white text on
   * saturated bands. Uses W3C relative luminance with a 0.6 cutoff. Accepts
   * 6-digit hex; falls back to dark on parse failure (safe default).
   */
  private getBandTextColor(bg: string): string {
    const hex = bg.replace('#', '').trim();
    if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return '#262626';
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance >= 0.6 ? '#262626' : '#FFFFFF';
  }

  private renderTabButton(tab: TabEntry, _index: number): TemplateResult {
    const isActive = tab.tabId === this.activeTabId;
    const isContextual = !!tab.contextualColor;
    const tabIndex = isActive ? 0 : -1;

    return html`
      <button
        role="tab"
        id="ribbon-tab-${tab.tabId}"
        class="ribbon-tab ${isActive ? 'active' : ''} ${isContextual ? 'contextual' : ''}"
        aria-selected="${isActive}"
        aria-controls="ribbon-panel-${tab.tabId}"
        tabindex="${tabIndex}"
        data-tab-id="${tab.tabId}"
        @click="${() => this.selectTab(tab.tabId)}"
        @dblclick="${() => this.toggleMinimizedFromUser()}"
      >${tab.label}</button>
    `;
  }

  private onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    this.contentSlot = slot;
    this.processSlot(slot);
  };

  private processSlot(slot: HTMLSlotElement): void {
    const newTabs: TabEntry[] = [];
    const newSets: ContextualSetEntry[] = [];

    for (const assigned of slot.assignedElements()) {
      // Contextual set (or Angular wrapper around one)
      let setEl: HTMLElement | null = null;
      if (assigned.tagName === 'MP-RIBBON-CONTEXTUAL-TAB-SET') {
        setEl = assigned as HTMLElement;
      } else {
        setEl = assigned.querySelector<HTMLElement>(
          'mp-ribbon-contextual-tab-set'
        );
      }
      if (setEl) {
        const isHidden =
          setEl.hasAttribute('hidden') || assigned.hasAttribute('hidden');
        if (isHidden) continue;
        const color = setEl.getAttribute('color') ?? '#5BAEFF';
        const label = setEl.getAttribute('label') ?? '';
        const innerTabs = Array.from(
          setEl.querySelectorAll<HTMLElement>('mp-ribbon-tab')
        );
        const tabIds: string[] = [];
        for (const tab of innerTabs) {
          const id = tab.getAttribute('tab-id') ?? '';
          newTabs.push({
            tabId: id,
            label: tab.getAttribute('label') ?? '',
            element: tab,
            contextualColor: color,
            contextualSetLabel: label,
          });
          tabIds.push(id);
        }
        if (tabIds.length > 0) newSets.push({ label, color, tabIds });
        continue;
      }

      // Plain tab (or Angular wrapper)
      let tabEl: HTMLElement | null = null;
      if (assigned.tagName === 'MP-RIBBON-TAB') {
        tabEl = assigned as HTMLElement;
      } else {
        tabEl = assigned.querySelector<HTMLElement>('mp-ribbon-tab');
      }
      if (tabEl) {
        newTabs.push({
          tabId: tabEl.getAttribute('tab-id') ?? '',
          label: tabEl.getAttribute('label') ?? '',
          element: tabEl,
        });
      }
    }

    this.tabsList = newTabs;
    this.contextualSets = newSets;

    // If the active tab vanished (e.g. its contextual set was hidden), pick
    // the first visible one.
    const stillVisible = newTabs.some((t) => t.tabId === this.activeTabId);
    if (!stillVisible && newTabs.length > 0) {
      this.activeTabId = newTabs[0].tabId;
    } else if (!this.activeTabId && newTabs.length > 0) {
      this.activeTabId = newTabs[0].tabId;
    }
    this.applyActiveAttribute();
    // Re-stamp data-ribbon-layout on newly-arrived Angular wrapper children.
    this.applyLayoutPropagation();
    this.scheduleReflow();
  }

  private applyActiveAttribute(): void {
    for (const tab of this.tabsList) {
      if (tab.tabId === this.activeTabId) {
        tab.element.setAttribute('active', '');
      } else {
        tab.element.removeAttribute('active');
      }
    }
  }

  private selectTab(tabId: string): void {
    const previousTabId = this.activeTabId;
    this.activeTabId = tabId;
    const tabIndex = this.tabsList.findIndex((t) => t.tabId === tabId);
    if (tabIndex !== -1) {
      this.currentTabIndex = tabIndex;
    }
    this.dispatchEvent(
      new CustomEvent('tab-change', {
        detail: { previousTabId, activeTabId: tabId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private onTabListKeydown = (event: KeyboardEvent): void => {
    const { key } = event;
    let handled = false;
    // In RTL, ArrowLeft visually targets the next tab (DOM order is rendered
    // right-to-left). ArrowUp / ArrowDown are reserved for vertical reading
    // and stay direction-neutral.
    const rtl = getComputedStyle(this).direction === 'rtl';

    switch (key) {
      case 'ArrowLeft':
        if (rtl) this.focusNextTab();
        else this.focusPreviousTab();
        handled = true;
        break;
      case 'ArrowUp':
        this.focusPreviousTab();
        handled = true;
        break;

      case 'ArrowRight':
        if (rtl) this.focusPreviousTab();
        else this.focusNextTab();
        handled = true;
        break;
      case 'ArrowDown':
        this.focusNextTab();
        handled = true;
        break;

      case 'Home':
        this.focusTabAt(0);
        handled = true;
        break;

      case 'End':
        this.focusTabAt(this.tabsList.length - 1);
        handled = true;
        break;

      case 'Enter':
      case ' ':
        // Activate focused tab
        const focusedTab = this.tabElements[this.currentTabIndex];
        if (focusedTab) {
          const tabId = focusedTab.getAttribute('data-tab-id');
          if (tabId) {
            this.selectTab(tabId);
            handled = true;
          }
        }
        break;
    }

    if (handled) {
      event.preventDefault();
    }
  };

  private focusPreviousTab(): void {
    const newIndex = Math.max(0, this.currentTabIndex - 1);
    this.focusTabAt(newIndex);
  }

  private focusNextTab(): void {
    const newIndex = Math.min(this.tabsList.length - 1, this.currentTabIndex + 1);
    this.focusTabAt(newIndex);
  }

  private focusTabAt(index: number): void {
    if (index >= 0 && index < this.tabElements.length) {
      const tab = this.tabElements[index];
      tab.focus();
      this.currentTabIndex = index;

      // Optionally auto-select on arrow nav (APG Tabs pattern: automatic activation)
      // For now, just focus; Space/Enter required to select.
    }
  }

  private scheduleReflow(): void {
    if (this.reflowFrame) return;
    this.reflowFrame = requestAnimationFrame(() => {
      this.reflowFrame = 0;
      this.reflowOverflow();
    });
  }

  /**
   * Walks the active tab's groups and toggles `data-resolved-size="popup"` on
   * the rightmost group(s) until the tab content fits. On grow, expands the
   * leftmost popup'd group (i.e. the most-recently-collapsed) when room allows.
   *
   * MVP: single step per group (large -> popup). Author-declared reduceOrder
   * with intermediate sizes is a follow-up (FR-6 P0 deferred to later milestone).
   */
  private reflowOverflow(): void {
    if (this.minimized) return;
    const activeTab = this.tabsList.find((t) => t.tabId === this.activeTabId);
    if (!activeTab) return;
    const panel = activeTab.element;

    const groups = this.collectActiveGroups(panel);
    if (groups.length === 0) return;

    // FR-39: in Simplified, the per-group popup-chunk reflow is suppressed —
    // the shared end-of-tab chevron (on mp-ribbon-tab) owns overflow. Strip
    // any leftover `data-resolved-size="popup"` from a prior Classic session.
    if (this.layout === 'simplified') {
      for (const group of groups) {
        if (group.hasAttribute('data-resolved-size')) {
          group.removeAttribute('data-resolved-size');
        }
      }
      this.diffCollapsedGroupsAndAnnounce(groups);
      return;
    }

    // Snapshot each group's expanded width before any mutation.
    for (const group of groups) {
      if (group.getAttribute('data-resolved-size') !== 'popup') {
        this.naturalWidths.set(group, group.offsetWidth);
      }
    }

    // FR-6: if the active tab carries an author-declared reduceOrder, walk
    // that strictly instead of the priority-based default. The author's list
    // can step through intermediate medium/small sizes per group, not just
    // straight to popup.
    const tabReduceOrder = (panel as unknown as { reduceOrder?: readonly RibbonReduceStep[] })
      .reduceOrder;
    const tabIdealSizes = (panel as unknown as { idealSizes?: Record<string, RibbonGroupSize> })
      .idealSizes;
    if (tabReduceOrder && tabReduceOrder.length > 0) {
      const mutated = this.applyAuthorReduceOrder(
        panel,
        groups,
        tabReduceOrder,
        tabIdealSizes ?? {}
      );
      if (mutated) {
        this.scheduleReflow();
        return;
      }
      this.diffCollapsedGroupsAndAnnounce(groups);
      return;
    }

    const available = panel.clientWidth;
    const gap = 8;
    const occupied = () =>
      groups.reduce(
        (sum, g, i) => sum + g.offsetWidth + (i > 0 ? gap : 0),
        0
      );
    let mutated = false;

    const priorityOf = (g: HTMLElement) =>
      Number(g.getAttribute('priority') ?? '0');
    const isAutoScale = (g: HTMLElement) =>
      g.getAttribute('auto-scale') !== 'false';

    // Choose which group to collapse next: among non-popup, auto-scale groups,
    // pick the one with the lowest priority. Tiebreak: rightmost (DOM-order).
    const pickCollapseCandidate = (): HTMLElement | null => {
      let chosen: HTMLElement | null = null;
      let chosenPriority = Infinity;
      let chosenIndex = -1;
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        if (g.getAttribute('data-resolved-size') === 'popup') continue;
        if (!isAutoScale(g)) continue;
        const p = priorityOf(g);
        if (p < chosenPriority || (p === chosenPriority && i > chosenIndex)) {
          chosen = g;
          chosenPriority = p;
          chosenIndex = i;
        }
      }
      return chosen;
    };

    // On grow: expand highest-priority-first; tiebreak leftmost.
    const pickExpandCandidate = (): HTMLElement | null => {
      let chosen: HTMLElement | null = null;
      let chosenPriority = -Infinity;
      let chosenIndex = Infinity;
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        if (g.getAttribute('data-resolved-size') !== 'popup') continue;
        const p = priorityOf(g);
        if (p > chosenPriority || (p === chosenPriority && i < chosenIndex)) {
          chosen = g;
          chosenPriority = p;
          chosenIndex = i;
        }
      }
      return chosen;
    };

    // Collapse priority-aware until content fits or no groups can collapse.
    let safety = groups.length;
    while (occupied() > available && safety-- > 0) {
      const candidate = pickCollapseCandidate();
      if (!candidate) break;
      candidate.setAttribute('data-resolved-size', 'popup');
      mutated = true;
    }

    // If we have headroom, try expanding the highest-priority popup'd group.
    safety = groups.length;
    while (occupied() < available && safety-- > 0) {
      const candidate = pickExpandCandidate();
      if (!candidate) break;
      const natural = this.naturalWidths.get(candidate) ?? 0;
      const current = candidate.offsetWidth;
      const projected = occupied() + (natural - current);
      if (projected > available) break;
      candidate.removeAttribute('data-resolved-size');
      mutated = true;
    }

    // Re-measure once more if we mutated; layout may settle into a new state
    // that itself crosses a threshold (e.g. expanding one then needing to
    // collapse another).
    if (mutated) {
      this.scheduleReflow();
      return;
    }

    this.diffCollapsedGroupsAndAnnounce(groups);
  }

  /**
   * Diff the popped set against the previous frame and announce threshold
   * crossings via the live region. Shared by both reflow paths (priority
   * default + author reduceOrder).
   */
  private diffCollapsedGroupsAndAnnounce(groups: HTMLElement[]): void {
    const nowCollapsed = new Set<HTMLElement>();
    for (const group of groups) {
      if (group.getAttribute('data-resolved-size') === 'popup') {
        nowCollapsed.add(group);
        const label = group.getAttribute('label') ?? '';
        if (label) this.collapsedGroupLabels.set(group, label);
      }
    }
    for (const group of nowCollapsed) {
      if (!this.previousCollapsedGroups.has(group)) {
        const label =
          this.collapsedGroupLabels.get(group) ?? group.getAttribute('label') ?? '';
        if (label) this.liveAnnouncer.announce(`${label} group collapsed`);
      }
    }
    for (const group of this.previousCollapsedGroups) {
      if (!nowCollapsed.has(group)) {
        const label = this.collapsedGroupLabels.get(group) ?? '';
        if (label) this.liveAnnouncer.announce(`${label} group expanded`);
      }
    }
    this.previousCollapsedGroups.clear();
    for (const group of nowCollapsed) this.previousCollapsedGroups.add(group);
  }

  /**
   * FR-6: walk an author-declared reduceOrder list. Returns true if any
   * mutation happened (caller re-runs the reflow to settle).
   *
   * - On shrink (occupied > available): apply more steps from the front of
   *   the list, advancing the per-tab `appliedReduceSteps` counter.
   * - On grow (occupied < available): revert the most-recently-applied
   *   step IF the reverted layout would still fit. Walks the prefix of the
   *   list to recompute the "size before step N" for the reverted group.
   * - Groups with `auto-scale="false"` are still skipped — even if the
   *   author lists a step for them, we drop a console.warn at validate
   *   time and the runtime treats it as a no-op.
   */
  private applyAuthorReduceOrder(
    tab: HTMLElement,
    groups: HTMLElement[],
    steps: readonly RibbonReduceStep[],
    idealSizes: Record<string, RibbonGroupSize>
  ): boolean {
    const gap = 8;
    const available = tab.clientWidth;
    const occupied = () =>
      groups.reduce(
        (sum, g, i) => sum + g.offsetWidth + (i > 0 ? gap : 0),
        0
      );
    const groupById = (id: string) =>
      groups.find((g) => g.getAttribute('group-id') === id) ?? null;

    let applied = this.appliedReduceSteps.get(tab) ?? 0;
    let mutated = false;

    // Walk forward through steps while we still don't fit.
    let safety = steps.length - applied;
    while (occupied() > available && applied < steps.length && safety-- > 0) {
      const [groupId, target] = steps[applied];
      const group = groupById(groupId);
      if (!group || group.getAttribute('auto-scale') === 'false') {
        applied++;
        continue;
      }
      this.applyGroupSize(group, target, idealSizes);
      applied++;
      mutated = true;
    }

    // Walk backward while we have headroom. Revert the most-recently-applied
    // step, but only if the projected layout still fits.
    safety = applied;
    while (applied > 0 && safety-- > 0) {
      const [groupId] = steps[applied - 1];
      const group = groupById(groupId);
      if (!group) {
        applied--;
        continue;
      }
      const projectedSize = this.sizeAtStepIndex(steps, applied - 1, groupId, idealSizes);
      const currentSize = this.sizeAtStepIndex(steps, applied, groupId, idealSizes);
      // Try the revert tentatively; measure.
      this.applyGroupSize(group, projectedSize, idealSizes);
      if (occupied() > available) {
        // Doesn't fit — roll back.
        this.applyGroupSize(group, currentSize, idealSizes);
        break;
      }
      applied--;
      mutated = true;
    }

    this.appliedReduceSteps.set(tab, applied);
    return mutated;
  }

  /**
   * Compute the resolved size of `groupId` after the first `count` steps of
   * `steps` have been applied. The starting point is `idealSizes[groupId]`
   * or `large` if unset.
   */
  private sizeAtStepIndex(
    steps: readonly RibbonReduceStep[],
    count: number,
    groupId: string,
    idealSizes: Record<string, RibbonGroupSize>
  ): RibbonGroupSize {
    let size: RibbonGroupSize = idealSizes[groupId] ?? 'large';
    for (let i = 0; i < count; i++) {
      if (steps[i][0] === groupId) size = steps[i][1];
    }
    return size;
  }

  /**
   * Apply a resolved size to a group + mutate slotted item sizes so the
   * intermediate (`medium` / `small`) sizes have a visible effect. Saves
   * each item's original `size` to `originalItemSizes` the first time the
   * group downsizes, so going back to `large` restores it.
   */
  private applyGroupSize(
    group: HTMLElement,
    target: RibbonGroupSize,
    idealSizes: Record<string, RibbonGroupSize>
  ): void {
    if (target === 'popup') {
      group.setAttribute('data-resolved-size', 'popup');
      return;
    }
    if (target === 'large') {
      group.removeAttribute('data-resolved-size');
    } else {
      group.setAttribute('data-resolved-size', target);
    }
    const items = this.collectGroupItems(group);
    for (const item of items) {
      if (!this.originalItemSizes.has(item)) {
        const cur = (item.getAttribute('size') as RibbonItemSize) ?? 'medium';
        this.originalItemSizes.set(item, cur);
      }
      const original = this.originalItemSizes.get(item)!;
      const next = this.deriveItemSize(original, target);
      if (item.getAttribute('size') !== next) {
        item.setAttribute('size', next);
      }
    }
    // Mark groupId so other code can read this group's idealSize.
    void idealSizes;
  }

  /**
   * Compute the rendered item size given its consumer-declared "original"
   * size and the group's resolved size. Items can only ever shrink, never
   * grow above their original.
   */
  private deriveItemSize(
    original: RibbonItemSize,
    groupSize: Exclude<RibbonGroupSize, 'popup'>
  ): RibbonItemSize {
    if (groupSize === 'large') return original;
    if (groupSize === 'small') return 'small';
    // groupSize === 'medium' — downsize large → medium; keep medium/small.
    return original === 'large' ? 'medium' : original;
  }

  private collectGroupItems(group: HTMLElement): HTMLElement[] {
    return Array.from(
      group.querySelectorAll<HTMLElement>(
        'mp-ribbon-button, mp-ribbon-toggle-button, mp-ribbon-checkbox, mp-ribbon-combobox, ' +
          'mp-ribbon-color-picker, mp-ribbon-group-button, mp-ribbon-split-button, ' +
          'mp-ribbon-dropdown-button, mp-ribbon-gallery'
      )
    );
  }

  /**
   * Returns the `<mp-ribbon-group>` elements assigned to the active tab's slot.
   * Handles both raw web-component usage and the Angular `<bs-ribbon-group>`
   * wrapper (which delegates to an inner `<mp-ribbon-group>` via Angular's
   * `display: contents` host). The slot lives in `mp-ribbon-tab`'s shadow
   * root since each tab owns its own default slot.
   */
  private collectActiveGroups(panel: HTMLElement): HTMLElement[] {
    const slot = panel.shadowRoot?.querySelector<HTMLSlotElement>('slot');
    if (!slot) return [];
    const groups: HTMLElement[] = [];
    for (const assigned of slot.assignedElements()) {
      if (assigned.tagName === 'MP-RIBBON-GROUP') {
        groups.push(assigned as HTMLElement);
        continue;
      }
      const inner = assigned.querySelector<HTMLElement>('mp-ribbon-group');
      if (inner) groups.push(inner);
    }
    return groups;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-ribbon')) {
  customElements.define('mp-ribbon', MpRibbon);
}

// `mp-card` is the single card web component. The former mp-card-* sub-elements
// (header/body/footer/title/text/img/link/group) were collapsed away: consumers
// (or the framework BsCard* wrappers) project plain class-carrying elements
// (`.card-header`, `.card-body`, …) into <mp-card>'s slot, which mp-card styles
// via :host + ::slotted plus the global card sheet.
export * from './mp-card.element';
export * from './card-classes';
export * from './types/card-image-position';
export * from './types/card-header-nav-style';

import { createContext } from 'react';

/** Where a navbar node is authored: inside how many dropdowns (-1 = none). */
export interface NavbarNesting {
  readonly depth: number;
}

export const NavbarNestingContext = createContext<NavbarNesting>({ depth: -1 });

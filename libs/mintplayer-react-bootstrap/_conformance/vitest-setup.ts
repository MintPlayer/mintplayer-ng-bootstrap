/* React 19 requires this flag before `act()` will run; without it every render in
   the passthrough spec warns and the assertions race the commit. */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

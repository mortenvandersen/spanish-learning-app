import { useMemo } from 'react';
import {
  color,
  fontFamily,
  radius,
  space,
  text,
  type ColorScheme,
} from './tokens';

export interface Theme {
  scheme: ColorScheme;
  color: (typeof color)[ColorScheme];
  space: typeof space;
  radius: typeof radius;
  text: typeof text;
  fontFamily: typeof fontFamily;
}

// Light is forced during the redesign-light branch experiment. To restore
// system-scheme behaviour, re-import useColorScheme and switch based on it.
const FORCED_SCHEME: ColorScheme = 'light';

export function useTheme(): Theme {
  const scheme = FORCED_SCHEME;
  return useMemo(
    () => ({
      scheme,
      color: color[scheme],
      space,
      radius,
      text,
      fontFamily,
    }),
    [scheme],
  );
}

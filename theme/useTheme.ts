import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
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

/**
 * App theme keyed by the device colour scheme. Defaults to dark when the
 * system reports neither — this app is designed dark-first.
 */
export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = systemScheme === 'light' ? 'light' : 'dark';
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

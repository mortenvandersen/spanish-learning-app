/**
 * Design tokens for the Spanish Learning App.
 *
 * Dark-first, indigo accent, two-font system (Inter for UI + Source Serif 4
 * for long-form Spanish prose in the reader). Spacing is a 4-point grid;
 * radius and typography are named scales.
 *
 * Consume tokens via `useTheme()` (theme/useTheme.ts) — that hook picks the
 * right palette based on the device colour scheme and bundles the static
 * scales (space, radius, text, fontFamily) for ergonomic access.
 */

import type { TextStyle } from 'react-native';

export const color = {
  dark: {
    bg: '#0E1014',
    surface: '#171A21',
    surfaceElevated: '#1F232C',
    border: '#252A33',
    text: '#E8EAED',
    textMuted: '#8B95A6',
    textDim: '#5A6373',
    accent: '#3B5BFE',
    accentMuted: '#2A3A88',
    captured: '#FFC107',
    danger: '#E5484D',
    backdrop: 'rgba(0, 0, 0, 0.55)',
  },
  // Light palette — bright blue primary + yellow accent on a soft blue-tinted
  // background. Cards stay pure white so they "lift" off the bg with shadow.
  light: {
    bg: '#F2F5FE',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    border: '#E5E9F2',
    text: '#1A2238',
    textMuted: '#6B7280',
    textDim: '#9CA3AF',
    accent: '#2D52FF',
    accentMuted: '#D9E0FF',
    captured: '#FFC107',
    danger: '#E5484D',
    backdrop: 'rgba(20, 25, 50, 0.35)',
  },
} as const;

export type ColorScheme = keyof typeof color;
export type ColorName = keyof typeof color.dark;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export type SpaceToken = keyof typeof space;

export const radius = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 22,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radius;

/**
 * Font-family identifiers, matching the keys passed to `useFonts(...)` in
 * the root layout. Components reference these constants so a font swap is
 * a single-line change.
 */
export const fontFamily = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  serif: 'SourceSerif4_400Regular',
} as const;

/**
 * Typography variants. Each entry is a complete TextStyle ready to spread
 * onto a Text. Color is intentionally left off — consumers pair it with
 * `theme.color.text` or `theme.color.textMuted` so the same variant adapts
 * to whatever role the text is playing.
 */
export const text = {
  caption: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  tiny: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
  } satisfies TextStyle,
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 21,
  } satisfies TextStyle,
  bodyEm: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 15,
    lineHeight: 21,
  } satisfies TextStyle,
  subtitle: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 17,
    lineHeight: 22,
  } satisfies TextStyle,
  heading: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  } satisfies TextStyle,
  display: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  } satisfies TextStyle,
  reader: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    lineHeight: 28,
  } satisfies TextStyle,
} as const;

export type TextVariant = keyof typeof text;

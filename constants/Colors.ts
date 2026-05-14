export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',
    border: '#e0e0e0',
    captured: '#ffe082',
    muted: '#687076',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#ffffff',
    border: '#2c2c2e',
    captured: '#8a6d00',
    muted: '#9BA1A6',
  },
} as const;

export type ColorScheme = keyof typeof Colors;

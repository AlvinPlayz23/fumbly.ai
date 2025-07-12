/**
 * @license
 * Copyright 2025 Fumbly AI
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ColorsTheme, Theme } from './theme.js';

// OpenCode-inspired dark theme with professional blue palette
const openCodeDarkColors: ColorsTheme = {
  type: 'dark',
  Background: '#1A1A1A',
  Foreground: '#E8E8E8',
  LightBlue: '#5DADE2',
  AccentBlue: '#3498DB',
  AccentPurple: '#BB8FCE',
  AccentCyan: '#48C9B0',
  AccentGreen: '#58D68D',
  AccentYellow: '#F7DC6F',
  AccentRed: '#F1948A',
  Comment: '#AEB6BF',
  Gray: '#85929E',
  GradientColors: ['#5DADE2', '#3498DB', '#48C9B0'],
};

export const OpenCodeDark = new Theme('opencode-dark', 'dark', {
  'hljs': { color: openCodeDarkColors.Foreground },
  'hljs-keyword': { color: openCodeDarkColors.AccentBlue },
  'hljs-string': { color: openCodeDarkColors.AccentGreen },
  'hljs-comment': { color: openCodeDarkColors.Comment },
  'hljs-number': { color: openCodeDarkColors.AccentYellow },
  'hljs-function': { color: openCodeDarkColors.AccentPurple },
}, openCodeDarkColors);

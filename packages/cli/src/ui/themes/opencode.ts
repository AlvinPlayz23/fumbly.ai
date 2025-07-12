/**
 * @license
 * Copyright 2025 Fumbly AI
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ColorsTheme, Theme } from './theme.js';

// OpenCode-inspired professional theme with clean blue palette
const openCodeColors: ColorsTheme = {
  type: 'light',
  Background: '#FFFFFF',
  Foreground: '#2C3E50',
  LightBlue: '#3498DB',
  AccentBlue: '#2980B9',
  AccentPurple: '#8E44AD',
  AccentCyan: '#16A085',
  AccentGreen: '#27AE60',
  AccentYellow: '#F39C12',
  AccentRed: '#E74C3C',
  Comment: '#7F8C8D',
  Gray: '#95A5A6',
  GradientColors: ['#3498DB', '#2980B9', '#1ABC9C'],
};

export const OpenCode = new Theme('opencode', 'light', {
  'hljs': { color: openCodeColors.Foreground },
  'hljs-keyword': { color: openCodeColors.AccentBlue },
  'hljs-string': { color: openCodeColors.AccentGreen },
  'hljs-comment': { color: openCodeColors.Comment },
  'hljs-number': { color: openCodeColors.AccentYellow },
  'hljs-function': { color: openCodeColors.AccentPurple },
}, openCodeColors);

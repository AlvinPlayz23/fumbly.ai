#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Fumbly AI
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render } from 'ink';
import { AnimationDemo } from '../packages/cli/dist/src/ui/components/AnimationDemo.js';

// Get terminal width
const terminalWidth = process.stdout.columns || 80;

// Render the animation demo
const { unmount } = render(React.createElement(AnimationDemo, { terminalWidth }));

// Handle cleanup
process.on('SIGINT', () => {
  unmount();
  process.exit(0);
});

process.on('SIGTERM', () => {
  unmount();
  process.exit(0);
});

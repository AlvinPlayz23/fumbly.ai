/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { type Config } from 'fumbly-cli-core';

interface TipsProps {
  config: Config;
}

export const Tips: React.FC<TipsProps> = ({ config }) => {
  const geminiMdFileCount = config.getGeminiMdFileCount();
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={Colors.Foreground}>
        <Text bold color={Colors.AccentPurple}>Welcome to Fumbly AI CLI!</Text> Tips for getting started:
      </Text>
      <Text color={Colors.Foreground}>
        1. Ask questions, edit files, or run commands naturally.
      </Text>
      <Text color={Colors.Foreground}>
        2. Use <Text bold color={Colors.AccentPurple}>@filename</Text> to include files in context.
      </Text>
      <Text color={Colors.Foreground}>
        3. Try <Text bold color={Colors.AccentPurple}>/model list</Text> to see available AI models.
      </Text>
      <Text color={Colors.Foreground}>
        4. Use <Text bold color={Colors.AccentPurple}>Ctrl+X</Text> or <Text bold color={Colors.AccentPurple}>F2</Text> to open external editor for complex prompts.
      </Text>
      <Text color={Colors.Foreground}>
        5. Type <Text bold color={Colors.AccentPurple}>/help</Text> for more commands and shortcuts.
      </Text>
      {geminiMdFileCount === 0 && (
        <Text color={Colors.Foreground}>
          6. Create{' '}
          <Text bold color={Colors.AccentPurple}>
            GEMINI.md
          </Text>{' '}
          files to customize your interactions with the AI.
        </Text>
      )}
      <Text color={Colors.Foreground}>
        {geminiMdFileCount === 0 ? '4.' : '3.'}{' '}
        <Text bold color={Colors.AccentPurple}>
          /help
        </Text>{' '}
        for more information.
      </Text>
    </Box>
  );
};

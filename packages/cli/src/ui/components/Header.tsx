/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { Colors } from '../colors.js';
import { shortAsciiLogo, longAsciiLogo } from './AsciiArt.js';
import { getAsciiArtWidth } from '../utils/textUtils.js';
import { AnimatedHeader } from './AnimatedHeader.js';

interface HeaderProps {
  customAsciiArt?: string; // For user-defined ASCII art
  terminalWidth: number; // For responsive logo
  animated?: boolean; // Whether to use animations
  animationType?: 'fade' | 'typewriter' | 'slide' | 'none';
  logoStyle?: 'original' | 'opencode' | 'minimal' | 'modern' | 'professional';
}

export const Header: React.FC<HeaderProps> = ({
  customAsciiArt,
  terminalWidth,
  animated = false,
  animationType = 'fade',
  logoStyle = 'original',
}) => {
  // Use AnimatedHeader if animations are enabled
  if (animated) {
    return (
      <AnimatedHeader
        customAsciiArt={customAsciiArt}
        terminalWidth={terminalWidth}
        animationType={animationType}
        logoStyle={logoStyle}
      />
    );
  }

  // Original static header logic
  let displayTitle;
  const widthOfLongLogo = getAsciiArtWidth(longAsciiLogo);

  if (customAsciiArt) {
    displayTitle = customAsciiArt;
  } else {
    displayTitle =
      terminalWidth >= widthOfLongLogo ? longAsciiLogo : shortAsciiLogo;
  }

  const artWidth = getAsciiArtWidth(displayTitle);

  return (
    <Box
      marginBottom={1}
      alignItems="flex-start"
      width={artWidth}
      flexShrink={0}
    >
      {Colors.GradientColors ? (
        <Gradient colors={Colors.GradientColors}>
          <Text>{displayTitle}</Text>
        </Gradient>
      ) : (
        <Text>{displayTitle}</Text>
      )}
    </Box>
  );
};

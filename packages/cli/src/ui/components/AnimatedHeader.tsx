/**
 * @license
 * Copyright 2025 Fumbly AI
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { Colors } from '../colors.js';
import { 
  shortAsciiLogo, 
  longAsciiLogo, 
  openCodeStyleShort, 
  openCodeStyleLong,
  openCodeStyleMinimal,
  modernTechStyle,
  professionalStyle
} from './AsciiArt.js';
import { getAsciiArtWidth } from '../utils/textUtils.js';

interface AnimatedHeaderProps {
  customAsciiArt?: string;
  terminalWidth: number;
  animationType?: 'fade' | 'typewriter' | 'slide' | 'none';
  logoStyle?: 'original' | 'opencode' | 'minimal' | 'modern' | 'professional';
  animationSpeed?: number; // milliseconds
}

export const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({
  customAsciiArt,
  terminalWidth,
  animationType = 'fade',
  logoStyle = 'original',
  animationSpeed = 50,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Select logo based on style and terminal width
  const getLogoText = (): string => {
    if (customAsciiArt) return customAsciiArt;

    switch (logoStyle) {
      case 'opencode':
        return terminalWidth >= getAsciiArtWidth(openCodeStyleLong) 
          ? openCodeStyleLong 
          : openCodeStyleShort;
      case 'minimal':
        return openCodeStyleMinimal;
      case 'modern':
        return modernTechStyle;
      case 'professional':
        return professionalStyle;
      default:
        return terminalWidth >= getAsciiArtWidth(longAsciiLogo) 
          ? longAsciiLogo 
          : shortAsciiLogo;
    }
  };

  const fullText = getLogoText();

  useEffect(() => {
    if (animationType === 'none') {
      setDisplayText(fullText);
      setIsAnimating(false);
      return;
    }

    if (animationType === 'typewriter') {
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          setDisplayText(fullText.slice(0, nextIndex));
          
          if (nextIndex >= fullText.length) {
            setIsAnimating(false);
            clearInterval(timer);
          }
          
          return nextIndex;
        });
      }, animationSpeed);

      return () => clearInterval(timer);
    }

    if (animationType === 'fade') {
      // Simple fade effect by showing text after a delay
      const timer = setTimeout(() => {
        setDisplayText(fullText);
        setIsAnimating(false);
      }, animationSpeed * 10);

      return () => clearTimeout(timer);
    }

    // Default: show immediately
    setDisplayText(fullText);
    setIsAnimating(false);
  }, [fullText, animationType, animationSpeed]);

  const artWidth = getAsciiArtWidth(displayText);

  return (
    <Box
      marginBottom={1}
      alignItems="flex-start"
      width={artWidth}
      flexShrink={0}
    >
      {Colors.GradientColors ? (
        <Gradient colors={Colors.GradientColors}>
          <Text>{displayText}</Text>
        </Gradient>
      ) : (
        <Text>{displayText}</Text>
      )}
      {isAnimating && animationType === 'typewriter' && (
        <Text>▊</Text>
      )}
    </Box>
  );
};

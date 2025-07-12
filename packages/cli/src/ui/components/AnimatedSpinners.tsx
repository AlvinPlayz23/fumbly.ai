/**
 * @license
 * Copyright 2025 Fumbly AI
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { Colors } from '../colors.js';

interface SpinnerProps {
  type?: 'dots' | 'line' | 'arc' | 'bounce' | 'pulse' | 'modern';
  text?: string;
  color?: string;
  speed?: number; // milliseconds
}

export const AnimatedSpinner: React.FC<SpinnerProps> = ({
  type = 'dots',
  text = 'Loading...',
  speed = 100,
}) => {
  const [frame, setFrame] = useState(0);

  const spinnerFrames = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    line: ['|', '/', '-', '\\'],
    arc: ['◜', '◠', '◝', '◞', '◡', '◟'],
    bounce: ['⠁', '⠂', '⠄', '⠂'],
    pulse: ['●', '◐', '○', '◑'],
    modern: ['▰▱▱▱', '▰▰▱▱', '▰▰▰▱', '▰▰▰▰', '▱▰▰▰', '▱▱▰▰', '▱▱▱▰', '▱▱▱▱'],
  };

  const frames = spinnerFrames[type];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prevFrame) => (prevFrame + 1) % frames.length);
    }, speed);

    return () => clearInterval(timer);
  }, [frames.length, speed]);

  return (
    <Box>
      {Colors.GradientColors ? (
        <Gradient colors={Colors.GradientColors}>
          <Text>{frames[frame]} {text}</Text>
        </Gradient>
      ) : (
        <Text color={Colors.AccentBlue}>
          {frames[frame]} {text}
        </Text>
      )}
    </Box>
  );
};

interface ProgressBarProps {
  progress: number; // 0-100
  width?: number;
  showPercentage?: boolean;
  style?: 'blocks' | 'dots' | 'line' | 'modern';
  text?: string;
}

export const AnimatedProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  width = 30,
  showPercentage = true,
  style = 'blocks',
  text,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const filledWidth = Math.round((clampedProgress / 100) * width);
  const emptyWidth = width - filledWidth;

  const getProgressChars = () => {
    switch (style) {
      case 'blocks':
        return { filled: '█', empty: '░' };
      case 'dots':
        return { filled: '●', empty: '○' };
      case 'line':
        return { filled: '━', empty: '─' };
      case 'modern':
        return { filled: '▰', empty: '▱' };
      default:
        return { filled: '█', empty: '░' };
    }
  };

  const { filled, empty } = getProgressChars();
  const progressBar = filled.repeat(filledWidth) + empty.repeat(emptyWidth);

  return (
    <Box flexDirection="column">
      {text && <Text>{text}</Text>}
      <Box>
        <Text>[</Text>
        {Colors.GradientColors ? (
          <Gradient colors={Colors.GradientColors}>
            <Text>{progressBar}</Text>
          </Gradient>
        ) : (
          <Text color={Colors.AccentBlue}>{progressBar}</Text>
        )}
        <Text>]</Text>
        {showPercentage && (
          <Text> {clampedProgress.toFixed(0)}%</Text>
        )}
      </Box>
    </Box>
  );
};

interface PulsingTextProps {
  text: string;
  speed?: number;
  colors?: string[];
}

export const PulsingText: React.FC<PulsingTextProps> = ({
  text,
  speed = 500,
  colors,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, speed);

    return () => clearInterval(timer);
  }, [speed]);

  if (!isVisible) {
    return <Text> </Text>;
  }

  return (
    <Box>
      {colors || Colors.GradientColors ? (
        <Gradient colors={colors || Colors.GradientColors || [Colors.AccentBlue]}>
          <Text>{text}</Text>
        </Gradient>
      ) : (
        <Text color={Colors.AccentBlue}>{text}</Text>
      )}
    </Box>
  );
};

// Animated dots for loading states
export const LoadingDots: React.FC<{ text?: string }> = ({ text = 'Processing' }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((prevDots) => {
        if (prevDots.length >= 3) return '';
        return prevDots + '.';
      });
    }, 500);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box>
      <Text>{text}{dots}</Text>
    </Box>
  );
};

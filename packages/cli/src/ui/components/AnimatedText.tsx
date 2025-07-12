/**
 * @license
 * Copyright 2025 Fumbly AI
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { Colors } from '../colors.js';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  showCursor?: boolean;
  onComplete?: () => void;
  color?: string;
  useGradient?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 50,
  showCursor = true,
  onComplete,
  color,
  useGradient = false,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursorState, setShowCursorState] = useState(true);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  useEffect(() => {
    if (showCursor) {
      const cursorTimer = setInterval(() => {
        setShowCursorState((prev) => !prev);
      }, 500);

      return () => clearInterval(cursorTimer);
    }
  }, [showCursor]);

  const cursor = showCursor && showCursorState ? '▊' : ' ';

  return (
    <Box>
      {useGradient && Colors.GradientColors ? (
        <Gradient colors={Colors.GradientColors}>
          <Text>{displayText}{cursor}</Text>
        </Gradient>
      ) : (
        <Text color={color || Colors.Foreground}>
          {displayText}{cursor}
        </Text>
      )}
    </Box>
  );
};

interface FadeInTextProps {
  text: string;
  delay?: number;
  duration?: number;
  color?: string;
  useGradient?: boolean;
}

export const FadeInText: React.FC<FadeInTextProps> = ({
  text,
  delay = 0,
  color,
  useGradient = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!isVisible) {
    return <Text> </Text>;
  }

  return (
    <Box>
      {useGradient && Colors.GradientColors ? (
        <Gradient colors={Colors.GradientColors}>
          <Text>{text}</Text>
        </Gradient>
      ) : (
        <Text color={color || Colors.Foreground}>{text}</Text>
      )}
    </Box>
  );
};

interface ColorCycleTextProps {
  text: string;
  colors: string[];
  speed?: number;
}

export const ColorCycleText: React.FC<ColorCycleTextProps> = ({
  text,
  colors,
  speed = 1000,
}) => {
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setColorIndex((prevIndex) => (prevIndex + 1) % colors.length);
    }, speed);

    return () => clearInterval(timer);
  }, [colors.length, speed]);

  return (
    <Box>
      <Text color={colors[colorIndex]}>{text}</Text>
    </Box>
  );
};

interface HighlightTextProps {
  text: string;
  highlightWords: string[];
  highlightColor?: string;
  useGradient?: boolean;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  highlightWords,
  highlightColor,
  useGradient = false,
}) => {
  const renderHighlightedText = () => {
    let result = text;
    const parts: Array<{ text: string; isHighlighted: boolean }> = [];
    
    // Simple word highlighting - can be improved with regex
    const words = text.split(' ');
    
    return words.map((word, index) => {
      const isHighlighted = highlightWords.some(hw => 
        word.toLowerCase().includes(hw.toLowerCase())
      );
      
      const displayWord = index === words.length - 1 ? word : word + ' ';
      
      if (isHighlighted) {
        return (
          <Text key={index}>
            {useGradient && Colors.GradientColors ? (
              <Gradient colors={Colors.GradientColors}>
                {displayWord}
              </Gradient>
            ) : (
              <Text color={highlightColor || Colors.AccentBlue}>
                {displayWord}
              </Text>
            )}
          </Text>
        );
      }
      
      return <Text key={index}>{displayWord}</Text>;
    });
  };

  return <Box>{renderHighlightedText()}</Box>;
};

interface BouncingTextProps {
  text: string;
  speed?: number;
  color?: string;
}

export const BouncingText: React.FC<BouncingTextProps> = ({
  text,
  speed = 200,
  color,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % text.length);
    }, speed);

    return () => clearInterval(timer);
  }, [text.length, speed]);

  return (
    <Box>
      {text.split('').map((char, index) => (
        <Text
          key={index}
          color={index === activeIndex ? (color || Colors.AccentBlue) : Colors.Foreground}
        >
          {char}
        </Text>
      ))}
    </Box>
  );
};

interface GlitchTextProps {
  text: string;
  glitchChars?: string[];
  speed?: number;
  intensity?: number; // 0-100
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  glitchChars = ['!', '@', '#', '$', '%', '^', '&', '*'],
  speed = 100,
  intensity = 20,
}) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.random() * 100 < intensity) {
        const glitchedText = text
          .split('')
          .map(char => {
            if (Math.random() * 100 < intensity / 2) {
              return glitchChars[Math.floor(Math.random() * glitchChars.length)];
            }
            return char;
          })
          .join('');
        
        setDisplayText(glitchedText);
        
        // Reset to original text after a short delay
        setTimeout(() => setDisplayText(text), speed / 2);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, glitchChars, speed, intensity]);

  return (
    <Box>
      <Text color={Colors.AccentRed}>{displayText}</Text>
    </Box>
  );
};

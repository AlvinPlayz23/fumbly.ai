/**
 * @license
 * Copyright 2025 Fumbly AI
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from './Header.js';
import { 
  AnimatedSpinner, 
  AnimatedProgressBar, 
  PulsingText, 
  LoadingDots 
} from './AnimatedSpinners.js';
import { 
  TypewriterText, 
  FadeInText, 
  ColorCycleText, 
  HighlightText, 
  BouncingText, 
  GlitchText 
} from './AnimatedText.js';

interface AnimationDemoProps {
  terminalWidth: number;
}

export const AnimationDemo: React.FC<AnimationDemoProps> = ({ terminalWidth }) => {
  const [currentDemo, setCurrentDemo] = useState(0);
  const [progress, setProgress] = useState(0);

  const demos = [
    'Logo Styles',
    'Spinners',
    'Progress Bars',
    'Text Effects',
    'Interactive Elements'
  ];

  useInput((input, key) => {
    if (key.rightArrow || input === 'n') {
      setCurrentDemo((prev) => (prev + 1) % demos.length);
    } else if (key.leftArrow || input === 'p') {
      setCurrentDemo((prev) => (prev - 1 + demos.length) % demos.length);
    }
  });

  // Simulate progress for demo
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev + 1) % 101);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const renderLogoDemo = () => (
    <Box flexDirection="column" gap={1}>
      <Text>🎨 Logo Style Variations (Press n/p to navigate)</Text>
      <Box flexDirection="column" gap={1}>
        <Text>Original Style:</Text>
        <Header terminalWidth={terminalWidth} logoStyle="original" />
        
        <Text>OpenCode Style:</Text>
        <Header terminalWidth={terminalWidth} logoStyle="opencode" animated animationType="fade" />
        
        <Text>Minimal Style:</Text>
        <Header terminalWidth={terminalWidth} logoStyle="minimal" animated animationType="typewriter" />
        
        <Text>Modern Style:</Text>
        <Header terminalWidth={terminalWidth} logoStyle="modern" />
        
        <Text>Professional Style:</Text>
        <Header terminalWidth={terminalWidth} logoStyle="professional" />
      </Box>
    </Box>
  );

  const renderSpinnerDemo = () => (
    <Box flexDirection="column" gap={1}>
      <Text>⚡ Loading Spinners</Text>
      <AnimatedSpinner type="dots" text="Loading with dots..." />
      <AnimatedSpinner type="line" text="Loading with line..." />
      <AnimatedSpinner type="arc" text="Loading with arc..." />
      <AnimatedSpinner type="bounce" text="Loading with bounce..." />
      <AnimatedSpinner type="pulse" text="Loading with pulse..." />
      <AnimatedSpinner type="modern" text="Loading with modern style..." />
      <LoadingDots text="Processing" />
      <PulsingText text="🔥 Important Notice" />
    </Box>
  );

  const renderProgressDemo = () => (
    <Box flexDirection="column" gap={1}>
      <Text>📊 Progress Indicators</Text>
      <AnimatedProgressBar progress={progress} style="blocks" text="Blocks Style:" />
      <AnimatedProgressBar progress={progress} style="dots" text="Dots Style:" />
      <AnimatedProgressBar progress={progress} style="line" text="Line Style:" />
      <AnimatedProgressBar progress={progress} style="modern" text="Modern Style:" />
      <AnimatedProgressBar progress={75} width={20} text="Fixed Progress:" />
    </Box>
  );

  const renderTextEffectsDemo = () => (
    <Box flexDirection="column" gap={1}>
      <Text>✨ Text Effects</Text>
      <TypewriterText text="This text appears with typewriter effect..." useGradient />
      <FadeInText text="This text fades in after a delay" delay={1000} useGradient />
      <ColorCycleText 
        text="This text cycles through colors" 
        colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']} 
      />
      <HighlightText 
        text="This text has highlighted important words" 
        highlightWords={['highlighted', 'important']}
        useGradient
      />
      <BouncingText text="BOUNCING TEXT" />
      <GlitchText text="GLITCH EFFECT" intensity={30} />
    </Box>
  );

  const renderInteractiveDemo = () => (
    <Box flexDirection="column" gap={1}>
      <Text>🎮 Interactive Elements</Text>
      <Text>Use arrow keys or n/p to navigate between demos</Text>
      <Text>Current demo: {demos[currentDemo]} ({currentDemo + 1}/{demos.length})</Text>
      <Box marginTop={1}>
        <Text>🎯 Try different themes with: </Text>
        <Text color="cyan">fumbly --theme opencode</Text>
      </Box>
      <Box marginTop={1}>
        <Text>🎨 Available themes: opencode, opencode-dark, default, github-dark, etc.</Text>
      </Box>
    </Box>
  );

  const renderCurrentDemo = () => {
    switch (currentDemo) {
      case 0: return renderLogoDemo();
      case 1: return renderSpinnerDemo();
      case 2: return renderProgressDemo();
      case 3: return renderTextEffectsDemo();
      case 4: return renderInteractiveDemo();
      default: return renderLogoDemo();
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text>🚀 Fumbly CLI - Animation Showcase</Text>
      </Box>
      {renderCurrentDemo()}
      <Box marginTop={1}>
        <Text dimColor>Press ← → or p/n to navigate • Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
};

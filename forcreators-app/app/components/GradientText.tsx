// app/components/GradientText.tsx
import React from 'react';
import { Text, StyleSheet, Platform, TextProps } from 'react-native';

type Props = TextProps & {
  children: React.ReactNode;
};

const GradientText: React.FC<Props> = ({ style, children, ...rest }) => {
  if (Platform.OS === 'web') {
    // Web: stesso gradiente del sito, solo testo, nessun rettangolo
    return (
      <Text
        {...rest}
        style={[style, styles.webGradient]}
      >
        {children}
      </Text>
    );
  }

  // Native (app): fallback a colore indaco, sempre solo testo
  return (
    <Text
      {...rest}
      style={[style, styles.nativeFallback]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  webGradient: {
    backgroundImage: 'linear-gradient(120deg, #6366f1, #ec4899)',
    WebkitBackgroundClip: 'text',
    color: 'transparent' as any,
  },
  nativeFallback: {
    color: '#6366f1',
  },
});

export default GradientText;

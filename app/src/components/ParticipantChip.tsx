import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { participantColor } from '../utils/participantColor';
import { useTheme } from '../theme';

interface Props {
  name: string;
  participantId?: string;
  selected?: boolean;
  onPress?: () => void;
}

export function ParticipantChip({ name, participantId, selected, onPress }: Props) {
  const { colors: C } = useTheme();
  const color = participantColor(participantId ?? name);
  const chipStyle = selected
    ? { backgroundColor: color.bg, borderColor: C.text, borderWidth: 2.5 }
    : { backgroundColor: 'transparent', borderColor: C.border, borderWidth: 1 };
  const textColor = selected ? color.text : C.sub;

  const container = [styles.chip, chipStyle];
  const label = <Text style={[styles.text, { color: textColor }]}>{name}</Text>;

  if (onPress) {
    return (
      <TouchableOpacity style={container} onPress={onPress} activeOpacity={0.7}>
        {label}
      </TouchableOpacity>
    );
  }
  return <View style={container}>{label}</View>;
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});

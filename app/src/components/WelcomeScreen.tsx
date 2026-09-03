import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useParticipants } from '../hooks/useParticipants';
import { createParticipant } from '../api/participants';
import { Group, Participant } from '../types';
import { participantColor } from '../utils/participantColor';
import { useTheme, Colors } from '../theme';

function makeStyles(C: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { padding: 24, paddingTop: 48 },
    header: { alignItems: 'center', marginBottom: 32 },
    emoji: { fontSize: 48, marginBottom: 8 },
    title: { fontSize: 18, color: C.sub },
    groupName: { fontSize: 28, fontWeight: '700', color: C.text, textAlign: 'center' },
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    question: { fontSize: 18, fontWeight: '600', color: C.text, marginBottom: 4 },
    hint: { fontSize: 13, color: C.sub, marginBottom: 20 },
    participantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: { fontWeight: '700', fontSize: 16 },
    participantName: { flex: 1, fontSize: 16, color: C.text },
    chevron: { fontSize: 20, color: C.sub },
    addRow: { paddingTop: 16 },
    addRowText: { color: C.primary, fontSize: 15, fontWeight: '500' },
    addForm: { marginTop: 16 },
    nameInput: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: C.text,
      backgroundColor: C.bg,
      marginBottom: 12,
    },
    addFormActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelBtnText: { color: C.sub, fontWeight: '500' },
    joinBtn: {
      flex: 2,
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    joinBtnDisabled: { opacity: 0.5 },
    joinBtnText: { color: C.white, fontWeight: '600', fontSize: 15 },
    skipRow: { alignItems: 'center', paddingTop: 20 },
    skipText: { color: C.sub, fontSize: 14 },
    emptyState: { alignItems: 'center', paddingVertical: 24 },
    emptyText: { color: C.sub, marginBottom: 16 },
    addBtn: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
    addBtnText: { color: C.white, fontWeight: '600' },
  });
}

interface Props {
  group: Group;
  serverUrl: string;
  token: string;
  onComplete: (participantId: string) => void;
  onSkip?: () => void;
}

export function WelcomeScreen({ group, serverUrl, token, onComplete, onSkip }: Props) {
  const queryClient = useQueryClient();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data: participants, isLoading } = useParticipants(serverUrl, token);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = (p: Participant) => {
    onComplete(p.id);
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setSubmitting(true);
    try {
      const p = await createParticipant(serverUrl, token, name);
      queryClient.invalidateQueries({ queryKey: ['participants', serverUrl, token] });
      onComplete(p.id);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to add participant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>Welcome to</Text>
        <Text style={styles.groupName}>{group.name}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.question}>Who are you in this group?</Text>
        <Text style={styles.hint}>No password needed — this just personalises your view.</Text>

        {isLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />
        ) : (participants ?? []).length === 0 && !showAdd ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No participants yet.</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
              <Text style={styles.addBtnText}>Add yourself</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {(participants ?? []).map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.participantRow}
                onPress={() => handleSelect(p)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: participantColor(p.id).bg }]}>
                  <Text style={[styles.avatarText, { color: participantColor(p.id).text }]}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.participantName}>{p.name}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}

            {!showAdd ? (
              <TouchableOpacity style={styles.addRow} onPress={() => setShowAdd(true)}>
                <Text style={styles.addRowText}>+ I'm not listed yet</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.addForm}>
                <TextInput
                  style={styles.nameInput}
                  placeholder="Your name"
                  placeholderTextColor={C.sub}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  onSubmitEditing={handleAdd}
                  returnKeyType="done"
                />
                <View style={styles.addFormActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => { setShowAdd(false); setNewName(''); }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.joinBtn, (!newName.trim() || submitting) && styles.joinBtnDisabled]}
                    onPress={handleAdd}
                    disabled={!newName.trim() || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color={C.white} size="small" />
                    ) : (
                      <Text style={styles.joinBtnText}>
                        {newName.trim() ? `Join as ${newName.trim()}` : 'Join'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </View>
      {onSkip && (
        <TouchableOpacity style={styles.skipRow} onPress={onSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

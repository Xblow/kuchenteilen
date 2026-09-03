import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useGroupContext } from '../../src/context';
import { useParticipants } from '../../src/hooks/useParticipants';
import { createParticipant, updateParticipant, deleteParticipant } from '../../src/api/participants';
import { Participant } from '../../src/types';
import { participantColor } from '../../src/utils/participantColor';
import { useTheme, Colors } from '../../src/theme';

function makeStyles(C: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    homeBar: {
      backgroundColor: C.card,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    homeLabel: { fontSize: 14, color: C.sub, fontWeight: '600' },
    container: { flex: 1 },
    list: { padding: 16 },
    card: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      gap: 10,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: { fontWeight: '700', fontSize: 16 },
    nameBlock: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: C.text },
    idText: { fontSize: 11, color: C.sub, marginTop: 1, fontFamily: 'monospace' },
    editInput: {
      flex: 1,
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.primary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
      fontSize: 15,
      color: C.text,
    },
    actions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    meBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    meBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
    identityBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    identityBtnText: { fontSize: 12, fontWeight: '700' },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: C.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    penIcon: { fontSize: 16, color: C.primary },
    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteBtnText: { color: C.danger, fontSize: 20, fontWeight: '600', lineHeight: 24 },
    saveBtn: {
      backgroundColor: C.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    saveBtnText: { color: C.white, fontWeight: '600', fontSize: 13 },
    cancelBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: { color: C.sub, fontSize: 14 },
    addSection: { flexDirection: 'row', gap: 8, marginTop: 8 },
    input: {
      flex: 1,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: C.text,
    },
    addBtn: {
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingHorizontal: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addBtnDisabled: { opacity: 0.6 },
    addBtnText: { color: C.white, fontWeight: '600', fontSize: 15 },
  });
}

export default function ParticipantsScreen() {
  const { serverUrl, token, myParticipantId, setIdentity } = useGroupContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data: participants } = useParticipants(serverUrl, token);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['participants', serverUrl, token] });

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createParticipant(serverUrl, token, newName.trim());
      await invalidate();
      setNewName('');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to add participant.');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditName(p.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSave = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updateParticipant(serverUrl, token, id, editName.trim());
      await invalidate();
      cancelEdit();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to rename participant.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p: Participant) => {
    Alert.alert('Remove Participant', `Remove "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteParticipant(serverUrl, token, p.id);
            await invalidate();
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to remove participant.');
          }
        },
      },
    ]);
  };

  const handleSetIdentity = (p: Participant) => {
    setIdentity(p.id);
  };

  const renderItem = ({ item }: { item: Participant }) => {
    const color = participantColor(item.id);
    const isEditing = editingId === item.id;
    const isMe = item.id === myParticipantId;

    return (
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: color.bg }]}>
          <Text style={[styles.avatarText, { color: color.text }]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {isEditing ? (
          <TextInput
            style={styles.editInput}
            value={editName}
            onChangeText={setEditName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => handleSave(item.id)}
          />
        ) : (
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.idText}>{item.id.slice(0, 8)}…</Text>
          </View>
        )}

        <View style={styles.actions}>
          {/* Identity indicator */}
          {!isEditing && (
            isMe ? (
              <View style={[styles.meBadge, { backgroundColor: color.bg }]}>
                <Text style={[styles.meBadgeText, { color: color.text }]}>ME</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.identityBtn, { borderColor: color.text }]}
                onPress={() => handleSetIdentity(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.identityBtnText, { color: color.text }]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </TouchableOpacity>
            )
          )}

          {isEditing ? (
            <>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => handleSave(item.id)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                <Text style={styles.cancelBtnText}>✕</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.iconBtn} onPress={() => startEdit(item)}>
                <Text style={styles.penIcon}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.deleteBtnText}>×</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity style={styles.homeBar} onPress={() => router.replace('/')}>
        <Text style={styles.homeLabel}>🎂 Kuchenteilen</Text>
      </TouchableOpacity>
      <View style={styles.container}>
        <FlatList
          data={participants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListFooterComponent={
            <View style={styles.addSection}>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="New participant name"
                placeholderTextColor={C.sub}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <TouchableOpacity
                style={[styles.addBtn, adding && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={adding}
              >
                <Text style={styles.addBtnText}>{adding ? '…' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    </View>
  );
}

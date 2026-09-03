import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getSavedGroups, removeGroup } from '../src/storage';
import { SavedGroup } from '../src/types';
import { useTheme, Colors } from '../src/theme';

function makeStyles(C: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      backgroundColor: C.card,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    themeToggle: { fontSize: 20 },
    appLabel: { fontSize: 15, color: C.sub, fontWeight: '500' },
    title: { fontSize: 26, fontWeight: '800', color: C.text },
    list: { padding: 16, paddingBottom: 100 },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 18, color: C.sub },
    card: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
    },
    cardContent: { flex: 1 },
    groupName: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 2 },
    groupUrl: { fontSize: 13, color: C.sub },
    deleteBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    deleteBtnText: { fontSize: 16, color: C.danger },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: C.card,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    btnRow: { flexDirection: 'row', gap: 12 },
    addGroupBtn: {
      flex: 1,
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addGroupBtnText: { color: C.white, fontSize: 22, fontWeight: '700', lineHeight: 26 },
    qrBtn: {
      width: 52,
      backgroundColor: C.primaryLight,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qrBtnText: { fontSize: 24 },
  });
}

export default function GroupsScreen() {
  const router = useRouter();
  const { isDark, colors: C, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [groups, setGroups] = useState<SavedGroup[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = useCallback(async () => {
    const saved = await getSavedGroups();
    setGroups(saved);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleDelete = async (group: SavedGroup) => {
    if (Platform.OS === 'web') {
      if (!window.confirm(`Remove "${group.name}" from your device?`)) return;
      await removeGroup(group.token);
      await loadGroups();
    } else {
      Alert.alert('Remove Group', `Remove "${group.name}" from your device?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeGroup(group.token);
            await loadGroups();
          },
        },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.appLabel}>🎂 Kuchenteilen</Text>
          <TouchableOpacity onPress={toggleTheme} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.themeToggle}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.token}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎂</Text>
            <Text style={styles.emptyText}>No groups yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardContent}
              onPress={() =>
                router.push(`/${item.token}?serverUrl=${encodeURIComponent(item.serverUrl)}`)
              }
              activeOpacity={0.7}
            >
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupUrl}>{item.serverUrl}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.bottomBar}>
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.addGroupBtn} onPress={() => router.push('/join')}>
            <Text style={styles.addGroupBtnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qrBtn} onPress={() => router.push('/join?mode=qr')}>
            <Text style={styles.qrBtnText}>▣</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

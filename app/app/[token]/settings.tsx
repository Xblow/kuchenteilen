import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { useGroupContext } from '../../src/context';
import { updateGroup, rotateToken } from '../../src/api/groups';
import { removeGroup, updateGroupName, addGroup } from '../../src/storage';
import { CurrencyPicker } from '../../src/components/CurrencyPicker';
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    homeLabel: { fontSize: 15, color: C.text, fontWeight: '700' },
    themeToggle: { fontSize: 20 },
    container: { flex: 1 },
    content: { padding: 16, paddingBottom: 60 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: C.sub,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 24,
      marginBottom: 8,
    },
    section: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: C.sub,
      marginBottom: 6,
      marginTop: 10,
    },
    input: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: C.text,
      backgroundColor: C.bg,
    },
    multilineInput: { minHeight: 72, textAlignVertical: 'top' },
    btn: {
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 16,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: C.white, fontWeight: '600', fontSize: 15 },
    errorText: { color: C.danger, fontSize: 13, marginTop: 6 },
    currencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    currencyDisplay: { fontSize: 18, fontWeight: '700', color: C.text },
    changeBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: C.primaryLight,
      borderRadius: 8,
    },
    changeBtnText: { color: C.primary, fontWeight: '600', fontSize: 14 },
    shareSection: { alignItems: 'center', paddingVertical: 24, gap: 16 },
    tokenText: { fontSize: 13, color: C.sub, fontFamily: 'monospace', textAlign: 'center' },
    dangerBtn: {
      borderWidth: 1,
      borderColor: C.danger,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: C.dangerLight,
    },
    dangerBtnText: { color: C.danger, fontWeight: '600', fontSize: 15 },
    dangerHint: { fontSize: 12, color: C.sub, marginTop: 6 },
  });
}

export default function SettingsScreen() {
  const { serverUrl, token, group, clearIdentity } = useGroupContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark, colors: C, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const qrValue = JSON.stringify({ s: serverUrl, t: token });

  useEffect(() => {
    setName(group.name);
    setDescription(group.description);
  }, [group.name, group.description]);

  const handleSaveDetails = async () => {
    if (!name.trim()) {
      setDetailsError('Name cannot be empty.');
      return;
    }
    setSavingDetails(true);
    setDetailsError('');
    try {
      await updateGroup(serverUrl, token, { name: name.trim(), description: description.trim() });
      await updateGroupName(token, name.trim());
      queryClient.invalidateQueries({ queryKey: ['group', serverUrl, token] });
    } catch (e: unknown) {
      setDetailsError(e instanceof Error ? e.message : 'Failed to update group.');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleRotateToken = () => {
    Alert.alert(
      'Rotate Token',
      'All devices using the old token will be disconnected. Share the new token/QR with your group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate',
          style: 'destructive',
          onPress: async () => {
            try {
              const { access_token: newToken } = await rotateToken(serverUrl, token);
              await addGroup({ serverUrl, token: newToken, name: group.name });
              await removeGroup(token);
              queryClient.invalidateQueries({ queryKey: ['group', serverUrl, token] });
              router.replace(`/${newToken}?serverUrl=${encodeURIComponent(serverUrl)}`);
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to rotate token.');
            }
          },
        },
      ],
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Remove this group from your device? This only removes it locally.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await removeGroup(token);
            router.replace('/');
          },
        },
      ],
    );
  };

  const handleCurrencySelect = async (_newCurrency: string) => {
    queryClient.invalidateQueries({ queryKey: ['group', serverUrl, token] });
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity style={styles.homeBar} onPress={() => router.back()}>
        <Text style={styles.homeLabel}>{group.name}</Text>
        <Text style={styles.themeToggle} onPress={toggleTheme}>{isDark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Share Group</Text>
      <View style={[styles.section, styles.shareSection]}>
        <QRCode value={qrValue} size={200} />
        <Text style={styles.tokenText} selectable>{token}</Text>
      </View>

      <Text style={styles.sectionTitle}>Group Details</Text>
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Group name"
          placeholderTextColor={C.sub}
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          placeholderTextColor={C.sub}
          multiline
          numberOfLines={3}
        />
        {!!detailsError && <Text style={styles.errorText}>{detailsError}</Text>}
        <TouchableOpacity
          style={[styles.btn, savingDetails && styles.btnDisabled]}
          onPress={handleSaveDetails}
          disabled={savingDetails}
        >
          {savingDetails ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={styles.btnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Default Currency</Text>
      <View style={styles.section}>
        <View style={styles.currencyRow}>
          <Text style={styles.currencyDisplay}>{group.currency}</Text>
          <TouchableOpacity style={styles.changeBtn} onPress={() => setShowCurrencyPicker(true)}>
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>People</Text>
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.push(`/${token}/participants?serverUrl=${encodeURIComponent(serverUrl)}`)}
        >
          <Text style={styles.btnText}>Manage Participants</Text>
        </TouchableOpacity>
      </View>

      <CurrencyPicker
        visible={showCurrencyPicker}
        currencies={group.currencies?.length ? group.currencies : [group.currency]}
        selected={group.currency}
        serverUrl={serverUrl}
        token={token}
        onSelect={handleCurrencySelect}
        onClose={() => setShowCurrencyPicker(false)}
      />
      </ScrollView>
    </View>
  );
}

import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { addCurrency } from '../api/groups';
import { useTheme, Colors } from '../theme';

function makeStyles(C: Colors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingBottom: 32,
      maxHeight: '60%',
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: C.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 12,
    },
    title: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    rowText: { fontSize: 15, color: C.text },
    checkmark: { fontSize: 16, color: C.primary, fontWeight: '600' },
    addRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
    addInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 15,
      color: C.text,
      backgroundColor: C.bg,
    },
    addBtn: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
    addBtnText: { color: C.white, fontWeight: '600' },
    errorText: { color: '#EF4444', fontSize: 13, marginTop: 4 },
  });
}

interface Props {
  visible: boolean;
  currencies: string[];
  selected: string;
  serverUrl: string;
  token: string;
  onSelect: (c: string) => void;
  onClose: () => void;
}

export function CurrencyPicker({
  visible,
  currencies,
  selected,
  serverUrl,
  token,
  onSelect,
  onClose,
}: Props) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [showAdd, setShowAdd] = useState(false);
  const [newCurrency, setNewCurrency] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const queryClient = useQueryClient();

  const handleAdd = async () => {
    const code = newCurrency.toUpperCase().trim();
    if (!code) return;
    setAdding(true);
    setAddError('');
    try {
      await addCurrency(serverUrl, token, code);
      await queryClient.invalidateQueries({ queryKey: ['group', serverUrl, token] });
      onSelect(code);
      setNewCurrency('');
      setShowAdd(false);
      onClose();
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to add currency');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheet}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>Select Currency</Text>
        <FlatList
          data={currencies}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={styles.rowText}>{item}</Text>
              {item === selected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <View>
              {showAdd ? (
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    value={newCurrency}
                    onChangeText={setNewCurrency}
                    placeholder="e.g. EUR"
                    autoCapitalize="characters"
                    maxLength={3}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={adding}>
                    <Text style={styles.addBtnText}>{adding ? '...' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.row} onPress={() => setShowAdd(true)}>
                  <Text style={[styles.rowText, { color: C.primary }]}>+ Add currency</Text>
                </TouchableOpacity>
              )}
              {!!addError && <Text style={styles.errorText}>{addError}</Text>}
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

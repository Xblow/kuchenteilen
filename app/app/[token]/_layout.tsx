import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { GroupContext } from '../../src/context';
import { useGroup } from '../../src/hooks/useGroup';
import { addGroup, clearMyParticipant, getGroupByToken, setMyParticipant } from '../../src/storage';
import { useTheme } from '../../src/theme';

const staticStyles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  backBtn: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText: { fontWeight: '600', fontSize: 15 },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
});

export default function TokenLayout() {
  const { colors: C } = useTheme();
  const { token, serverUrl: paramServerUrl } = useLocalSearchParams<{
    token: string;
    serverUrl?: string;
  }>();
  const router = useRouter();

  const [resolvedServerUrl, setResolvedServerUrl] = useState<string | null>(
    paramServerUrl ?? null,
  );
  const [resolving, setResolving] = useState(true);
  // undefined = not yet read from storage; null = read but not set; string = set
  const [myParticipantId, setMyParticipantId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!token) return;
    getGroupByToken(token).then((saved) => {
      if (saved) {
        if (!paramServerUrl) setResolvedServerUrl(saved.serverUrl);
        setMyParticipantId(saved.myParticipantId ?? null);
      } else {
        setMyParticipantId(null);
      }
      setResolving(false);
    });
  }, [token, paramServerUrl]);

  const { data, isLoading, isError, error } = useGroup(
    resolvedServerUrl ?? '',
    token ?? '',
  );

  // Auto-save token to AsyncStorage whenever it resolves successfully (e.g. direct deep link).
  useEffect(() => {
    if (data && resolvedServerUrl && token) {
      addGroup({ serverUrl: resolvedServerUrl, token, name: data.name });
    }
  }, [data, resolvedServerUrl, token]);

  const handleIdentityComplete = useCallback(async (participantId: string) => {
    if (!token) return;
    await setMyParticipant(token, participantId);
    setMyParticipantId(participantId);
  }, [token]);

  const handleClearIdentity = useCallback(async () => {
    if (!token) return;
    await clearMyParticipant(token);
    setMyParticipantId(null);
  }, [token]);

  const handleSetIdentity = useCallback(async (participantId: string) => {
    if (!token) return;
    await setMyParticipant(token, participantId);
    setMyParticipantId(participantId);
  }, [token]);

  if (resolving || myParticipantId === undefined || (resolvedServerUrl && isLoading)) {
    return (
      <View style={[staticStyles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!resolvedServerUrl) {
    return (
      <View style={[staticStyles.center, { backgroundColor: C.bg }]}>
        <Text style={[staticStyles.errorText, { color: C.danger }]}>Group not found. The token may be invalid.</Text>
        <TouchableOpacity style={[staticStyles.backBtn, { backgroundColor: C.primary }]} onPress={() => router.replace('/')}>
          <Text style={[staticStyles.backBtnText, { color: C.white }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[staticStyles.center, { backgroundColor: C.bg }]}>
        <Text style={[staticStyles.errorText, { color: C.danger }]}>
          {error instanceof Error ? error.message : 'Failed to load group.'}
        </Text>
        <TouchableOpacity style={[staticStyles.backBtn, { backgroundColor: C.primary }]} onPress={() => router.replace('/')}>
          <Text style={[staticStyles.backBtnText, { color: C.white }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[staticStyles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const ctxValue = {
    serverUrl: resolvedServerUrl,
    token: token ?? '',
    group: data,
    myParticipantId: myParticipantId as string | null,
    clearIdentity: handleClearIdentity,
    setIdentity: handleSetIdentity,
  };

  return (
    <GroupContext.Provider value={ctxValue}>
      <Stack screenOptions={{ headerShown: false }} />
    </GroupContext.Provider>
  );
}


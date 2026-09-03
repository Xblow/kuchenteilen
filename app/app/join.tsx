import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getGroup } from '../src/api/groups';
import { addGroup, setMyParticipant } from '../src/storage';
import { Group } from '../src/types';
import { WelcomeScreen } from '../src/components/WelcomeScreen';
import { useTheme, Colors } from '../src/theme';

function makeStyles(C: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg, padding: 20 },
    heading: { fontSize: 24, fontWeight: '700', color: C.text, marginBottom: 24 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: C.sub,
      marginBottom: 6,
      marginTop: 14,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: C.text,
    },
    scanBtn: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: C.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    scanBtnText: { color: C.primary, fontSize: 15, fontWeight: '600' },
    errorText: { color: C.danger, fontSize: 13, marginTop: 10 },
    joinBtn: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 24,
    },
    joinBtnDisabled: { opacity: 0.6 },
    joinBtnText: { color: C.white, fontSize: 16, fontWeight: '600' },
    cameraContainer: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    permissionText: { color: '#FFFFFF', fontSize: 16, marginBottom: 16, textAlign: 'center' },
    closeCamera: {
      position: 'absolute',
      bottom: 48,
      alignSelf: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 24,
      paddingHorizontal: 32,
      paddingVertical: 12,
    },
    closeCameraText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  });
}

export default function JoinScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (mode === 'qr') {
      openCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [joinedGroup, setJoinedGroup] = useState<Group | null>(null);
  const [joinedServerUrl, setJoinedServerUrl] = useState('');
  const [joinedToken, setJoinedToken] = useState('');

  const handleBarcode = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const parsed = JSON.parse(data) as { s?: string; t?: string };
      if (parsed.s && parsed.t) {
        setServerUrl(parsed.s);
        setToken(parsed.t);
        setShowCamera(false);
      } else {
        Alert.alert('Invalid QR', 'QR code does not contain group data.');
      }
    } catch {
      Alert.alert('Invalid QR', 'Could not parse QR code.');
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to scan QR codes.');
        return;
      }
    }
    setScanned(false);
    setShowCamera(true);
  };

  const handleJoin = async () => {
    if (!serverUrl.trim() || !token.trim()) {
      setError('Please enter both server URL and token.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const group = await getGroup(serverUrl.trim(), token.trim());
      await addGroup({ serverUrl: serverUrl.trim(), token: token.trim(), name: group.name });
      setJoinedGroup(group);
      setJoinedServerUrl(serverUrl.trim());
      setJoinedToken(token.trim());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join group.');
    } finally {
      setLoading(false);
    }
  };

  const handleIdentityComplete = async (participantId: string) => {
    await setMyParticipant(joinedToken, participantId);
    router.replace(`/${joinedToken}?serverUrl=${encodeURIComponent(joinedServerUrl)}`);
  };

  const handleSkipIdentity = () => {
    router.replace(`/${joinedToken}?serverUrl=${encodeURIComponent(joinedServerUrl)}`);
  };

  if (joinedGroup) {
    return (
      <WelcomeScreen
        group={joinedGroup}
        serverUrl={joinedServerUrl}
        token={joinedToken}
        onComplete={handleIdentityComplete}
        onSkip={handleSkipIdentity}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Join Group</Text>

      <Text style={styles.label}>Server URL</Text>
      <TextInput
        style={styles.input}
        value={serverUrl}
        onChangeText={setServerUrl}
        placeholder="http://192.168.1.x:8080"
        placeholderTextColor={C.sub}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Text style={styles.label}>Access Token</Text>
      <TextInput
        style={styles.input}
        value={token}
        onChangeText={setToken}
        placeholder="paste token here"
        placeholderTextColor={C.sub}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity style={styles.scanBtn} onPress={openCamera}>
        <Text style={styles.scanBtnText}>Scan QR</Text>
      </TouchableOpacity>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.joinBtn, loading && styles.joinBtnDisabled]}
        onPress={handleJoin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={C.white} />
        ) : (
          <Text style={styles.joinBtnText}>Connect</Text>
        )}
      </TouchableOpacity>

      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <View style={styles.cameraContainer}>
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              onBarcodeScanned={handleBarcode}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
          ) : (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionText}>Camera access is required.</Text>
              <TouchableOpacity style={styles.joinBtn} onPress={requestPermission}>
                <Text style={styles.joinBtnText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.closeCamera} onPress={() => setShowCamera(false)}>
            <Text style={styles.closeCameraText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

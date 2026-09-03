import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedGroup } from './types';

const KEY = 'saved_groups';

export async function getSavedGroups(): Promise<SavedGroup[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedGroup[];
  } catch {
    return [];
  }
}

export async function addGroup(g: SavedGroup): Promise<void> {
  const groups = await getSavedGroups();
  const idx = groups.findIndex((x) => x.token === g.token);
  if (idx !== -1) {
    groups[idx] = { ...groups[idx], ...g };
  } else {
    groups.unshift(g);
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(groups));
}

export async function removeGroup(token: string): Promise<void> {
  const groups = await getSavedGroups();
  const filtered = groups.filter((x) => x.token !== token);
  await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
}

export async function updateGroupName(token: string, name: string): Promise<void> {
  const groups = await getSavedGroups();
  const updated = groups.map((x) => (x.token === token ? { ...x, name } : x));
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}

export async function getGroupByToken(token: string): Promise<SavedGroup | null> {
  const groups = await getSavedGroups();
  return groups.find((x) => x.token === token) ?? null;
}

export async function setMyParticipant(token: string, participantId: string): Promise<void> {
  const groups = await getSavedGroups();
  const updated = groups.map((x) =>
    x.token === token ? { ...x, myParticipantId: participantId } : x,
  );
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}

export async function clearMyParticipant(token: string): Promise<void> {
  const groups = await getSavedGroups();
  const updated = groups.map((x) =>
    x.token === token ? { ...x, myParticipantId: undefined } : x,
  );
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}

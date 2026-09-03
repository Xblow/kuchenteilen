import { createContext, useContext } from 'react';
import { Group } from './types';

export interface GroupContextValue {
  serverUrl: string;
  token: string;
  group: Group;
  myParticipantId: string | null;
  clearIdentity: () => void;
  setIdentity: (participantId: string) => Promise<void>;
}

export const GroupContext = createContext<GroupContextValue | null>(null);

export function useGroupContext(): GroupContextValue {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('must be used within GroupProvider');
  return ctx;
}

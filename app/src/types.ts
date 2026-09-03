export interface Group {
  id: string;
  name: string;
  description: string;
  currency: string;
  currencies: string[];
  access_token: string;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  group_id: string;
  name: string;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  participant_id: string;
  amount_cents: number;
}

export interface Expense {
  id: string;
  record_id: string;
  group_id: string;
  paid_by_id: string;
  description: string;
  amount_cents: number;
  currency: string;
  date: string;
  created_at: string;
  splits: ExpenseSplit[];
}

export interface Settlement {
  id: string;
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount_cents: number;
  currency: string;
  date: string;
  note: string;
  created_at: string;
}

export interface ParticipantBalance {
  participant_id: string;
  participant_name: string;
  net_cents: number;
}

export interface SuggestedSettlement {
  from_participant_id: string;
  from_participant_name: string;
  to_participant_id: string;
  to_participant_name: string;
  amount_cents: number;
}

export interface CurrencyBalances {
  participant_balances: ParticipantBalance[];
  suggested_settlements: SuggestedSettlement[];
}

export interface GroupBalances {
  currencies: Record<string, CurrencyBalances>;
}

export interface SavedGroup {
  serverUrl: string;
  token: string;
  name: string;
  myParticipantId?: string;
}

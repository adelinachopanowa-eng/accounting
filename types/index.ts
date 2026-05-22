export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  egn: string;
  id_card_number: string;
  id_card_issued_by?: string;
  id_card_issued_date?: string;
  id_card_expiry?: string;
  address?: string;
  city?: string;
  municipality?: string;
  created_at?: string;
};

export type Nomenclature = {
  id: string;
  code: string;
  name: string;
  waste_code?: string;
  unit: string;
  current_price: number;
  active: boolean;
};

export type TransactionItem = {
  id?: string;
  transaction_id?: string;
  nomenclature_id: string;
  nomenclatures?: Nomenclature;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type Transaction = {
  id: string;
  receipt_number: string;
  contract_number?: string;
  customer_id: string;
  customers?: Customer;
  transaction_date: string;
  payment_method: 'cash' | 'bank';
  bank_account?: string;
  bank_name?: string;
  bank_bic?: string;
  total_amount: number;
  paid: boolean;
  paid_at?: string;
  notes?: string;
  operator_name?: string;
  transaction_items?: TransactionItem[];
};

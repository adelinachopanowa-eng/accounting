-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  egn TEXT UNIQUE NOT NULL,
  id_card_number TEXT NOT NULL,
  id_card_issued_by TEXT,
  id_card_issued_date DATE,
  id_card_expiry DATE,
  address TEXT,
  city TEXT,
  municipality TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nomenclatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  waste_code TEXT,
  unit TEXT DEFAULT 'kg',
  current_price DECIMAL(10,4),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT UNIQUE NOT NULL,
  contract_number TEXT,
  customer_id UUID REFERENCES customers(id),
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  payment_method TEXT DEFAULT 'cash',
  bank_account TEXT,
  bank_name TEXT,
  bank_bic TEXT,
  total_amount DECIMAL(10,2),
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  operator_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  nomenclature_id UUID REFERENCES nomenclatures(id),
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,4) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_customers_egn ON customers(egn);

INSERT INTO nomenclatures (code, name, waste_code, unit, current_price) VALUES
('FE-TU2.1', 'Желязо отпадък ТУ2.1 над 2мм,1500/500/500', '20 01 40', 'kg', 0.3100),
('FE-TU2.2', 'Желязо отпадък ТУ2.2 до 2мм', '20 01 40', 'kg', 0.2800),
('CU-1', 'Мед чист', '17 04 01', 'kg', 6.5000),
('CU-2', 'Мед смесен', '17 04 01', 'kg', 5.8000),
('AL-1', 'Алуминий чист', '17 04 02', 'kg', 1.2000),
('AL-2', 'Алуминий смесен', '17 04 02', 'kg', 0.9000),
('PB-1', 'Олово', '17 04 03', 'kg', 1.5000),
('ZN-1', 'Цинк', '17 04 04', 'kg', 1.1000),
('SS-1', 'Неръждаема стомана', '17 04 05', 'kg', 0.8000),
('BR-1', 'Месинг', '17 04 04', 'kg', 3.2000);

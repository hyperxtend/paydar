-- Paydar reports in South African Rand (ZAR) by default.
-- Relabels existing organisations, invoices and payments as ZAR. Amounts are kept
-- as-is (no exchange-rate conversion), so this is only safe while all data is demo data.

ALTER TABLE organisations ALTER COLUMN currency SET DEFAULT 'ZAR';
ALTER TABLE invoices      ALTER COLUMN currency SET DEFAULT 'ZAR';
ALTER TABLE payments      ALTER COLUMN currency SET DEFAULT 'ZAR';

UPDATE organisations SET currency = 'ZAR' WHERE currency <> 'ZAR';
UPDATE invoices      SET currency = 'ZAR' WHERE currency <> 'ZAR';
UPDATE payments      SET currency = 'ZAR' WHERE currency <> 'ZAR';

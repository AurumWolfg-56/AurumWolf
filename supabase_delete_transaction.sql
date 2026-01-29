-- RPC for Atomic Transaction Deletion with Balance Reversion
-- Drops the function if it exists to ensure clean slate
DROP FUNCTION IF EXISTS delete_transaction_v2;

CREATE OR REPLACE FUNCTION delete_transaction_v2(
  p_transaction_id UUID,
  p_user_id UUID
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_tx RECORD;
  v_partner_tx RECORD;
  v_account_id UUID;
  v_amount NUMERIC;
  v_type TEXT;
  v_link_id UUID;
BEGIN
  -- 1. Fetch the transaction to be deleted
  SELECT * INTO v_tx 
  FROM transactions 
  WHERE id = p_transaction_id AND user_id = p_user_id;

  -- If not found, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_account_id := v_tx.account_id;
  v_amount := v_tx.amount;
  v_type := v_tx.type;
  v_link_id := v_tx.transfer_link_id;

  -- 2. Revert Balance for the primary transaction
  -- If Expense (debit), we ADD back the money.
  -- If Income (credit), we SUBTRACT the money.
  IF v_type = 'debit' THEN
    UPDATE accounts 
    SET balance = balance + v_amount 
    WHERE id = v_account_id;
  ELSIF v_type = 'credit' THEN
    UPDATE accounts 
    SET balance = balance - v_amount 
    WHERE id = v_account_id;
  END IF;

  -- 3. Handle Linked Transfer (if applicable)
  IF v_link_id IS NOT NULL THEN
    -- Find the partner transaction (same link_id, different ID)
    SELECT * INTO v_partner_tx 
    FROM transactions 
    WHERE transfer_link_id = v_link_id 
      AND id != p_transaction_id;

    IF FOUND THEN
      -- Revert balance for partner account
      IF v_partner_tx.type = 'debit' THEN
        UPDATE accounts 
        SET balance = balance + v_partner_tx.amount 
        WHERE id = v_partner_tx.account_id;
      ELSIF v_partner_tx.type = 'credit' THEN
        UPDATE accounts 
        SET balance = balance - v_partner_tx.amount 
        WHERE id = v_partner_tx.account_id;
      END IF;

      -- Delete the partner transaction
      DELETE FROM transactions WHERE id = v_partner_tx.id;
    END IF;
  END IF;

  -- 4. Delete the primary transaction
  DELETE FROM transactions WHERE id = p_transaction_id;

  RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
  -- Log error if needed, or just re-raise
  RAISE;
END;
$$;

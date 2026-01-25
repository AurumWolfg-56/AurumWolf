-- Migration: Fix RPC Security (IDOR)
CREATE OR REPLACE FUNCTION public.perform_transfer(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_date TEXT,
  p_description TEXT,
  p_currency TEXT,
  p_converted_amount NUMERIC,
  p_to_currency TEXT
)
RETURNS TABLE(from_id UUID, to_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link_id UUID;
  v_from_id UUID;
  v_to_id UUID;
BEGIN
  -- SEGURITY CHECK: Ensure the user owns the source account
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_from_account_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Access Denied: You do not own the source account.';
  END IF;

  v_link_id := gen_random_uuid();

  -- Insert Debit (Sender)
  INSERT INTO public.transactions (
    account_id,
    name,
    amount,
    "numericAmount",
    currency,
    date,
    category,
    type,
    status,
    transfer_link_id,
    created_at,
    user_id
  ) VALUES (
    p_from_account_id,
    'Transfer to ' || (SELECT name FROM public.accounts WHERE id = p_to_account_id),
    to_char(p_amount, 'FM999,999,999.00'),
    p_amount, 
    p_currency,
    p_date,
    'Transfer',
    'debit',
    'completed',
    v_link_id,
    now(),
    auth.uid()
  ) RETURNING id INTO v_from_id;

  -- Insert Credit (Receiver)
  INSERT INTO public.transactions (
    account_id,
    name,
    amount,
    "numericAmount",
    currency,
    date,
    category,
    type,
    status,
    transfer_link_id,
    created_at,
    user_id
  ) VALUES (
    p_to_account_id,
    'Transfer from ' || (SELECT name FROM public.accounts WHERE id = p_from_account_id),
    to_char(p_converted_amount, 'FM999,999,999.00'),
    p_converted_amount,
    p_to_currency,
    p_date,
    'Transfer',
    'credit',
    'completed',
    v_link_id,
    now(),
    auth.uid()
  ) RETURNING id INTO v_to_id;

  RETURN QUERY SELECT v_from_id, v_to_id;
END;
$$;

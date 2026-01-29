CREATE OR REPLACE FUNCTION public.perform_transfer(
    p_from_account_id uuid,
    p_to_account_id uuid,
    p_amount numeric,
    p_date text,
    p_description text,
    p_currency text,
    p_converted_amount numeric,
    p_to_currency text
)
RETURNS TABLE(from_id uuid, to_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_link_id UUID;
  v_from_id UUID;
  v_to_id UUID;
BEGIN
  -- SAFETY CHECK: Owner
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_from_account_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Access Denied: You do not own the source account.';
  END IF;

  v_link_id := gen_random_uuid();

  -- 1. UPDATE BALANCES
  -- Deduct from Sender
  UPDATE public.accounts
  SET balance = balance - p_amount
  WHERE id = p_from_account_id;

  -- Add to Receiver
  UPDATE public.accounts
  SET balance = balance + p_converted_amount
  WHERE id = p_to_account_id;

  -- 2. CREATE TRANSACTIONS
  -- Insert Debit (Sender)
  INSERT INTO public.transactions (
    account_id,
    name,
    amount,
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
    p_amount, 
    p_currency,
    p_date::date,
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
    p_converted_amount,
    p_to_currency,
    p_date::date,
    'Transfer',
    'credit',
    'completed',
    v_link_id,
    now(),
    auth.uid()
  ) RETURNING id INTO v_to_id;

  RETURN QUERY SELECT v_from_id, v_to_id;
END;
$function$;

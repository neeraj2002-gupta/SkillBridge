-- Swap status enum
CREATE TYPE public.swap_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

-- swap_requests: tracks A→B swap proposals
CREATE TABLE public.swap_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_offered TEXT NOT NULL DEFAULT '',
  skill_wanted TEXT NOT NULL DEFAULT '',
  status public.swap_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT swap_requests_distinct CHECK (requester_id <> recipient_id)
);

CREATE INDEX idx_swap_requester ON public.swap_requests(requester_id);
CREATE INDEX idx_swap_recipient ON public.swap_requests(recipient_id);

ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view swaps"
ON public.swap_requests FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Requester can create swap"
ON public.swap_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Participants can update swap"
ON public.swap_requests FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Participants can delete swap"
ON public.swap_requests FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE TRIGGER swap_requests_touch
BEFORE UPDATE ON public.swap_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- messages: per-swap chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  swap_id UUID NOT NULL REFERENCES public.swap_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_swap ON public.messages(swap_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper: check user is participant of an accepted swap
CREATE OR REPLACE FUNCTION public.is_swap_participant(_swap_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.swap_requests
    WHERE id = _swap_id
      AND (requester_id = _user_id OR recipient_id = _user_id)
  );
$$;

CREATE POLICY "Participants can view messages"
ON public.messages FOR SELECT
USING (public.is_swap_participant(swap_id, auth.uid()));

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_swap_participant(swap_id, auth.uid())
);

-- Enable realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.swap_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.swap_requests;
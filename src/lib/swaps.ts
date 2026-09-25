import { supabase } from "@/integrations/supabase/client";

export type SwapStatus = "pending" | "accepted" | "declined" | "cancelled";

export type SwapRequest = {
  id: string;
  requester_id: string;
  recipient_id: string;
  skill_offered: string;
  skill_wanted: string;
  status: SwapStatus;
  created_at: string;
  updated_at: string;
  room_token: string;
};

export async function createOrGetSwap(params: {
  requesterId: string;
  recipientId: string;
  skillOffered: string;
  skillWanted: string;
}): Promise<{ data: SwapRequest | null; error: string | null }> {
  // Try to find an existing swap between the two participants
  const { data: existing } = await supabase
    .from("swap_requests")
    .select("*")
    .or(
      `and(requester_id.eq.${params.requesterId},recipient_id.eq.${params.recipientId}),` +
      `and(requester_id.eq.${params.recipientId},recipient_id.eq.${params.requesterId})`,
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return { data: existing as SwapRequest, error: null };

  const { data, error } = await supabase
    .from("swap_requests")
    .insert({
      requester_id: params.requesterId,
      recipient_id: params.recipientId,
      skill_offered: params.skillOffered,
      skill_wanted: params.skillWanted,
    })
    .select("*")
    .single();

  return { data: (data as SwapRequest) ?? null, error: error?.message ?? null };
}

export async function updateSwapStatus(swapId: string, status: SwapStatus) {
  return supabase.from("swap_requests").update({ status }).eq("id", swapId);
}

export async function listMySwaps(userId: string) {
  const { data, error } = await supabase
    .from("swap_requests")
    .select("*")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("updated_at", { ascending: false });
  return { data: (data ?? []) as SwapRequest[], error: error?.message ?? null };
}
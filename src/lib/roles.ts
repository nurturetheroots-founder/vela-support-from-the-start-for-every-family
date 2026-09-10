import { supabase } from "@/integrations/supabase/client";
import { resetBabyCache } from "@/lib/care-log";

/**
 * Role-based access. A "parent" owns the family record and all maternal
 * wellness data; a "caregiver" is invited into a family and can only see and
 * add shift care logs and handovers for that family.
 */
export type AppRole = "parent" | "caregiver";

const KEY = "vela.role.v1";

export interface RoleInfo {
  role: AppRole;
  familyId: string | null;
}

export function cachedRole(): AppRole {
  if (typeof window === "undefined") return "parent";
  return window.localStorage.getItem(KEY) === "caregiver" ? "caregiver" : "parent";
}

export function setCachedRole(role: AppRole) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, role);
}

export function clearCachedRole() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** Looks up the signed-in person's role and, for caregivers, their family. */
export async function fetchRoleInfo(): Promise<RoleInfo> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { role: "parent", familyId: null };

  const { data: link } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", uid)
    .eq("role", "caregiver")
    .limit(1)
    .maybeSingle();

  if (link?.family_id) {
    setCachedRole("caregiver");
    return { role: "caregiver", familyId: link.family_id as string };
  }

  setCachedRole("parent");
  return { role: "parent", familyId: null };
}

/** Redeems a 6-character family invite code and becomes a caregiver. */
export async function redeemInvite(code: string, displayName: string): Promise<string> {
  const { data, error } = await supabase.rpc("redeem_family_invite", {
    _code: code.trim().toUpperCase(),
    _display_name: displayName.trim(),
  });
  if (error) throw error;
  setCachedRole("caregiver");
  resetBabyCache();
  return data as string;
}

/** Creates a fresh 6-character invite code for the signed-in parent's family. */
export async function createInviteCode(): Promise<string> {
  const { data, error } = await supabase.rpc("generate_family_invite");
  if (error) throw error;
  return data as string;
}

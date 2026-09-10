import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaregiverInviteDialog } from "@/components/caregiver-invite-dialog";
import { getSelectedFamilyId, listCaregiverFamilies, setSelectedFamilyId } from "@/lib/care-log";

/**
 * Multi-client caregivers switch between the families they support without
 * re-entering an invite code.
 */
export function FamilySwitcher({
  enabled,
  currentName,
  onSwitched,
}: {
  enabled: boolean;
  currentName: string;
  onSwitched: () => void;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);

  const familiesQuery = useQuery({
    queryKey: ["caregiver-families"],
    enabled,
    queryFn: listCaregiverFamilies,
  });

  const families = familiesQuery.data ?? [];
  const selected = getSelectedFamilyId();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-h-11 max-w-[60vw] items-center gap-1.5 rounded-full bg-night-soft px-4 text-sm text-night-text ring-1 ring-night-line">
          <span className="truncate">{currentName}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-night-muted" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-56 border-night-line bg-night-soft text-night-text"
        >
          {families.map((f) => (
            <DropdownMenuItem
              key={f.id}
              className="min-h-11 gap-2 focus:bg-night-raised focus:text-night-text"
              onSelect={() => {
                setSelectedFamilyId(f.id);
                onSwitched();
              }}
            >
              <Check
                className={
                  f.id === selected || (!selected && families[0]?.id === f.id)
                    ? "h-4 w-4 text-clay-soft"
                    : "h-4 w-4 opacity-0"
                }
              />
              <span className="truncate">{f.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            className="min-h-11 gap-2 focus:bg-night-raised focus:text-night-text"
            onSelect={() => setInviteOpen(true)}
          >
            <Plus className="h-4 w-4 text-clay-soft" />
            Add a family with a code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CaregiverInviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}

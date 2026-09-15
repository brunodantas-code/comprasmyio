import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { MENU_PERMISSION_GROUPS, togglePermissionGroup, togglePermissionItem } from "@/lib/menu-permissions";

export function MenuPermissionSelector({
  value,
  onChange,
  disabled = false,
  highlightedKeys = new Set<string>(),
  showAdministration = false,
}: {
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
  highlightedKeys?: Set<string>;
  showAdministration?: boolean;
}) {
  const visibleGroups = showAdministration
    ? MENU_PERMISSION_GROUPS
    : MENU_PERMISSION_GROUPS.filter((group) => group.key !== "usuarios");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleGroups.map((group) => (
        <div key={group.key} className="space-y-2 rounded-md border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={value.has(group.key)}
              disabled={disabled}
              onCheckedChange={(checked) => onChange(togglePermissionGroup(value, group, checked === true))}
            />
            {group.label}
          </label>
          {group.children.length > 0 ? (
            <div className={cn("grid gap-2 border-l border-border pl-4", group.key === "armazem" && "grid-cols-2")}>
              {group.children.map((child) => (
                <label key={child.key} className={cn("flex items-center gap-2 rounded px-1 py-0.5 text-sm text-muted-foreground", highlightedKeys.has(child.key) && "bg-myio-purple/10 font-medium text-myio-purple")}>
                  <Checkbox
                    checked={value.has(child.key)}
                    disabled={disabled}
                    onCheckedChange={(checked) => onChange(togglePermissionItem(value, group, child.key, checked === true))}
                  />
                  {child.label}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
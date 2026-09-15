import { Checkbox } from "@/components/ui/checkbox";
import { MENU_PERMISSION_GROUPS, togglePermissionGroup, togglePermissionItem } from "@/lib/menu-permissions";

export function MenuPermissionSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MENU_PERMISSION_GROUPS.map((group) => (
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
            <div className="grid gap-2 border-l border-border pl-4">
              {group.children.map((child) => (
                <label key={child.key} className="flex items-center gap-2 text-sm text-muted-foreground">
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
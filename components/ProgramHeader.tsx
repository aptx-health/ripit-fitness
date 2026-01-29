'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical, Pencil } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export type ProgramAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
};

type ProgramHeaderProps = {
  title: string;
  description?: string | null;
  isActive?: boolean;
  stats?: Array<{ label: string; value: string | number }>;
  editHref?: string;
  actions?: ProgramAction[];
};

export function ProgramHeader({
  title,
  description,
  isActive,
  stats,
  editHref,
  actions = [],
}: ProgramHeaderProps) {
  const router = useRouter();

  // Build actions list - editHref creates default Edit action
  const allActions: ProgramAction[] = editHref
    ? [{ label: 'Edit', href: editHref, icon: <Pencil className="w-4 h-4" /> }, ...actions]
    : actions;

  const hasActions = allActions.length > 0;

  return (
    <div className="space-y-2">
      {/* Title row with actions */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl sm:text-4xl font-bold text-foreground doom-title">
          {title}
        </h1>

        {hasActions && (
          <>
            {/* Mobile: icon dropdown */}
            <div className="sm:hidden">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="h-9 w-9 flex items-center justify-center cursor-pointer border-2 border-border bg-input transition-all hover:border-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                    aria-label="Program actions"
                  >
                    <MoreVertical className="w-5 h-5" strokeWidth={2} />
                  </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="bg-card border-2 border-primary shadow-lg z-50 min-w-[140px]"
                    sideOffset={5}
                    align="end"
                  >
                    {allActions.map((action, index) => (
                      <DropdownMenu.Item
                        key={index}
                        onClick={() => {
                          if (action.href) {
                            router.push(action.href);
                          } else if (action.onClick) {
                            action.onClick();
                          }
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-semibold uppercase tracking-wider transition-colors cursor-pointer outline-none hover:bg-muted text-foreground flex items-center gap-2"
                      >
                        {action.icon}
                        {action.label}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>

            {/* Desktop: text button for primary action (Edit) */}
            {editHref && (
              <div className="hidden sm:block">
                <Link
                  href={editHref}
                  className="px-4 py-2 border border-primary text-primary hover:bg-primary-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
                >
                  EDIT
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status badge */}
      {isActive && (
        <span className="inline-block px-3 py-1 bg-primary text-primary-foreground text-sm font-semibold doom-label">
          ACTIVE
        </span>
      )}

      {/* Description */}
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}

      {/* Stats */}
      {stats && stats.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          {stats.map((stat, index) => (
            <span key={index}>
              {stat.value} {stat.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

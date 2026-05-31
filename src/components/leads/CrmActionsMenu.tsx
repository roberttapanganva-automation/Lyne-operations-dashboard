"use client";

import { DotsThreeOutlineVerticalIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type CrmMenuItem = {
  href?: string;
  label: string;
  onClick?: () => void;
};

type CrmActionsMenuProps = {
  ariaLabel: string;
  items: CrmMenuItem[];
};

export function CrmActionsMenu({ ariaLabel, items }: CrmActionsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        ref.current &&
        event.target instanceof Node &&
        !ref.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleAction(action: () => void) {
    action();
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <DotsThreeOutlineVerticalIcon aria-hidden="true" size={18} weight="bold" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-[var(--ops-border)] bg-white p-2 shadow-lg">
          {items.map((item) =>
            item.href ? (
              <Link
                className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
                href={item.href}
                key={item.label}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ) : (
              <button
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
                key={item.label}
                onClick={() => item.onClick && handleAction(item.onClick)}
                type="button"
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

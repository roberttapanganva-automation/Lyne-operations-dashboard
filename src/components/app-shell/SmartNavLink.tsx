"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type ComponentProps } from "react";

type SmartNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

function isInternalHref(href: string) {
  return href.startsWith("/");
}

export function SmartNavLink({
  href,
  onFocus,
  onMouseEnter,
  ...props
}: SmartNavLinkProps) {
  const router = useRouter();
  const hasPrefetchedRef = useRef(false);

  function prefetchOnIntent() {
    if (hasPrefetchedRef.current || !isInternalHref(href)) {
      return;
    }

    hasPrefetchedRef.current = true;
    router.prefetch(href);
  }

  return (
    <Link
      href={href}
      onFocus={(event) => {
        prefetchOnIntent();
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        prefetchOnIntent();
        onMouseEnter?.(event);
      }}
      {...props}
    />
  );
}

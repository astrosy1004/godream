"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  badge?: string;
  soon?: boolean;
}
export interface NavGroup {
  group: string;
  items: NavItem[];
}

export function NavLinks({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  return (
    <>
      {groups.map((g) => (
        <div key={g.group} style={{ display: "contents" }}>
          <div className="grp">{g.group}</div>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} className={i.soon ? "soon" : undefined} aria-current={path === i.href ? "page" : undefined}>
              <span className="lb">{i.label}</span>
              {i.badge ? <span className="bd">{i.badge}</span> : i.soon ? <span className="bd">준비 중</span> : null}
            </Link>
          ))}
        </div>
      ))}
    </>
  );
}

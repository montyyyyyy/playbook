"use client";
import type { Content } from "@/lib/models";
import type { Profile } from "@/lib/server/session";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  House,
  Library,
  Files,
  Users,
  Network,
  Lightbulb,
  Settings,
  ShieldCheck,
  Search,
  Menu,
  X,
  ChevronRight,
  Monitor,
  Sun,
  Moon,
  ArrowUpRight,
} from "lucide-react";
import { hrefFor } from "@/lib/content";
const navigation = [
  { href: "/", label: "Home", icon: House },
  { href: "/knowledge", label: "Knowledge", icon: Library },
  { href: "/templates", label: "Templates", icon: Files },
  { href: "/workshops", label: "Workshops", icon: Users },
  { href: "/architecture", label: "Architecture", icon: Network },
  { href: "/use-cases", label: "Use Cases", icon: Lightbulb },
];
const subscribe = () => () => {};
function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <div className="theme-control">
      <Sun size={15} />
      <select
        aria-label="Farbschema"
        value={mounted ? theme : "system"}
        onChange={(e) => setTheme(e.target.value)}
      >
        <option value="system">System</option>
        <option value="light">Hell</option>
        <option value="dark">Dunkel</option>
      </select>
    </div>
  );
}
function ShellInner({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQuery("");
        setOpen(false);
        menuRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  const [matches, setMatches] = useState<Content[]>([]);
  const [searchError, setSearchError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!query.trim()) return;
      try {
        const response = await fetch(
          "/api/search?q=" + encodeURIComponent(query),
          { signal: controller.signal },
        );
        if (!response.ok) {
          setMatches([]);
          setSearchError("Suche nicht verfügbar. Bitte Anmeldung prüfen.");
          return;
        }
        setMatches(await response.json());
        setSearchError("");
      } catch {
        if (!controller.signal.aborted)
          setSearchError("Suche nicht verfügbar.");
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  return (
    <>
      <a className="skip-link" href="#main">
        Zum Inhalt springen
      </a>
      {open && (
        <button
          className="scrim"
          aria-label="Navigation schließen"
          onClick={() => {
            setOpen(false);
            menuRef.current?.focus();
          }}
        />
      )}
      <aside
        ref={navRef}
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Hauptnavigation"
        onKeyDown={(e) => {
          if (open && e.key === "Tab") {
            const nodes =
              navRef.current?.querySelectorAll<HTMLElement>("a,button");
            if (!nodes?.length) return;
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <BookOpen />
          <span>
            CX Playbook
            <span className="brand-caption">
              KNOWLEDGE. EXPERIENCE. EXECUTION.
            </span>
          </span>
        </Link>
        <button
          ref={closeRef}
          className="mobile-close icon-button"
          aria-label="Navigation schließen"
          onClick={() => {
            setOpen(false);
            menuRef.current?.focus();
          }}
        >
          <X />
        </button>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (href === "/" ? pathname === "/" : pathname.startsWith(href))
                  ? "page"
                  : undefined
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-dot" /> Raum für Erfahrung
          <p>
            Wissen verbinden.
            <br />
            Gemeinsam weiterkommen.
          </p>
        </div>
        <nav className="bottom-nav">
          <Link
            href="/settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <Settings size={18} />
            Settings
          </Link>
          {profile.role === "admin" && (
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <ShieldCheck size={18} />
              Admin
            </Link>
          )}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">{profile.display_name.slice(0, 1)}</span>
          <div>
            {profile.display_name}
            <small>{profile.role}</small>
          </div>
          <span className="online-dot" />
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            ref={menuRef}
            className="mobile-menu icon-button"
            aria-expanded={open}
            aria-label="Navigation öffnen"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <div className="global-search">
            <Search size={17} />
            <input
              ref={searchRef}
              aria-label="Globale Suche"
              placeholder="Inhalte, Use Cases, Templates … suchen"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setMatches([]);
                setSearchError("");
              }}
            />
            {query ? (
              <button
                className="icon-button"
                aria-label="Suche schließen"
                onClick={() => setQuery("")}
              >
                <X size={15} />
              </button>
            ) : (
              <kbd>Ctrl K</kbd>
            )}
            {query && (
              <div className="search-results">
                <span className="eyebrow">SUCHERGEBNISSE</span>
                {matches.length ? (
                  matches.map((item) => (
                    <Link
                      key={item.id}
                      href={hrefFor(item)}
                      onClick={() => setQuery("")}
                    >
                      <BookOpen size={17} />
                      <span>
                        {item.title}
                        <small>
                          {item.category} · {item.technology}
                        </small>
                      </span>
                      <ArrowUpRight size={15} />
                    </Link>
                  ))
                ) : (
                  <p>{searchError || "Keine Inhalte gefunden."}</p>
                )}
              </div>
            )}
          </div>
          <div className="top-actions">
            <ThemeSelect />
            <button
              className="text-button"
              onClick={async () => {
                const r = await fetch("/api/auth/sign-out", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: "{}",
                });
                if (r.ok)
                  window.location.replace(
                    new URL("/login", window.location.origin).toString(),
                  );
              }}
            >
              Abmelden
            </button>
            <span className="divider" />
            <span
              className="avatar"
              title={profile.display_name}
              aria-label={profile.display_name}
            >
              {profile.display_name.slice(0, 1)}
            </span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="page-footer">
          <span>
            CX Playbook{" "}
            <span className="muted">/ Dein Wissen. Dein Vorsprung.</span>
          </span>
          <span>Privater Workspace</span>
        </footer>
      </div>
    </>
  );
}
export function Shell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile;
}) {
  return <ShellInner profile={profile}>{children}</ShellInner>;
}
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      {items.map((item, i) => (
        <span key={i}>
          <ChevronRight size={12} />
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
export function ThemeSettings() {
  const { setTheme } = useTheme();
  return (
    <div className="theme-options">
      {[
        { value: "system", label: "System", icon: Monitor },
        { value: "light", label: "Hell", icon: Sun },
        { value: "dark", label: "Dunkel", icon: Moon },
      ].map(({ value, label, icon: Icon }) => (
        <button
          className="button secondary"
          key={value}
          onClick={() => setTheme(value)}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </div>
  );
}

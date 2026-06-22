import { useEffect, useState } from "react";
import { useTheme } from "./ThemeContext";
import {
  IconHome2,
  IconLayoutDashboard,
  IconChecklist,
  IconTimeline,
  IconBuildingWarehouse,
  IconClipboardList,
  IconBook2,
  IconSitemap,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
} from "@tabler/icons-react";

export type Page =
  | "home"
  | "dashboard"
  | "update"
  | "tasks"
  | "vendor"
  | "tracking"
  | "team"
  | "knowledge";

const NAV_ITEMS: { page: Page; label: string; icon: typeof IconHome2 }[] = [
  { page: "home", label: "Home", icon: IconHome2 },
  { page: "dashboard", label: "Dashboard", icon: IconLayoutDashboard },
  { page: "tasks", label: "Task List", icon: IconChecklist },
  { page: "update", label: "Update", icon: IconTimeline },
  { page: "vendor", label: "Vendor Directory", icon: IconBuildingWarehouse },
  { page: "tracking", label: "PR/PO Tracking", icon: IconClipboardList },
  { page: "knowledge", label: "Knowledge Base", icon: IconBook2 },
  { page: "team", label: "Organization Chart", icon: IconSitemap },
];

const STORAGE_KEY = "gunkul-sidebar-collapsed";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  userLabel: string;
  onLogout: () => void;
}

export default function Sidebar({
  currentPage,
  onNavigate,
  userLabel,
  onLogout,
}: SidebarProps) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Keyboard shortcut: Ctrl/Cmd + B toggles collapse, same as VS Code.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c: boolean) => !c);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <aside
      style={{
        width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)",
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-elevated)",
        borderRight: "1px solid var(--border)",
        transition: "width var(--transition)",
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--sp-3)",
          height: "var(--header-h)",
          padding: collapsed ? "0" : "0 var(--sp-4)",
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <img
          src={collapsed ? "/favicon.svg" : "/logo-default.svg"}
          alt="Gunkul"
          style={{
            height: 24,
            width: "auto",
            flexShrink: 0,
            filter: !collapsed && theme === "dark" ? "brightness(0) invert(1)" : undefined,
          }}
        />
        {!collapsed && (
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "var(--fs-h3)",
              color: "var(--text-strong)",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            Procurement
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "var(--sp-3) 0" }}>
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => {
          const active = currentPage === page;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onNavigate(page)}
              title={collapsed ? label : undefined}
              aria-current={active ? "page" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-3)",
                width: "100%",
                padding: collapsed ? "0.7rem 0" : "0.7rem var(--sp-4)",
                justifyContent: collapsed ? "center" : "flex-start",
                border: "none",
                cursor: "pointer",
                background: active ? "var(--accent-bg)" : "transparent",
                color: active ? "var(--text-strong)" : "var(--text-muted)",
                borderLeft: active
                  ? "3px solid var(--accent)"
                  : "3px solid transparent",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--fs-sm)",
                fontWeight: active ? 600 : 500,
                textAlign: "left",
                transition:
                  "background-color var(--transition), color var(--transition)",
              }}
            >
              <Icon size={20} stroke={1.75} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer: user + collapse toggle + logout */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "var(--sp-3)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--sp-2)",
        }}
      >
        {!collapsed && (
          <div
            style={{
              fontSize: "var(--fs-xs)",
              color: "var(--text-muted)",
              padding: "0 var(--sp-2)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {userLabel}
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          title="Sign out"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-2)",
            justifyContent: collapsed ? "center" : "flex-start",
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "0.5rem var(--sp-2)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--fs-sm)",
          }}
        >
          <IconLogout size={18} stroke={1.75} />
          {!collapsed && <span>Sign out</span>}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((c: boolean) => !c)}
          title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--sp-2)",
            border: "1px solid var(--border-strong)",
            background: "var(--surface)",
            color: "var(--text)",
            cursor: "pointer",
            padding: "0.45rem",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {collapsed ? (
            <IconChevronRight size={16} stroke={1.75} />
          ) : (
            <IconChevronLeft size={16} stroke={1.75} />
          )}
        </button>
      </div>
    </aside>
  );
}

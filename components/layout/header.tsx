"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

type Profile = {
  nome: string;
  email: string | null;
  avatar_url: string | null;
};

type HeaderProps = {
  profile: Profile | null;
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getInitials(name?: string | null) {
  if (!name) return "T";

  const parts = name.trim().split(" ");

  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function Header({ profile }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const name = profile?.nome ?? "Profissional";

  return (
    <header className="dashboard-header compact-header">
      <div className="compact-header-row">
        <div className="compact-avatar">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={name} />
          ) : (
            <span>{getInitials(name)}</span>
          )}
        </div>

        <div className="compact-user-text">
          <span>{getGreeting()}</span>
          <strong>{name}</strong>
        </div>

        <button
          type="button"
          className="compact-logout-icon"
          onClick={handleLogout}
          aria-label="Sair"
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
        </button>
      </div>
    </header>
  );
}
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppBarMiui } from "@/components/AppBarMiui";
import { Bell, LogOut, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeaderMiuiProps {
  notificationCount: number;
  canOpenSettings: boolean;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void | Promise<void>;
  headerActions?: React.ReactNode;
  profileName?: string | null;
  profileAvatarUrl?: string | null;
  userEmail?: string | null;
  currentTime: Date;
}

export function HeaderMiui({
  notificationCount,
  canOpenSettings,
  onOpenNotifications,
  onOpenSettings,
  onSignOut,
  headerActions,
  profileName,
  profileAvatarUrl,
  userEmail,
  currentTime,
}: HeaderMiuiProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-emerald-100/70 bg-background/95 backdrop-blur-xl dark:border-emerald-950/30">
      <div className="px-3 py-2.5 md:px-4 md:py-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <AppBarMiui />
          </div>

          <div className="hidden xl:flex items-center text-sm text-muted-foreground font-mono shrink-0">
            <span>{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            {profileName && (
              <>
                <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                <span className="font-sans font-medium text-foreground">{profileName.split(' ')[0]}</span>
              </>
            )}
          </div>

          <ThemeToggle variant="button" size="sm" />
          <Button
            variant="ghost"
            size="sm"
            className="relative shrink-0 rounded-2xl"
            onClick={onOpenNotifications}
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                {notificationCount}
              </Badge>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full p-0"
                aria-label="Abrir menu do usuário"
              >
                <Avatar className="h-8 w-8 border border-emerald-200 shadow-sm">
                  <AvatarImage src={profileAvatarUrl || undefined} alt={profileName || "Avatar do usuário"} />
                  <AvatarFallback className="bg-emerald-500 text-white">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium leading-none">
                    {profileName || "Usuário"}
                  </span>
                  {userEmail && (
                    <span className="text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate("/perfil")}>
                <User className="mr-2 h-4 w-4" />
                Editar perfil
              </DropdownMenuItem>
              {canOpenSettings && (
                <DropdownMenuItem onSelect={onOpenSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações do sistema
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {headerActions}
        </div>
      </div>
    </header>
  );
}

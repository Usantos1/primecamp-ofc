import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { AppBar } from "@/components/AppBar"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Bell, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { NotificationPanel } from "./NotificationPanel"
import { SettingsModal } from "./SettingsModal"
import { PermissionGate } from "./PermissionGate"
import { DemoBanner } from "./DemoBanner"
import { useAuth } from "@/contexts/AuthContext"

/** Apenas a empresa 1 (administradora) pode alterar nome e cores do sistema. */
const ADMIN_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

/** True se o app está embutido no iframe da LP (não mostrar banner para não duplicar). */
function isEmbeddedInLp(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (new URLSearchParams(window.location.search).get('embed') === '1') return true
    return window.self !== window.top
  } catch {
    return true
  }
}

interface ModernLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  headerActions?: React.ReactNode
}

export function ModernLayout({ children, title, subtitle, headerActions }: ModernLayoutProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(3)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { user, profile, signOut } = useAuth()
  const isAdminCompany = user?.company_id === ADMIN_COMPANY_ID

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const openPanel = () => setIsNotificationOpen(true)
    window.addEventListener('open-notification-panel', openPanel)
    return () => window.removeEventListener('open-notification-panel', openPanel)
  }, [])

  const hideDemoBanner = isEmbeddedInLp()

  return (
    <SidebarProvider>
      <div className="h-screen h-[100dvh] flex flex-col w-full bg-background overflow-hidden">
        {!hideDemoBanner && <DemoBanner />}

        <div className="flex-1 flex min-h-0 w-full overflow-hidden transition-all duration-300 ease-in-out">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Header — título + AppBar (navegação DRE, Contas etc. no financeiro) */}
          <header className="bg-background/95 backdrop-blur-sm sticky top-0 z-40 md:hidden flex flex-col border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div className="h-10 flex items-center px-2 min-h-[40px]">
              <SidebarTrigger className="h-8 w-8 p-1 shrink-0" />
              {title && (
                <div className="ml-2 min-w-0 flex-1">
                  <h1 className="font-medium text-sm truncate text-foreground">{title}</h1>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="relative shrink-0"
                onClick={() => setIsNotificationOpen(true)}
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 min-w-4 p-0 flex items-center justify-center bg-red-500 text-white text-[10px]">
                    {notificationCount}
                  </Badge>
                )}
              </Button>
              <ThemeToggle variant="button" size="sm" className="shrink-0" />
            </div>
            <div className="min-h-0 min-w-0 overflow-x-auto overflow-y-hidden">
              <AppBar />
            </div>
          </header>

          {/* Desktop Header */}
          <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40 hidden md:block app-header">
            <div className="h-16 flex items-center justify-between px-6 gap-4">
              {/* Lado esquerdo: Sidebar Trigger */}
              <div className="flex items-center">
                <SidebarTrigger className="h-8 w-8" />
              </div>

              {/* Centro: AppBar - Navegação rápida */}
              <div className="flex-1 flex items-center justify-center">
                <AppBar />
              </div>

              {/* Lado direito: Relógio, Ícones e Nome */}
              <div className="flex items-center gap-3">
                {/* Relógio discreto */}
                <div className="hidden lg:flex items-center text-sm text-muted-foreground font-mono">
                  <span>{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  {profile?.display_name && (
                    <>
                      <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                      <span className="font-sans font-medium text-foreground">{profile.display_name.split(' ')[0]}</span>
                    </>
                  )}
                </div>

                <div className="h-4 w-px bg-border hidden lg:block" />

                <ThemeToggle variant="button" size="sm" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative"
                  onClick={() => setIsNotificationOpen(true)}
                >
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                      {notificationCount}
                    </Badge>
                  )}
                </Button>
                {isAdminCompany && (
                  <PermissionGate permission="admin.config">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsSettingsOpen(true)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </PermissionGate>
                )}

                {/* Header Actions */}
                {headerActions}
              </div>
            </div>
          </header>

          {/* Main Content — mobile: página rola; desktop: scroll interno */}
          <main className="flex-1 flex flex-col min-h-0 overflow-x-hidden overflow-y-auto md:overflow-hidden">
            <div 
              className="flex-1 min-h-0 p-1 sm:p-2 md:p-4 pt-1 sm:pt-2 md:pt-4 overflow-x-hidden md:overflow-y-auto scrollbar-thin min-w-0"
            >
              {children}
            </div>
          </main>
          </div>
        </div>
      </div>
      
      <NotificationPanel 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)}
        onNotificationChange={(count) => setNotificationCount(count)}
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </SidebarProvider>
  )
}
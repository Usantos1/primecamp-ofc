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
import { useAuth } from "@/contexts/AuthContext"

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
  const { profile } = useAuth()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <SidebarProvider>
      <div className="h-screen h-[100dvh] flex w-full bg-background overflow-hidden">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out">
          {/* Mobile Header - Mínimo */}
          <header className="h-10 bg-background/95 backdrop-blur-sm sticky top-0 z-40 md:hidden flex items-center px-2 border-b border-gray-100">
            <SidebarTrigger className="h-8 w-8 p-1" />
            {title && (
              <div className="ml-2 min-w-0 flex-1">
                <h1 className="font-medium text-sm truncate text-gray-700">{title}</h1>
              </div>
            )}
            <ThemeToggle variant="button" size="sm" />
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
                <PermissionGate permission="admin.config">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </PermissionGate>

                {/* Header Actions */}
                {headerActions}
              </div>
            </div>
          </header>

          {/* Main Content - usa todo o espaço disponível */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div 
              className="flex-1 min-h-0 overflow-y-auto p-1 sm:p-2 md:p-4 pt-1 sm:pt-2 md:pt-4 scrollbar-thin"
            >
              {children}
            </div>
          </main>
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
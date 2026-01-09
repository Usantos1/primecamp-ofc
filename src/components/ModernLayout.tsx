import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { AppBar } from "@/components/AppBar"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Search, Bell, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useRef } from "react"
import { NotificationPanel } from "./NotificationPanel"
import { SettingsModal } from "./SettingsModal"
import { useProcesses } from "@/hooks/useProcesses"
import { useTasks } from "@/hooks/useTasks"
import { useNavigate } from "react-router-dom"
import { PermissionGate } from "./PermissionGate"
import { useAuth } from "@/contexts/AuthContext"

interface ModernLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  headerActions?: React.ReactNode
  onSearch?: (term: string) => void
}

export function ModernLayout({ children, title, subtitle, headerActions, onSearch }: ModernLayoutProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [notificationCount, setNotificationCount] = useState(3)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { processes } = useProcesses()
  const { tasks } = useTasks()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const searchRef = useRef<HTMLDivElement>(null)

  // Atualizar relógio a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Atualiza a cada 60 segundos
    return () => clearInterval(timer)
  }, [])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    onSearch?.(value)
    
    if (value.trim()) {
      const processResults = processes.filter(p => 
        p.name.toLowerCase().includes(value.toLowerCase()) ||
        p.objective.toLowerCase().includes(value.toLowerCase())
      ).map(p => ({ ...p, type: 'process' }))
      
      const taskResults = tasks.filter(t => 
        t.name.toLowerCase().includes(value.toLowerCase()) ||
        t.responsible_name?.toLowerCase().includes(value.toLowerCase())
      ).map(t => ({ ...t, type: 'task' }))
      
      setSearchResults([...processResults, ...taskResults])
    } else {
      setSearchResults([])
    }
  }

  const handleResultClick = (result: any) => {
    if (result.type === 'process') {
      navigate(`/processo/${result.id}`)
    } else if (result.type === 'task') {
      navigate('/tasks')
    }
    setSearchTerm('')
    setSearchResults([])
  }

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden">
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
          <main className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div 
              className="flex-1 overflow-y-auto min-h-0 p-1 sm:p-2 md:p-4 pt-1 sm:pt-2 md:pt-4"
              style={{ 
                scrollbarWidth: 'thin', 
                scrollbarColor: 'rgba(0,0,0,0.15) transparent' 
              }}
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
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
  const { processes } = useProcesses()
  const { tasks } = useTasks()
  const navigate = useNavigate()
  const searchRef = useRef<HTMLDivElement>(null)

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
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
          {/* Mobile Header */}
          <header className="h-16 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40 md:hidden flex items-center px-4">
            <SidebarTrigger className="h-8 w-8" />
            {title && (
              <div className="ml-4 min-w-0 flex-1">
                <h1 className="font-semibold text-lg truncate">{title}</h1>
              </div>
            )}
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

              {/* Lado direito: Ícones (Tema, Configurações, Notificações) */}
              <div className="flex items-center gap-2">
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

          {/* Main Content - altura calculada: viewport - header (64px) */}
          <main className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
            <div className="h-full p-2 md:p-4 pt-4 md:pt-6 max-w-full flex flex-col overflow-hidden">
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
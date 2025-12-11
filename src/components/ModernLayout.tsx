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
            <div className="h-14 flex items-center justify-center px-6 gap-4">
              {/* Lado esquerdo: Sidebar Trigger */}
              <div className="flex items-center">
                <SidebarTrigger className="h-8 w-8" />
              </div>

              {/* Centro: AppBar - Navegação rápida */}
              <div className="flex-1 flex items-center justify-center">
                <AppBar />
              </div>

              {/* Lado direito: Search */}
              <div className="flex items-center gap-2">
                <div ref={searchRef} className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 w-64 bg-muted/50 border-0 focus:bg-background"
                  />
                  
                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <div 
                          key={`${result.type}-${result.id}-${index}`}
                          className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                              {result.type === 'process' ? 'Processo' : 'Tarefa'}
                            </span>
                            <span className="font-medium">{result.name}</span>
                          </div>
                          {result.type === 'task' && result.responsible_name && (
                            <div className="text-xs text-muted-foreground ml-2">
                              Responsável: {result.responsible_name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Header Actions */}
                {headerActions}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6 max-w-full">
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
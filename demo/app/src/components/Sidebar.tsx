import { Mic, Users, Wand2, PanelLeftClose, PanelLeft } from 'lucide-react'
import { useStore } from '@/store'
import type { TtsMode } from '@/store'
import { cn } from '@/lib/utils'

const modes: { id: TtsMode; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'voice_clone', label: 'Voice Clone', icon: Mic },
  { id: 'custom', label: 'Custom Speaker', icon: Users },
  { id: 'voice_design', label: 'Voice Design', icon: Wand2 },
]

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, activeMode, setActiveMode } = useStore()

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-zinc-800 bg-zinc-950 flex-shrink-0 transition-all duration-200',
        sidebarOpen ? 'w-44' : 'w-12'
      )}
    >
      <div className="flex items-center justify-end p-2 border-b border-zinc-800 h-11">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>
      </div>
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveMode(id)}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors text-left',
              activeMode === id
                ? 'bg-violet-500/15 text-violet-400 font-medium'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
            )}
            title={!sidebarOpen ? label : undefined}
          >
            <Icon className={cn('flex-shrink-0', sidebarOpen ? 'w-4 h-4' : 'w-4 h-4 mx-auto')} />
            {sidebarOpen && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  )
}

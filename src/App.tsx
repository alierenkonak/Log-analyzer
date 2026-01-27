import { useState } from 'react'
import { LayoutDashboard, FileUp, Activity } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Log Analyzer
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${activeTab === 'dashboard'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
              }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${activeTab === 'import'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
              }`}
          >
            <FileUp className="w-5 h-5" />
            Data Import
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-6 bg-card rounded-xl border shadow-sm">
                <div className="text-sm font-medium text-muted-foreground">Total Tests</div>
                <div className="text-2xl font-bold">0</div>
              </div>
              <div className="p-6 bg-card rounded-xl border shadow-sm">
                <div className="text-sm font-medium text-muted-foreground">Failed Rate</div>
                <div className="text-2xl font-bold text-destructive">0%</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Data Import</h2>
            <div className="p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center min-h-[400px] border-muted-foreground/25 bg-muted/5">
              <FileUp className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">Drop Log File Here</h3>
              <p className="text-muted-foreground mt-2">Supports .log and .xlsx files</p>
              <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md">
                Select File
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

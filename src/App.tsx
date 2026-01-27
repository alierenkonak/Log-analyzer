import { useState, useEffect } from 'react'
import { LayoutDashboard, FileUp, Activity, CheckCircle, XCircle, Loader2, Table } from 'lucide-react'
import { LogsTable } from './components/LogsTable'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({ total: 0, failedRate: 0 })
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null)

  // Fetch stats on mount and after import
  const fetchStats = async () => {
    try {
      const result = await window.api.db.getStats()
      setStats(result)
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleImport = async () => {
    setImporting(true)
    setImportResult(null)

    try {
      // Open file dialog
      const filePath = await window.api.dialog.selectLogFile()
      if (!filePath) {
        setImporting(false)
        return // User cancelled
      }

      // Import the file
      const result = await window.api.db.importLog(filePath)
      setImportResult(result)

      // Refresh stats
      if (result.success) {
        await fetchStats()
      }
    } catch (e) {
      setImportResult({ success: false, count: 0, error: String(e) })
    } finally {
      setImporting(false)
    }
  }

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

          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${activeTab === 'logs'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
              }`}
          >
            <Table className="w-5 h-5" />
            Logs Table
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
                <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              </div>
              <div className="p-6 bg-card rounded-xl border shadow-sm">
                <div className="text-sm font-medium text-muted-foreground">Failed Rate</div>
                <div className="text-2xl font-bold text-destructive">{stats.failedRate}%</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Data Import</h2>
            <div className="p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center min-h-[400px] border-muted-foreground/25 bg-muted/5">
              <FileUp className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">Import Log File</h3>
              <p className="text-muted-foreground mt-2">Select a .log file to import</p>

              <button
                onClick={handleImport}
                disabled={importing}
                className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-md flex items-center gap-2 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FileUp className="w-5 h-5" />
                    Select File
                  </>
                )}
              </button>

              {/* Import Result Feedback */}
              {importResult && (
                <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${importResult.success
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                  {importResult.success ? (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      <span>Successfully imported <strong>{importResult.count.toLocaleString()}</strong> records!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6" />
                      <span>Import failed: {importResult.error}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Logs Table</h2>
            <LogsTable />
          </div>
        )}
      </main>
    </div>
  )
}

export default App

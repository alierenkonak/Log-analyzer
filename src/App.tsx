import { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, FileUp, Activity, CheckCircle, XCircle, Loader2, Table, FileText, Calendar, Database, RefreshCw, FolderPlus, Folder, MoreVertical, Edit2, Trash2, FolderOpen, Check } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { LogsTable } from './components/LogsTable'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({ total: 0, failedRate: 0.0, avgMeasurementTime: 0, avgUncertainty: 0 })
  const [trendData, setTrendData] = useState<{ date: string; success: number; failed: number }[]>([])
  const [trendGroupBy, setTrendGroupBy] = useState<'day' | 'hour'>('day')
  const [errorData, setErrorData] = useState<{ name: string; value: number }[]>([])
  const [distData, setDistData] = useState<{ name: string; value: number }[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null)

  // File management state
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileScope, setFileScope] = useState<FileScope>('both')
  const [loadingFiles, setLoadingFiles] = useState(true)

  // Folder state
  const [folders, setFolders] = useState<Folder[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolder, setEditingFolder] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [expandedFolderIds, setExpandedFolderIds] = useState<number[]>([])
  const [folderMenuOpen, setFolderMenuOpen] = useState<number | null>(null)
  const [fileMenuOpen, setFileMenuOpen] = useState<string | null>(null)

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const result = await window.api.db.getFolders()
      setFolders(result)
    } catch (e) {
      console.error('Failed to fetch folders:', e)
    }
  }, [])

  // Fetch imported files list
  const fetchImportedFiles = useCallback(async () => {
    setLoadingFiles(true)
    try {
      const files = await window.api.db.getImportedFiles()
      setImportedFiles(files)
    } catch (e) {
      console.error('Failed to fetch imported files:', e)
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  // Fetch stats based on selected file and scope
  const fetchStats = useCallback(async () => {
    try {
      const isDashboardActive = selectedFile && (fileScope === 'dashboard' || fileScope === 'both')

      if (isDashboardActive && selectedFile) {
        const result = await window.api.db.getStats([selectedFile])
        const trend = await window.api.db.getTrend([selectedFile], trendGroupBy)
        const errors = await window.api.db.getErrors([selectedFile])
        const dist = await window.api.db.getDistribution('measurement_group', [selectedFile])

        setStats(result)
        setTrendData(trend)
        setErrorData(errors)
        setDistData(dist)
      } else {
        const files = undefined; // Fetch globally if no specific dashboard file selected
        const result = await window.api.db.getStats(files)
        const trend = await window.api.db.getTrend(files, trendGroupBy)
        const errors = await window.api.db.getErrors(files)
        const dist = await window.api.db.getDistribution('measurement_group', files)

        setStats(result)
        setTrendData(trend)
        setErrorData(errors)
        setDistData(dist)
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  }, [selectedFile, fileScope, trendGroupBy])

  // Get selected files for logs table
  const getLogsSelectedFile = (): string | null => {
    if (selectedFile && (fileScope === 'logs' || fileScope === 'both')) {
      return selectedFile
    }
    // Return a non-existent file name to force empty results when not selected
    return '__NO_SELECTION__'
  }

  useEffect(() => {
    fetchImportedFiles()
    fetchFolders()
  }, [fetchImportedFiles, fetchFolders])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Click outside handler for menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // Close folder menu if clicked outside
      if (folderMenuOpen !== null && !target.closest('.folder-menu-container')) {
        setFolderMenuOpen(null)
      }

      // Close file menu if clicked outside
      if (fileMenuOpen !== null && !target.closest('.file-menu-container')) {
        setFileMenuOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [folderMenuOpen, fileMenuOpen])

  const handleImport = async () => {
    setImporting(true)
    setImportResult(null)

    try {
      const filePath = await window.api.dialog.selectLogFile()
      if (!filePath) {
        setImporting(false)
        return
      }

      const result = await window.api.db.importLog(filePath)
      setImportResult(result)

      if (result.success) {
        await fetchStats()
        await fetchImportedFiles()
      }
    } catch (e) {
      setImportResult({ success: false, count: 0, error: String(e) })
    } finally {
      setImporting(false)
    }
  }

  // Folder operations
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await window.api.db.createFolder(newFolderName.trim())
      setNewFolderName('')
      await fetchFolders()
    } catch (e) {
      console.error('Failed to create folder:', e)
    }
  }

  const handleRenameFolder = async (id: number) => {
    if (!editingName.trim()) return
    try {
      await window.api.db.renameFolder(id, editingName.trim())
      setEditingFolder(null)
      setEditingName('')
      await fetchFolders()
    } catch (e) {
      console.error('Failed to rename folder:', e)
    }
  }

  const handleDeleteFolder = async (id: number) => {
    try {
      await window.api.db.deleteFolder(id)
      setExpandedFolderIds(prev => prev.filter(folderId => folderId !== id))
      await fetchFolders()
      await fetchImportedFiles()
    } catch (e) {
      console.error('Failed to delete folder:', e)
    }
  }

  const handleAssignToFolder = async (fileSource: string, folderId: number | null) => {
    try {
      await window.api.db.assignFileToFolder(fileSource, folderId)
      setFileMenuOpen(null)
      await fetchImportedFiles()
    } catch (e) {
      console.error('Failed to assign file to folder:', e)
    }
  }

  const handleDeleteFile = async (fileSource: string) => {
    try {
      await window.api.db.deleteFile(fileSource)
      setFileMenuOpen(null)
      if (selectedFile === fileSource) setSelectedFile(null)
      await fetchImportedFiles()
      await fetchStats()
    } catch (e) {
      console.error('Failed to delete file:', e)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  // Get files by folder
  const unassignedFiles = importedFiles.filter(f => f.folder_id === null)
  const getFilesInFolder = (folderId: number) => importedFiles.filter(f => f.folder_id === folderId)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Log Analyzer
          </h1>
        </div>

        <nav className="p-4 space-y-2">
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
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${activeTab === 'logs'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
              }`}
          >
            <Table className="w-5 h-5" />
            Logs Table
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

        {/* File Selection Section */}
        <div className="flex-1 p-4 border-t overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Database className="w-4 h-4" />
              Imported Files
            </h3>
            <button
              onClick={() => { fetchImportedFiles(); fetchFolders(); }}
              className="p-1 hover:bg-muted rounded"
              title="Refresh"
            >
              <RefreshCw className={`w-3 h-3 ${loadingFiles ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Scope Selector */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Apply filter to:</label>
            <select
              value={fileScope}
              onChange={(e) => setFileScope(e.target.value as FileScope)}
              className="w-full px-2 py-1.5 text-xs rounded border bg-background"
            >
              <option value="both">Dashboard & Logs</option>
              <option value="dashboard">Dashboard Only</option>
              <option value="logs">Logs Table Only</option>
            </select>
          </div>

          {/* File List */}
          <div className="space-y-1">
            {loadingFiles ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : importedFiles.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                No files imported yet
              </div>
            ) : (
              importedFiles.map((file) => (
                <label
                  key={file.file_source}
                  className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${selectedFile === file.file_source ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted border border-transparent'
                    }`}
                >
                  <input
                    type="radio"
                    name="fileSelection"
                    checked={selectedFile === file.file_source}
                    onChange={() => { }}
                    onClick={() => {
                      if (selectedFile === file.file_source) {
                        setSelectedFile(null)
                      } else {
                        setSelectedFile(file.file_source)
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-1 truncate" title={file.file_source}>
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{file.file_source}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {file.record_count.toLocaleString()} records
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
              {selectedFile && (fileScope === 'dashboard' || fileScope === 'both') && (
                <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  Filtering: {selectedFile}
                </span>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Total Measurements */}
              <div className="p-6 bg-card rounded-xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Total Measurements</div>
                  <div className="text-3xl font-extrabold text-foreground">{stats.total.toLocaleString()}</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span>Recorded logs</span>
                </div>
              </div>

              {/* Success Rate */}
              <div className="p-6 bg-card rounded-xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Success Rate</div>
                  <div className="text-3xl font-extrabold text-foreground">{Math.max(0, 100 - stats.failedRate).toFixed(1)}%</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <CheckCircle className={`w-4 h-4 ${100 - stats.failedRate > 90 ? 'text-green-500' : 'text-orange-500'}`} />
                  <span className="text-muted-foreground">Passed tests</span>
                </div>
              </div>

              {/* Avg Measurement Time */}
              <div className="p-6 bg-card rounded-xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Avg. Duration</div>
                  <div className="text-3xl font-extrabold text-foreground">{stats.avgMeasurementTime} ms</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="w-4 h-4 text-purple-500" />
                  <span>Per measurement</span>
                </div>
              </div>

              {/* Avg Uncertainty */}
              <div className="p-6 bg-card rounded-xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Avg. Uncertainty</div>
                  <div className="text-3xl font-extrabold text-foreground">{stats.avgUncertainty}</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <span>Quality variance</span>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2">

              {/* Trend Chart (Full Width on mobile, spanning on large) */}
              <div className="col-span-1 md:col-span-2 bg-card rounded-xl border shadow-sm p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Time Analysis (Trend)</h3>
                    <p className="text-sm text-muted-foreground">Daily/Hourly success vs failure trends</p>
                  </div>
                  <div className="flex bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setTrendGroupBy('day')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${trendGroupBy === 'day'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setTrendGroupBy('hour')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${trendGroupBy === 'hour'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      Hourly
                    </button>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" className="opacity-50" />
                      <XAxis
                        dataKey="date"
                        stroke="currentColor"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="currentColor"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: '#000000' }}
                        itemStyle={{ color: '#000000' }}
                        cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="success" name="Success" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="failed" name="Failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Distribution Chart */}
              <div className="bg-card rounded-xl border shadow-sm p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Measurement Groups</h3>
                  <p className="text-sm text-muted-foreground">Distribution by group type</p>
                </div>
                <div className="h-[300px] w-full flex items-center justify-center">
                  {distData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {distData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-muted-foreground text-sm">No distribution data available</div>
                  )}
                </div>
              </div>

              {/* Top Errors Chart */}
              <div className="bg-card rounded-xl border shadow-sm p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Top Failure Causes</h3>
                  <p className="text-sm text-muted-foreground">Most frequent error descriptions</p>
                </div>
                <div className="h-[300px] w-full">
                  {errorData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={errorData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" className="opacity-50" />
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={150}
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                          cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                        />
                        <Bar dataKey="value" name="Error Count" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No errors recorded
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* Header with Import Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">Data Import</h2>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center gap-2 disabled:opacity-50 hover:bg-primary/90"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FileUp className="w-4 h-4" />
                    Import Log File
                  </>
                )}
              </button>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className={`p-4 rounded-lg flex items-center justify-between ${importResult.success
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                <div className="flex items-center gap-3">
                  {importResult.success ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Successfully imported <strong>{importResult.count.toLocaleString()}</strong> records!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>Import failed: {importResult.error}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setImportResult(null)}
                  className="p-1 hover:bg-black/10 rounded"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Folders */}
              <div className="bg-card rounded-xl border p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  Folders
                </h3>

                {/* Create New Folder */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    placeholder="New folder name..."
                    className="flex-1 px-3 py-2 text-sm rounded border bg-background"
                  />
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded flex items-center gap-1 disabled:opacity-50"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>

                {/* Folder List */}
                <div className="space-y-2">
                  {folders.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No folders yet. Create one above.
                    </div>
                  ) : (
                    folders.map((folder) => (
                      <div
                        key={folder.id}
                        className={`p-3 rounded-lg border transition-colors ${expandedFolderIds.includes(folder.id) ? 'bg-background border-primary shadow-sm' : 'hover:bg-muted'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          {editingFolder === folder.id ? (
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameFolder(folder.id)
                                if (e.key === 'Escape') setEditingFolder(null)
                              }}
                              onBlur={() => handleRenameFolder(folder.id)}
                              autoFocus
                              className="flex-1 px-2 py-1 text-sm rounded border bg-background"
                            />
                          ) : (
                            <div
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                              onClick={() => setExpandedFolderIds(prev =>
                                prev.includes(folder.id)
                                  ? prev.filter(id => id !== folder.id)
                                  : [...prev, folder.id]
                              )}
                            >
                              <Folder className="w-4 h-4 text-primary" />
                              <span className="font-medium">{folder.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({getFilesInFolder(folder.id).length} files)
                              </span>
                            </div>
                          )}

                          <div className="relative folder-menu-container">
                            <button
                              onClick={() => setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {folderMenuOpen === folder.id && (
                              <div className="absolute right-0 top-8 bg-card border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                                <button
                                  onClick={() => {
                                    setEditingFolder(folder.id)
                                    setEditingName(folder.name)
                                    setFolderMenuOpen(null)
                                  }}
                                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                >
                                  <Edit2 className="w-3 h-3" /> Rename
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteFolder(folder.id)
                                    setFolderMenuOpen(null)
                                  }}
                                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-destructive flex items-center gap-2"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Files in Folder */}
                        {expandedFolderIds.includes(folder.id) && (
                          <div className="mt-3 pl-6 space-y-1">
                            {getFilesInFolder(folder.id).map((file) => (
                              <div key={file.file_source} className="group flex items-center justify-between p-2 bg-background rounded-md text-sm border border-border/50 shadow-sm">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3 h-3 text-muted-foreground" />
                                  <span className="truncate">{file.file_source}</span>
                                </div>
                                <div className="relative file-menu-container">
                                  <button
                                    onClick={() => setFileMenuOpen(fileMenuOpen === file.file_source ? null : file.file_source)}
                                    className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="w-3 h-3 text-muted-foreground" />
                                  </button>

                                  {fileMenuOpen === file.file_source && (
                                    <div className="absolute right-0 top-6 bg-card border rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
                                      {/* Move Actions */}
                                      <div className="px-3 py-1 text-xs text-muted-foreground font-medium">Move to</div>
                                      <button
                                        onClick={() => handleAssignToFolder(file.file_source, null)}
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                      >
                                        <FileUp className="w-3 h-3" /> Unassigned Files
                                      </button>
                                      {folders
                                        .filter(f => f.id !== folder.id)
                                        .map((targetFolder) => (
                                          <button
                                            key={targetFolder.id}
                                            onClick={() => handleAssignToFolder(file.file_source, targetFolder.id)}
                                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                          >
                                            <Folder className="w-3 h-3" /> {targetFolder.name}
                                          </button>
                                        ))}

                                      <div className="border-t my-1" />

                                      {/* Visibility Actions */}
                                      <div className="px-3 py-1 text-xs text-muted-foreground font-medium">Visibility</div>
                                      <button
                                        onClick={() => {
                                          const isActive = selectedFile === file.file_source && (fileScope === 'dashboard' || fileScope === 'both');
                                          if (!isActive) {
                                            if (selectedFile === file.file_source) setFileScope('both');
                                            else { setSelectedFile(file.file_source); setFileScope('dashboard'); }
                                          } else {
                                            if (fileScope === 'both') setFileScope('logs');
                                            else setSelectedFile(null);
                                          }
                                        }}
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 justify-between"
                                      >
                                        <span className="flex items-center gap-2"><LayoutDashboard className="w-3 h-3" /> Show in Dashboard</span>
                                        {selectedFile === file.file_source && (fileScope === 'dashboard' || fileScope === 'both') && <Check className="w-3 h-3 text-primary" />}
                                      </button>
                                      <button
                                        onClick={() => {
                                          const isActive = selectedFile === file.file_source && (fileScope === 'logs' || fileScope === 'both');
                                          if (!isActive) {
                                            if (selectedFile === file.file_source) setFileScope('both');
                                            else { setSelectedFile(file.file_source); setFileScope('logs'); }
                                          } else {
                                            if (fileScope === 'both') setFileScope('dashboard');
                                            else setSelectedFile(null);
                                          }
                                        }}
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 justify-between"
                                      >
                                        <span className="flex items-center gap-2"><Table className="w-3 h-3" /> Show in Logs Table</span>
                                        {selectedFile === file.file_source && (fileScope === 'logs' || fileScope === 'both') && <Check className="w-3 h-3 text-primary" />}
                                      </button>

                                      <div className="border-t my-1" />

                                      {/* Delete Action */}
                                      <button
                                        onClick={() => {
                                          if (window.confirm('Are you sure you want to delete this log file? This action cannot be undone.')) {
                                            handleDeleteFile(file.file_source);
                                          }
                                        }}
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-destructive flex items-center gap-2"
                                      >
                                        <Trash2 className="w-3 h-3" /> Delete Log File
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {getFilesInFolder(folder.id).length === 0 && (
                              <div className="text-xs text-muted-foreground py-2">
                                No files in this folder
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column - Files */}
              <div className="space-y-6">
                {/* Unassigned Files */}
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-500" />
                    Unassigned Files
                    <span className="text-sm font-normal text-muted-foreground">({unassignedFiles.length})</span>
                  </h3>

                  {unassignedFiles.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      All files are assigned to folders
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {unassignedFiles.map((file) => (
                        <div key={file.file_source} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{file.file_source}</div>
                            <div className="text-xs text-muted-foreground">
                              {file.record_count.toLocaleString()} records • {formatDate(file.imported_at)}
                            </div>
                          </div>
                          <div className="relative file-menu-container">
                            <button
                              onClick={() => setFileMenuOpen(fileMenuOpen === file.file_source ? null : file.file_source)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {fileMenuOpen === file.file_source && (
                              <div className="absolute right-0 top-8 bg-card border rounded-lg shadow-lg py-1 z-50 min-w-[150px]">
                                {folders.length > 0 && (
                                  <div className="px-3 py-1 text-xs text-muted-foreground">Move to folder</div>
                                )}
                                {folders.map((folder) => (
                                  <button
                                    key={folder.id}
                                    onClick={() => handleAssignToFolder(file.file_source, folder.id)}
                                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                  >
                                    <Folder className="w-3 h-3" /> {folder.name}
                                  </button>
                                ))}
                                {folders.length > 0 && <div className="border-t my-1" />}
                                <button
                                  onClick={() => handleDeleteFile(file.file_source)}
                                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-destructive flex items-center gap-2"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* All Files */}
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    All Imported Files
                    <span className="text-sm font-normal text-muted-foreground">({importedFiles.length})</span>
                  </h3>

                  {importedFiles.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No files imported yet
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-auto">
                      {importedFiles.map((file) => {
                        const folder = folders.find(f => f.id === file.folder_id)
                        return (
                          <div key={file.file_source} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                {file.file_source}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span>{file.record_count.toLocaleString()} records</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(file.imported_at)}
                                </span>
                                {folder && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-primary">
                                      <Folder className="w-3 h-3" />
                                      {folder.name}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">Logs Table</h2>
              {getLogsSelectedFile() && (
                <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  Filtering: {getLogsSelectedFile()}
                </span>
              )}
            </div>
            <LogsTable selectedFile={getLogsSelectedFile()} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App

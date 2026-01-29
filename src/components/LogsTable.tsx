import { useState, useEffect, useCallback } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Loader2, Filter, X, Search, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react'

const columnHelper = createColumnHelper<LogRecord>()

const columns = [
    columnHelper.accessor('date', {
        header: 'Date',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('time', {
        header: 'Time',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('measurement_id', {
        header: 'Measurement ID',
        cell: info => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor('status', {
        header: 'Status',
        cell: info => {
            const status = info.getValue()
            const isFailed = status?.toLowerCase().includes('failed')
            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${isFailed
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                    {status}
                </span>
            )
        },
    }),
    columnHelper.accessor('measurement_group', {
        header: 'Group',
        cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('measurement_style', {
        header: 'Style',
        cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('color_model', {
        header: 'Color Model',
        cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('id1', {
        header: 'ID1',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('id2', {
        header: 'ID2',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('id3', {
        header: 'ID3',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('x', {
        header: 'X',
        cell: info => info.getValue()?.toFixed(3),
    }),
    columnHelper.accessor('y', {
        header: 'Y',
        cell: info => info.getValue()?.toFixed(3),
    }),
    columnHelper.accessor('z', {
        header: 'Z',
        cell: info => info.getValue()?.toFixed(3),
    }),
    columnHelper.accessor('rx', {
        header: 'RX',
        cell: info => info.getValue()?.toFixed(3),
    }),
    columnHelper.accessor('ry', {
        header: 'RY',
        cell: info => info.getValue()?.toFixed(3),
    }),
    columnHelper.accessor('rz', {
        header: 'RZ',
        cell: info => info.getValue()?.toFixed(3),
    }),
    columnHelper.accessor('uncertainty', {
        header: 'Uncertainty',
        cell: info => info.getValue()?.toFixed(3),
    }),
    columnHelper.accessor('measurement_time', {
        header: 'Time (ms)',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('features_ok', {
        header: 'Features OK',
        cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('error_desc', {
        header: 'Error Description',
        cell: info => {
            const desc = info.getValue()
            if (!desc || desc === '-') return <span className="text-muted-foreground">-</span>
            return (
                <span className="text-red-600 dark:text-red-400 text-xs truncate max-w-[200px] block" title={desc}>
                    {desc}
                </span>
            )
        },
    }),
    columnHelper.accessor('file_source', {
        header: 'Source File',
        cell: info => <span className="text-xs text-muted-foreground">{info.getValue()}</span>,
    }),
]

const defaultFilters: LogFilters = {
    status: 'all',
    dateFrom: '',
    dateTo: '',
    errorSearch: '',
    measurementGroup: '',
    measurementStyle: '',
    fileSource: '',
    sortBy: 'date',
    sortOrder: 'desc',
}

interface LogsTableProps {
    selectedFile: string | null;
}

export function LogsTable({ selectedFile }: LogsTableProps) {
    const [data, setData] = useState<LogRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [showFilters, setShowFilters] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [filters, setFilters] = useState<LogFilters>(defaultFilters)
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        measurementGroups: [],
        measurementStyles: [],
        fileSources: [],
    })
    const pageSize = 50

    // Count active filters
    const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
        if (key === 'status') return value && value !== 'all'
        return value && value !== ''
    }).length

    const fetchFilterOptions = useCallback(async () => {
        try {
            const options = await window.api.db.getFilterOptions()
            setFilterOptions(options)
        } catch (error) {
            console.error('Failed to fetch filter options:', error)
        }
    }, [])

    const fetchLogs = useCallback(async (pageNum: number, currentFilters: LogFilters) => {
        setLoading(true)
        try {
            // Clean up filters - only send non-empty values
            const cleanFilters: LogFilters = {}
            if (currentFilters.status && currentFilters.status !== 'all') {
                cleanFilters.status = currentFilters.status
            }
            if (currentFilters.dateFrom) cleanFilters.dateFrom = currentFilters.dateFrom
            if (currentFilters.dateTo) cleanFilters.dateTo = currentFilters.dateTo
            if (currentFilters.errorSearch) cleanFilters.errorSearch = currentFilters.errorSearch
            if (currentFilters.measurementGroup) cleanFilters.measurementGroup = currentFilters.measurementGroup
            if (currentFilters.measurementStyle) cleanFilters.measurementStyle = currentFilters.measurementStyle

            // Use selectedFile from props if set, otherwise use filter
            if (selectedFile) {
                cleanFilters.fileSource = selectedFile
            } else if (currentFilters.fileSource) {
                cleanFilters.fileSource = currentFilters.fileSource
            }

            // Always include sort parameters
            cleanFilters.sortBy = currentFilters.sortBy || 'date'
            cleanFilters.sortOrder = currentFilters.sortOrder || 'desc'

            const result = await window.api.db.getLogs(pageNum, pageSize, cleanFilters)
            setData(result.logs)
            setTotalPages(result.totalPages)
            setTotal(result.total)
            setPage(result.page)
        } catch (error) {
            console.error('Failed to fetch logs:', error)
        } finally {
            setLoading(false)
        }
    }, [selectedFile])

    useEffect(() => {
        fetchFilterOptions()
        fetchLogs(1, filters)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFile])

    const handleFilterChange = (key: keyof LogFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const applyFilters = () => {
        setPage(1)
        fetchLogs(1, filters)
    }

    const resetFilters = () => {
        setFilters(defaultFilters)
        setPage(1)
        fetchLogs(1, defaultFilters)
    }

    const handleSort = (column: 'date' | 'time') => {
        const newFilters = { ...filters }
        if (filters.sortBy === column) {
            // Toggle order if same column
            newFilters.sortOrder = filters.sortOrder === 'desc' ? 'asc' : 'desc'
        } else {
            // Switch to new column, default to desc
            newFilters.sortBy = column
            newFilters.sortOrder = 'desc'
        }
        setFilters(newFilters)
        setPage(1)
        fetchLogs(1, newFilters)
    }

    const getSortIcon = (column: 'date' | 'time') => {
        if (filters.sortBy !== column) {
            return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
        }
        return filters.sortOrder === 'desc'
            ? <ArrowDown className="w-3 h-3 ml-1" />
            : <ArrowUp className="w-3 h-3 ml-1" />

    }

    const handleExport = async () => {
        setExporting(true)
        try {
            // Use same clean filters logic as fetchLogs
            const cleanFilters: LogFilters = {}
            if (filters.status && filters.status !== 'all') cleanFilters.status = filters.status
            if (filters.dateFrom) cleanFilters.dateFrom = filters.dateFrom
            if (filters.dateTo) cleanFilters.dateTo = filters.dateTo
            if (filters.errorSearch) cleanFilters.errorSearch = filters.errorSearch
            if (filters.measurementGroup) cleanFilters.measurementGroup = filters.measurementGroup
            if (filters.measurementStyle) cleanFilters.measurementStyle = filters.measurementStyle

            if (selectedFile) {
                cleanFilters.fileSource = selectedFile
            } else if (filters.fileSource) {
                cleanFilters.fileSource = filters.fileSource
            }

            cleanFilters.sortBy = filters.sortBy || 'date'
            cleanFilters.sortOrder = filters.sortOrder || 'desc'

            await window.api.db.exportExcel(cleanFilters)
        } catch (error) {
            console.error('Export failed:', error)
        } finally {
            setExporting(false)
        }
    }

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="space-y-4">
            {/* Filter Toggle & Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${showFilters
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card hover:bg-muted border-border'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary-foreground text-primary">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    <div className="text-sm text-muted-foreground">
                        {total.toLocaleString()} records
                    </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchLogs(page - 1, filters)}
                        disabled={page <= 1 || loading}
                        className="p-2 rounded-md border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-sm px-3">
                        Page {page} of {totalPages}
                    </span>

                    <button
                        onClick={() => fetchLogs(page + 1, filters)}
                        disabled={page >= totalPages || loading}
                        className="p-2 rounded-md border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="p-4 bg-card border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Excel-Style Filters
                        </h3>
                        <button
                            onClick={() => setShowFilters(false)}
                            className="p-1 hover:bg-muted rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Status Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Status</label>
                            <select
                                value={filters.status || 'all'}
                                onChange={(e) => handleFilterChange('status', e.target.value as 'all' | 'failed' | 'succeeded')}
                                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="all">All</option>
                                <option value="failed">Failed Only</option>
                                <option value="succeeded">Succeeded Only</option>
                            </select>
                        </div>

                        {/* Date From */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                            <input
                                type="date"
                                value={filters.dateFrom || ''}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Date To */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">End Date</label>
                            <input
                                type="date"
                                value={filters.dateTo || ''}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Error Search */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Search Error Description</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search errors..."
                                    value={filters.errorSearch || ''}
                                    onChange={(e) => handleFilterChange('errorSearch', e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>

                        {/* Measurement Group */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Measurement Group</label>
                            <select
                                value={filters.measurementGroup || ''}
                                onChange={(e) => handleFilterChange('measurementGroup', e.target.value)}
                                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">All</option>
                                {filterOptions.measurementGroups.map(group => (
                                    <option key={group} value={group}>{group}</option>
                                ))}
                            </select>
                        </div>

                        {/* Measurement Style */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Measurement Style</label>
                            <select
                                value={filters.measurementStyle || ''}
                                onChange={(e) => handleFilterChange('measurementStyle', e.target.value)}
                                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">All</option>
                                {filterOptions.measurementStyles.map(style => (
                                    <option key={style} value={style}>{style}</option>
                                ))}
                            </select>
                        </div>

                        {/* Source File */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Source File</label>
                            <select
                                value={filters.fileSource || ''}
                                onChange={(e) => handleFilterChange('fileSource', e.target.value)}
                                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">All</option>
                                {filterOptions.fileSources.map(file => (
                                    <option key={file} value={file}>{file}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Filter Actions */}
                    <div className="flex items-center gap-3 pt-2 border-t">
                        <button
                            onClick={applyFilters}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
                        >
                            <Search className="w-4 h-4" />
                            Apply Filters
                        </button>

                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 bg-muted text-muted-foreground rounded-md flex items-center gap-2 hover:bg-muted/80 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </button>

                        <button
                            onClick={handleExport}
                            disabled={exporting || loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 hover:bg-green-700 transition-colors ml-auto disabled:opacity-50"
                        >
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Export to Excel
                        </button>

                        {activeFilterCount > 0 && (
                            <span className="text-sm text-muted-foreground">
                                {activeFilterCount} active filter(s)
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="rounded-lg border bg-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => {
                                            const columnId = header.column.id
                                            const isSortable = columnId === 'date' || columnId === 'time'

                                            return (
                                                <th
                                                    key={header.id}
                                                    className={`px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap ${isSortable ? 'cursor-pointer hover:bg-muted/80 select-none' : ''}`}
                                                    onClick={isSortable ? () => handleSort(columnId as 'date' | 'time') : undefined}
                                                >
                                                    <div className="flex items-center">
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                                        {isSortable && getSortIcon(columnId as 'date' | 'time')}
                                                    </div>
                                                </th>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y">
                                {table.getRowModel().rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length} className="px-3 py-12 text-center text-muted-foreground">
                                            No results found. Try adjusting your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    table.getRowModel().rows.map(row => (
                                        <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id} className="px-3 py-2 text-xs whitespace-nowrap">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

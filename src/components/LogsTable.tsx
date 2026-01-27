import { useState, useEffect } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

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

export function LogsTable() {
    const [data, setData] = useState<LogRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const pageSize = 50

    const fetchLogs = async (pageNum: number) => {
        setLoading(true)
        try {
            const result = await window.api.db.getLogs(pageNum, pageSize)
            setData(result.logs)
            setTotalPages(result.totalPages)
            setTotal(result.total)
            setPage(result.page)
        } catch (error) {
            console.error('Failed to fetch logs:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs(1)
    }, [])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing {data.length} of {total.toLocaleString()} records
                </div>

                {/* Pagination */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchLogs(page - 1)}
                        disabled={page <= 1 || loading}
                        className="p-2 rounded-md border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-sm px-3">
                        Page {page} of {totalPages}
                    </span>

                    <button
                        onClick={() => fetchLogs(page + 1)}
                        disabled={page >= totalPages || loading}
                        className="p-2 rounded-md border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

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
                                        {headerGroup.headers.map(header => (
                                            <th
                                                key={header.id}
                                                className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(header.column.columnDef.header, header.getContext())}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y">
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-3 py-2 text-xs whitespace-nowrap">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

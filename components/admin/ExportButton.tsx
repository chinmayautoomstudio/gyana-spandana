'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ExportButtonProps {
  data: any[]
  filename: string
  exportType?: 'csv' | 'pdf' | 'both'
  pdfTitle?: string
  columns?: { header: string; dataKey: string }[]
}

export function ExportButton({
  data,
  filename,
  exportType = 'both',
  pdfTitle,
  columns,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToCSV = () => {
    setIsExporting(true)
    try {
      const csv = Papa.unparse(data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting to CSV:', error)
      alert('Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  const exportToPDF = () => {
    setIsExporting(true)
    try {
      const doc = new jsPDF()
      
      if (pdfTitle) {
        doc.setFontSize(18)
        doc.text(pdfTitle, 14, 22)
      }

      if (columns && columns.length > 0) {
        const tableData = data.map((item) =>
          columns.map((col) => String(item[col.dataKey] || ''))
        )

        autoTable(doc, {
          head: [columns.map((col) => col.header)],
          body: tableData,
          startY: pdfTitle ? 30 : 20,
        })
      } else {
        // Fallback: export as JSON-like text
        doc.setFontSize(12)
        doc.text(JSON.stringify(data, null, 2), 14, 20)
      }

      doc.save(`${filename}.pdf`)
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      alert('Failed to export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExport = () => {
    if (exportType === 'csv' || exportType === 'both') {
      exportToCSV()
    }
    if (exportType === 'pdf' || exportType === 'both') {
      setTimeout(() => exportToPDF(), exportType === 'both' ? 500 : 0)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      isLoading={isExporting}
      disabled={data.length === 0}
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export {exportType === 'csv' ? 'CSV' : exportType === 'pdf' ? 'PDF' : 'Data'}
    </Button>
  )
}


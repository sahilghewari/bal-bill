import React, { useState } from 'react'
import { Download } from 'lucide-react'
import { Button, Select, Modal, Alert } from '../common'
import { useAppContext } from '../../hooks/useAppContext'
import adminService from '../../services/adminService'

/**
 * Report Exporter Component
 */
const ReportExporter = () => {
  const { addNotification } = useAppContext()
  const [showModal, setShowModal] = useState(false)
  const [reportType, setReportType] = useState('overview')
  const [period, setPeriod] = useState('30')
  const [exporting, setExporting] = useState(false)

  const reportTypes = [
    { value: 'overview', label: 'Overview Report' },
    { value: 'revenue', label: 'Revenue Report' },
    { value: 'payments', label: 'Payment Report' },
    { value: 'usage', label: 'Usage Report' },
    { value: 'customers', label: 'Customer Report' },
  ]

  const periods = [
    { value: '30', label: 'Last 30 Days' },
    { value: '60', label: 'Last 60 Days' },
    { value: '90', label: 'Last 90 Days' },
    { value: '180', label: 'Last 6 Months' },
  ]

  const closeModal = () => {
    if (!exporting) {
      setShowModal(false)
    }
  }

  const handleExport = async (format = 'pdf') => {
    try {
      setExporting(true)
      const data = await adminService.exportReport(reportType, period)

      const formatKey = format === 'excel' ? 'excel' : format
      const payload = data?.[formatKey]

      if (!payload) {
        throw new Error('Selected format is not available')
      }

      const typeMap = {
        pdf: 'application/pdf',
        csv: 'text/csv',
        excel: 'application/vnd.ms-excel',
      }

      const extensionMap = {
        pdf: 'pdf',
        csv: 'csv',
        excel: 'xlsx',
      }

      const blob = new Blob([payload], { type: typeMap[formatKey] })
      const filename = `report_${reportType}_${new Date().toISOString().split('T')[0]}.${extensionMap[formatKey]}`

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      addNotification({
        type: 'success',
        title: 'Success',
        message: `Report exported as ${format.toUpperCase()}`,
      })

      setShowModal(false)
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error?.message || 'Failed to export report',
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button
        icon={Download}
        onClick={() => setShowModal(true)}
        variant="outline"
      >
        Export Report
      </Button>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="Export Report"
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={closeModal} disabled={exporting}>
              Cancel
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              loading={exporting}
              disabled={exporting}
              variant="outline"
            >
              Export as Excel
            </Button>
            <Button
              onClick={() => handleExport('csv')}
              loading={exporting}
              disabled={exporting}
              variant="outline"
            >
              Export as CSV
            </Button>
            <Button onClick={() => handleExport('pdf')} loading={exporting} disabled={exporting}>
              Export as PDF
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Report Type"
            options={reportTypes}
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          />

          <Select
            label="Time Period"
            options={periods}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />

          <Alert
            type="info"
            title="Note"
            message="Reports include all relevant data for the selected period. Choose your preferred format below."
            dismissible={false}
          />
        </div>
      </Modal>
    </>
  )
}

export default ReportExporter

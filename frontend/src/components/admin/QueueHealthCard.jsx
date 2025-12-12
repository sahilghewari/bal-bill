import React from 'react'
import { AlertCircle, RefreshCw, Activity } from 'lucide-react'
import { Card, Skeleton, Alert } from '../common'
import Button from '../common/Button'

const statusBadge = (status) => {
  switch (status) {
    case 'connected':
      return 'bg-success/10 text-success'
    case 'error':
      return 'bg-error/10 text-error'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

const QueueHealthCard = ({ queue_available, queues, loading, error, onRefresh }) => (
  <Card>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        Queue Health
      </h3>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        leftIcon={<RefreshCw className="h-4 w-4" />}
      >
        Refresh
      </Button>
    </div>

    {error && (
      <Alert type="error" title="Unable to load queues" message={error} className="mb-4" />
    )}

    {loading ? (
      <div className="space-y-4">
        <Skeleton height="h-20" />
        <Skeleton height="h-20" />
      </div>
    ) : (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-md">
          <div>
            <p className="text-sm text-gray-600">Bull / Redis Availability</p>
            <p className="text-lg font-semibold">{queue_available ? 'Available' : 'Unavailable'}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${queue_available ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}
          >
            {queue_available ? 'Healthy' : 'Degraded'}
          </span>
        </div>

        {queues && queues.length > 0 ? (
          <div className="space-y-3">
            {queues.map((queue) => (
              <div key={queue.key} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{queue.name}</p>
                    <p className="text-sm text-gray-500">Key: {queue.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${queue.paused ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                      {queue.paused ? 'Paused' : 'Running'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(queue.client?.status)}`}>
                      {queue.client?.status || 'unknown'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
                  {Object.entries(queue.counts || {}).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-md p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{key}</p>
                      <p className="text-base font-semibold text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>

                {queue.repeatable_jobs && queue.repeatable_jobs.length > 0 ? (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Repeatable Jobs</p>
                    <div className="space-y-2">
                      {queue.repeatable_jobs.map((job) => (
                        <div key={job.id} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2">
                          <div>
                            <p className="font-medium text-gray-800">{job.name}</p>
                            <p className="text-xs text-gray-500">Every {Math.round((job.every || 0) / 1000)}s</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase">Next Run</p>
                            <p className="font-medium text-gray-800">{job.next_run ? new Date(job.next_run).toLocaleString() : 'Pending'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <AlertCircle className="h-4 w-4" />
                    No repeatable jobs scheduled
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle className="h-4 w-4" />
            No queues registered
          </div>
        )}
      </div>
    )}
  </Card>
)

export default QueueHealthCard

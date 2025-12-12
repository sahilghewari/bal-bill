import React from 'react'
import { Activity, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, Skeleton, Alert, Badge } from '../common'
import Button from '../common/Button'

const MAX_EVENTS_DISPLAY = 5

const statusColor = (level) => {
  switch (level) {
    case 'error':
      return 'bg-error/10 text-error'
    case 'warn':
      return 'bg-warning/10 text-warning'
    default:
      return 'bg-primary/10 text-primary'
  }
}

const NotificationFeedCard = ({
  events = [],
  loading,
  error,
  onRefresh,
}) => {
  const displayEvents = events.slice(0, MAX_EVENTS_DISPLAY)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
          <Activity className="h-5 w-5 text-primary" />
          Recent Alerts
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
        <Alert type="error" title="Unable to load alerts" message={error} className="mb-4" />
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, idx) => (
            <Skeleton key={idx} height="h-16" />
          ))}
        </div>
      ) : displayEvents.length > 0 ? (
        <div className="space-y-3">
          {displayEvents.map((event) => (
            <div
              key={event.id}
              className="border border-gray-100 rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={statusColor(event.level)}>{event.level}</Badge>
                  <span className="font-semibold text-gray-900">{event.event}</span>
                </div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
                </span>
              </div>

              {event.message && (
                <p className="text-sm text-gray-700 mb-2">{event.message}</p>
              )}

              {event.transport && (
                <p className="text-xs text-gray-500">
                  Transport: <span className="font-medium">{event.transport}</span>
                </p>
              )}

              {event.details && Object.keys(event.details).length > 0 && (
                <pre className="mt-2 text-xs bg-gray-50 rounded-md p-2 overflow-x-auto text-gray-600">
                  {JSON.stringify(event.details, null, 2)}
                </pre>
              )}
            </div>
          ))}

          {events.length > MAX_EVENTS_DISPLAY && (
            <div className="text-xs text-gray-500 text-right">
              Showing latest {MAX_EVENTS_DISPLAY} of {events.length} events
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <AlertCircle className="h-4 w-4" />
          No notifications yet.
        </div>
      )}
    </Card>
  )
}

export default NotificationFeedCard

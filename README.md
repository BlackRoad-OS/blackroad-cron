# BlackRoad Scheduled Jobs

Create and manage cron jobs with monitoring and execution logs.

## Live

- **Dashboard**: https://blackroad-cron.amundsonalexa.workers.dev
- **API**: https://blackroad-cron.amundsonalexa.workers.dev/api/jobs

## Features

- **Cron Scheduling** - Standard cron syntax
- **HTTP Triggers** - Call any endpoint (GET/POST)
- **Timezone Support** - Schedule in any timezone
- **Retry Logic** - Automatic retries on failure
- **Execution Logs** - Full history with response data
- **Manual Trigger** - Run jobs on demand
- **Stats Tracking** - Success rate, duration

## Demo Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Health Check | Every 5 min | Check service health |
| Data Cleanup | Daily 2 AM | Clean old logs |
| Collect Metrics | Hourly | Aggregate analytics |
| Database Backup | Weekly Sun 4 AM | Backup to R2 |
| Weekly Report | Weekly Mon 9 AM | Send email report |
| Upstream Sync | Every 10 min | Sync from BlackRoad-Private |

## API

### GET /api/jobs
List all scheduled jobs.

### GET /api/jobs/:id
Get a single job.

### PUT /api/jobs/:id
Update job (enable/disable).

### POST /api/jobs/:id/run
Manually trigger a job.

### GET /api/jobs/:id/executions
Get execution history for a job.

### GET /api/executions
Get all recent executions.

## Job Structure

```json
{
  "id": "job_health",
  "name": "Health Check",
  "schedule": "*/5 * * * *",
  "scheduleHuman": "Every 5 minutes",
  "timezone": "UTC",
  "endpoint": "https://example.com/health",
  "method": "GET",
  "enabled": true,
  "retries": 3,
  "timeout": 30000,
  "status": "active",
  "stats": {
    "runs": 288,
    "successes": 285,
    "failures": 3,
    "avgDuration": 245
  }
}
```

## Cron Syntax

```
┌────────── minute (0-59)
│ ┌──────── hour (0-23)
│ │ ┌────── day of month (1-31)
│ │ │ ┌──── month (1-12)
│ │ │ │ ┌── day of week (0-6, Sun=0)
│ │ │ │ │
* * * * *
```

Examples:
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 2 * * *` - Daily at 2 AM
- `0 9 * * 1` - Weekly Monday 9 AM
- `0 4 * * 0` - Weekly Sunday 4 AM

## Development

```bash
npm install
npm run dev      # Local development
npm run deploy   # Deploy to Cloudflare
```

## License

Proprietary - BlackRoad OS, Inc.

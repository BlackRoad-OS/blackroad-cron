// BlackRoad Scheduled Jobs Service
// Create and manage cron jobs with monitoring

interface Env {
  ENVIRONMENT: string;
}

interface CronJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  scheduleHuman: string;
  timezone: string;
  endpoint: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  enabled: boolean;
  retries: number;
  timeout: number;
  lastRun: string | null;
  nextRun: string;
  status: 'active' | 'paused' | 'failed';
  stats: { runs: number; successes: number; failures: number; avgDuration: number };
  createdAt: string;
}

interface JobExecution {
  id: string;
  jobId: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  status: 'success' | 'failure';
  statusCode?: number;
  response?: string;
  error?: string;
}

// Demo jobs
const jobs: Map<string, CronJob> = new Map();
const executions: JobExecution[] = [];

function initJobs() {
  if (jobs.size > 0) return;

  const demoJobs: CronJob[] = [
    {
      id: 'job_health',
      name: 'Health Check',
      description: 'Check all service health endpoints',
      schedule: '*/5 * * * *',
      scheduleHuman: 'Every 5 minutes',
      timezone: 'UTC',
      endpoint: 'https://blackroad-status.amundsonalexa.workers.dev/api/status',
      method: 'GET',
      enabled: true,
      retries: 3,
      timeout: 30000,
      lastRun: new Date(Date.now() - 300000).toISOString(),
      nextRun: new Date(Date.now() + 60000).toISOString(),
      status: 'active',
      stats: { runs: 288, successes: 285, failures: 3, avgDuration: 245 },
      createdAt: '2026-01-15T10:00:00Z',
    },
    {
      id: 'job_cleanup',
      name: 'Data Cleanup',
      description: 'Clean up old logs and temporary data',
      schedule: '0 2 * * *',
      scheduleHuman: 'Daily at 2:00 AM',
      timezone: 'America/Chicago',
      endpoint: 'https://blackroad-audit.amundsonalexa.workers.dev/api/cleanup',
      method: 'POST',
      enabled: true,
      retries: 2,
      timeout: 60000,
      lastRun: new Date(Date.now() - 86400000).toISOString(),
      nextRun: new Date(Date.now() + 43200000).toISOString(),
      status: 'active',
      stats: { runs: 30, successes: 30, failures: 0, avgDuration: 1234 },
      createdAt: '2026-01-20T14:00:00Z',
    },
    {
      id: 'job_metrics',
      name: 'Collect Metrics',
      description: 'Aggregate analytics metrics hourly',
      schedule: '0 * * * *',
      scheduleHuman: 'Every hour',
      timezone: 'UTC',
      endpoint: 'https://blackroad-analytics.amundsonalexa.workers.dev/api/aggregate',
      method: 'POST',
      enabled: true,
      retries: 3,
      timeout: 45000,
      lastRun: new Date(Date.now() - 1800000).toISOString(),
      nextRun: new Date(Date.now() + 1800000).toISOString(),
      status: 'active',
      stats: { runs: 720, successes: 718, failures: 2, avgDuration: 567 },
      createdAt: '2026-01-18T09:00:00Z',
    },
    {
      id: 'job_backup',
      name: 'Database Backup',
      description: 'Backup KV namespaces to R2',
      schedule: '0 4 * * 0',
      scheduleHuman: 'Weekly on Sunday at 4:00 AM',
      timezone: 'UTC',
      endpoint: 'https://blackroad-backup.amundsonalexa.workers.dev/api/backup',
      method: 'POST',
      enabled: true,
      retries: 2,
      timeout: 300000,
      lastRun: new Date(Date.now() - 259200000).toISOString(),
      nextRun: new Date(Date.now() + 345600000).toISOString(),
      status: 'active',
      stats: { runs: 8, successes: 8, failures: 0, avgDuration: 45000 },
      createdAt: '2026-02-01T11:00:00Z',
    },
    {
      id: 'job_report',
      name: 'Weekly Report',
      description: 'Send weekly usage report email',
      schedule: '0 9 * * 1',
      scheduleHuman: 'Weekly on Monday at 9:00 AM',
      timezone: 'America/New_York',
      endpoint: 'https://blackroad-email.amundsonalexa.workers.dev/api/send-report',
      method: 'POST',
      enabled: false,
      retries: 2,
      timeout: 30000,
      lastRun: null,
      nextRun: new Date(Date.now() + 432000000).toISOString(),
      status: 'paused',
      stats: { runs: 0, successes: 0, failures: 0, avgDuration: 0 },
      createdAt: '2026-02-10T16:00:00Z',
    },
  ];

  demoJobs.forEach(j => jobs.set(j.id, j));

  // Generate some execution history
  const jobIds = Array.from(jobs.keys());
  for (let i = 0; i < 50; i++) {
    const jobId = jobIds[Math.floor(Math.random() * jobIds.length)];
    const success = Math.random() > 0.1;
    executions.push({
      id: 'exec_' + crypto.randomUUID().split('-')[0],
      jobId,
      startedAt: new Date(Date.now() - i * 300000).toISOString(),
      completedAt: new Date(Date.now() - i * 300000 + Math.random() * 2000).toISOString(),
      duration: Math.floor(Math.random() * 2000) + 100,
      status: success ? 'success' : 'failure',
      statusCode: success ? 200 : 500,
      response: success ? '{"ok":true}' : undefined,
      error: success ? undefined : 'Connection timeout',
    });
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BlackRoad Scheduled Jobs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #000; color: #fff; min-height: 100vh; }
    .header { background: linear-gradient(135deg, #111 0%, #000 100%); border-bottom: 1px solid #333; padding: 21px 34px; display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 21px; font-weight: bold; background: linear-gradient(135deg, #F5A623 0%, #FF1D6C 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .btn { padding: 10px 21px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
    .btn:hover { transform: scale(1.05); }
    .btn-primary { background: linear-gradient(135deg, #FF1D6C 0%, #9C27B0 100%); color: #fff; }
    .container { max-width: 1200px; margin: 0 auto; padding: 34px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 21px; margin-bottom: 34px; }
    .stat-card { background: #111; border: 1px solid #333; border-radius: 13px; padding: 21px; text-align: center; }
    .stat-value { font-size: 34px; font-weight: bold; background: linear-gradient(135deg, #FF1D6C 0%, #F5A623 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .stat-label { color: #888; font-size: 13px; margin-top: 8px; }
    .section-title { font-size: 21px; margin-bottom: 21px; display: flex; align-items: center; gap: 8px; }
    .section-title span { color: #FF1D6C; }
    .jobs-list { display: flex; flex-direction: column; gap: 13px; }
    .job-card { background: #111; border: 1px solid #333; border-radius: 13px; padding: 21px; transition: border-color 0.2s; }
    .job-card:hover { border-color: #FF1D6C; }
    .job-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 13px; }
    .job-name { font-size: 18px; font-weight: 600; }
    .job-status { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .job-status.active { background: #10B98133; color: #10B981; }
    .job-status.paused { background: #F5A62333; color: #F5A623; }
    .job-status.failed { background: #EF444433; color: #EF4444; }
    .job-desc { color: #888; font-size: 14px; margin-bottom: 13px; }
    .job-schedule { background: #0a0a0a; padding: 10px 16px; border-radius: 8px; font-family: monospace; font-size: 13px; display: inline-flex; align-items: center; gap: 13px; margin-bottom: 13px; }
    .job-schedule-cron { color: #2979FF; }
    .job-schedule-human { color: #888; }
    .job-meta { display: flex; gap: 21px; flex-wrap: wrap; font-size: 13px; }
    .job-meta-item { display: flex; gap: 8px; align-items: center; }
    .job-meta-label { color: #666; }
    .job-stats { display: flex; gap: 13px; margin-top: 13px; padding-top: 13px; border-top: 1px solid #222; }
    .job-stat { text-align: center; flex: 1; }
    .job-stat-value { font-size: 18px; font-weight: 600; }
    .job-stat-value.success { color: #10B981; }
    .job-stat-value.failure { color: #EF4444; }
    .job-stat-label { font-size: 11px; color: #666; }
    .job-actions { display: flex; gap: 8px; margin-top: 13px; }
    .job-actions button { padding: 6px 13px; border-radius: 6px; border: 1px solid #333; background: transparent; color: #888; font-size: 12px; cursor: pointer; }
    .job-actions button:hover { border-color: #FF1D6C; color: #FF1D6C; }
    .toggle { position: relative; width: 44px; height: 24px; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #333; border-radius: 24px; transition: 0.3s; }
    .toggle .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: #666; border-radius: 50%; transition: 0.3s; }
    .toggle input:checked + .slider { background: linear-gradient(135deg, #10B981 0%, #2979FF 100%); }
    .toggle input:checked + .slider:before { transform: translateX(20px); background: #fff; }
    .footer { border-top: 1px solid #333; padding: 21px 34px; text-align: center; color: #666; font-size: 13px; margin-top: 34px; }
    .footer a { color: #FF1D6C; text-decoration: none; }
    @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
  </style>
</head>
<body>
  <header class="header">
    <div class="logo">BlackRoad Scheduled Jobs</div>
    <button class="btn btn-primary" onclick="showCreate()">+ Create Job</button>
  </header>
  <div class="container">
    <div class="stats-grid" id="stats"></div>
    <h2 class="section-title"><span>//</span> Scheduled Jobs</h2>
    <div class="jobs-list" id="jobs-list"></div>
  </div>
  <footer class="footer">
    <p>Powered by <a href="https://blackroad.io">BlackRoad OS</a> &bull; <a href="https://blackroad-dev-portal.amundsonalexa.workers.dev">Developer Portal</a></p>
  </footer>
  <script>
    async function loadJobs() {
      const resp = await fetch('/api/jobs');
      const data = await resp.json();
      const active = data.jobs.filter(j => j.status === 'active').length;
      const totalRuns = data.jobs.reduce((s, j) => s + j.stats.runs, 0);
      const successRate = data.jobs.reduce((s, j) => s + j.stats.successes, 0) / Math.max(totalRuns, 1) * 100;

      document.getElementById('stats').innerHTML = \`
        <div class="stat-card"><div class="stat-value">\${data.jobs.length}</div><div class="stat-label">Total Jobs</div></div>
        <div class="stat-card"><div class="stat-value">\${active}</div><div class="stat-label">Active</div></div>
        <div class="stat-card"><div class="stat-value">\${totalRuns}</div><div class="stat-label">Total Runs</div></div>
        <div class="stat-card"><div class="stat-value">\${successRate.toFixed(1)}%</div><div class="stat-label">Success Rate</div></div>
      \`;

      document.getElementById('jobs-list').innerHTML = data.jobs.map(j => \`
        <div class="job-card">
          <div class="job-header">
            <div style="display:flex;align-items:center;gap:13px;">
              <span class="job-name">\${j.name}</span>
              <span class="job-status \${j.status}">\${j.status}</span>
            </div>
            <label class="toggle">
              <input type="checkbox" \${j.enabled ? 'checked' : ''} onchange="toggleJob('\${j.id}', this.checked)">
              <span class="slider"></span>
            </label>
          </div>
          <p class="job-desc">\${j.description}</p>
          <div class="job-schedule">
            <span class="job-schedule-cron">\${j.schedule}</span>
            <span class="job-schedule-human">\${j.scheduleHuman}</span>
          </div>
          <div class="job-meta">
            <div class="job-meta-item"><span class="job-meta-label">Endpoint:</span><span style="font-family:monospace;color:#2979FF">\${j.method} \${new URL(j.endpoint).pathname}</span></div>
            <div class="job-meta-item"><span class="job-meta-label">Timezone:</span><span>\${j.timezone}</span></div>
            <div class="job-meta-item"><span class="job-meta-label">Next run:</span><span>\${j.nextRun ? new Date(j.nextRun).toLocaleString() : 'N/A'}</span></div>
          </div>
          <div class="job-stats">
            <div class="job-stat"><div class="job-stat-value">\${j.stats.runs}</div><div class="job-stat-label">Total Runs</div></div>
            <div class="job-stat"><div class="job-stat-value success">\${j.stats.successes}</div><div class="job-stat-label">Successes</div></div>
            <div class="job-stat"><div class="job-stat-value failure">\${j.stats.failures}</div><div class="job-stat-label">Failures</div></div>
            <div class="job-stat"><div class="job-stat-value">\${j.stats.avgDuration}ms</div><div class="job-stat-label">Avg Duration</div></div>
          </div>
          <div class="job-actions">
            <button onclick="runJob('\${j.id}')">Run Now</button>
            <button onclick="viewLogs('\${j.id}')">View Logs</button>
          </div>
        </div>
      \`).join('');
    }

    async function toggleJob(id, enabled) {
      await fetch('/api/jobs/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      loadJobs();
    }

    async function runJob(id) {
      const resp = await fetch('/api/jobs/' + id + '/run', { method: 'POST' });
      const data = await resp.json();
      alert(data.success ? 'Job triggered!' : 'Failed to trigger job');
      loadJobs();
    }

    function viewLogs(id) { window.location.href = '/api/jobs/' + id + '/executions'; }
    function showCreate() { alert('Create job modal coming soon!'); }
    loadJobs();
  </script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    initJobs();
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // List jobs
    if (url.pathname === '/api/jobs' && method === 'GET') {
      return Response.json({ jobs: Array.from(jobs.values()) }, { headers: corsHeaders });
    }

    // Get job
    if (url.pathname.match(/^\/api\/jobs\/[\w]+$/) && method === 'GET') {
      const id = url.pathname.split('/').pop()!;
      const job = jobs.get(id);
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404, headers: corsHeaders });
      return Response.json({ job }, { headers: corsHeaders });
    }

    // Update job
    if (url.pathname.match(/^\/api\/jobs\/[\w]+$/) && method === 'PUT') {
      const id = url.pathname.split('/').pop()!;
      const job = jobs.get(id);
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404, headers: corsHeaders });
      const body = await request.json() as any;
      if (body.enabled !== undefined) {
        job.enabled = body.enabled;
        job.status = body.enabled ? 'active' : 'paused';
      }
      jobs.set(id, job);
      return Response.json({ success: true, job }, { headers: corsHeaders });
    }

    // Run job manually
    if (url.pathname.match(/^\/api\/jobs\/[\w]+\/run$/) && method === 'POST') {
      const id = url.pathname.split('/')[3];
      const job = jobs.get(id);
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404, headers: corsHeaders });

      // Simulate execution
      const execution: JobExecution = {
        id: 'exec_' + crypto.randomUUID().split('-')[0],
        jobId: id,
        startedAt: new Date().toISOString(),
        completedAt: new Date(Date.now() + 500).toISOString(),
        duration: 500,
        status: 'success',
        statusCode: 200,
        response: '{"triggered":true}',
      };
      executions.unshift(execution);
      job.lastRun = execution.startedAt;
      job.stats.runs++;
      job.stats.successes++;

      return Response.json({ success: true, execution }, { headers: corsHeaders });
    }

    // Get job executions
    if (url.pathname.match(/^\/api\/jobs\/[\w]+\/executions$/) && method === 'GET') {
      const id = url.pathname.split('/')[3];
      const jobExecs = executions.filter(e => e.jobId === id);
      return Response.json({ executions: jobExecs }, { headers: corsHeaders });
    }

    // All executions
    if (url.pathname === '/api/executions') {
      return Response.json({ executions: executions.slice(0, 100) }, { headers: corsHeaders });
    }

    // Health
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'healthy', version: '1.0.0', jobCount: jobs.size }, { headers: corsHeaders });
    }

    return new Response(dashboardHTML, { headers: { 'Content-Type': 'text/html' } });
  },

  // Cron handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    initJobs();
    console.log('Cron triggered at', new Date().toISOString());
    // In production, this would execute scheduled jobs
  },
};

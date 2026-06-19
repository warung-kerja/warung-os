import type {
  CanonicalProject,
  CanonicalTeamMember,
  SyncRun,
  SyncRequest,
  SourceHealthSnapshot,
  CronJobSnapshot,
  AgentTokenUsageDaily,
  ModelTokenUsageDaily,
  ToolUsageDaily,
  WorkspaceSignalSnapshot,
  DailyBriefItem,
  DevUpdatesSummary,
  ApprovalItem,
  WikiEntry,
  HermesModelHealth,
  HermesGatewayStatus,
  HermesProviderCatalogEntry,
  DotDelegationStatus,
} from '../types/warung-os'

const SNAP = '2026-05-31T06:48:00Z'

// ---- PROJECTS ----

export const projectFixtures: CanonicalProject[] = [
  {
    id: 'warung-os',
    name: 'Warung OS',
    owner: 'Raz',
    team: ['Mia', 'Gabs', 'Baro'],
    status: 'review',
    priority: 'p0',
    current_phase: 'Phase 1 — Local MVP Shell',
    next_step: 'Run npm install + npm run build; smoke test all four pages',
    project_kind: 'tooling',
    parent_project_id: null,
    visibility: 'private',
    source_root: 'warung-os/',
    folder_path: '/Users/gabi/Documents/warung-repo/warung-os',
    folder_status: 'active',
    registry_status: 'registered',
    source_updated_at: '2026-05-31T06:45:00Z',
    synced_at: SNAP,
    blocker: null,
    last_movement_at: '2026-05-31T06:45:00Z',
  },
  {
    id: 'band-of-barkers',
    name: 'Band of Barkers',
    owner: 'Raz',
    team: ['Gabs'],
    status: 'active',
    priority: 'p1',
    current_phase: 'Design — Poster Series',
    next_step: 'Gabs to deliver v3 poster direction for Raz review',
    project_kind: 'design',
    parent_project_id: null,
    visibility: 'private',
    source_root: 'bofb-html-deck/',
    folder_path: '/Users/gabi/Documents/warung-repo/bofb-html-deck',
    folder_status: 'active',
    registry_status: 'registered',
    source_updated_at: '2026-05-30T14:22:00Z',
    synced_at: SNAP,
    blocker: null,
    last_movement_at: '2026-05-30T14:22:00Z',
  },
  {
    id: 'template-factory',
    name: 'Template Factory',
    owner: 'Raz',
    team: ['Obey', 'Gabs'],
    status: 'moving',
    priority: 'p1',
    current_phase: 'Production — Pipeline Planning',
    next_step: 'Define upload-ready asset spec; scope Etsy listing copy workflow',
    project_kind: 'automation',
    parent_project_id: null,
    visibility: 'private',
    source_root: null,
    folder_path: null,
    folder_status: 'planned',
    registry_status: 'registered',
    source_updated_at: '2026-05-30T09:11:00Z',
    synced_at: SNAP,
    blocker: 'Upload spec not finalized',
    last_movement_at: '2026-05-30T09:11:00Z',
  },
  {
    id: 'etsy-listing-automation',
    name: 'Etsy Listing Automation',
    owner: 'Raz',
    team: ['Obey'],
    status: 'active',
    priority: 'p2',
    current_phase: 'Build — Python ingestion',
    next_step: 'Complete Etsy API integration; test listing upload dry run',
    project_kind: 'automation',
    parent_project_id: null,
    visibility: 'private',
    source_root: 'etsy-listing-automation/',
    folder_path: '/Users/gabi/Documents/warung-repo/etsy-listing-automation',
    folder_status: 'active',
    registry_status: 'registered',
    source_updated_at: '2026-05-29T18:44:00Z',
    synced_at: SNAP,
    blocker: null,
    last_movement_at: '2026-05-29T18:44:00Z',
  },
  {
    id: 'passive-engine',
    name: 'Passive Engine',
    owner: 'Raz',
    team: ['Baro', 'Mia'],
    status: 'active',
    priority: 'p1',
    current_phase: 'Strategy — Revenue channel mapping',
    next_step: 'Define Etsy + Gumroad + Print-on-demand revenue breakdown model',
    project_kind: 'strategy',
    parent_project_id: null,
    visibility: 'private',
    source_root: null,
    folder_path: null,
    folder_status: 'obsidian',
    registry_status: 'registered',
    source_updated_at: '2026-05-28T11:30:00Z',
    synced_at: SNAP,
    blocker: 'Warung OS must be stable first',
    last_movement_at: '2026-05-28T11:30:00Z',
  },
]

// ---- TEAM MEMBERS ----

export const teamMemberFixtures: CanonicalTeamMember[] = [
  {
    id: 'hermes-default',
    name: 'Hermes Default',
    role: 'Default Hermes profile',
    model: 'ollama-cloud/kimi-k2.6',
    agent_group: 'hermes-profile',
    parent_agent: null,
    synced_at: SNAP,
    status: 'waiting',
    current_task: null,
  },
  {
    id: 'hermes-tech-director',
    name: 'Tech Director',
    role: 'Mia / Tech Director profile',
    model: 'openai-codex/gpt-5.5',
    agent_group: 'hermes-profile',
    parent_agent: null,
    synced_at: SNAP,
    status: 'waiting',
    current_task: null,
  },
  {
    id: 'hermes-general-assistant',
    name: 'General Assistant',
    role: 'General Assistant profile',
    model: 'ollama-cloud/kimi-k2.6',
    agent_group: 'hermes-profile',
    parent_agent: null,
    synced_at: SNAP,
    status: 'waiting',
    current_task: null,
  },
]

// ---- DAILY BRIEF ----

export const dailyBriefFixtures: DailyBriefItem[] = [
  {
    id: 'db-1',
    type: 'win',
    title: 'Warung OS docs organized',
    body: 'PRD, Epic, wireframe, and Claude build prompt finalized in Obsidian. Four-page navigation approved by Raz.',
    time: '06:20',
    project: 'warung-os',
  },
  {
    id: 'db-2',
    type: 'win',
    title: 'BofB poster direction shortlisted',
    body: 'Gabs delivered two candidate directions. Raz review queued.',
    time: '05:44',
    project: 'band-of-barkers',
  },
  {
    id: 'db-3',
    type: 'needs_raz',
    title: 'Warung OS build smoke test',
    body: 'Phase 1 MVP shell is built. Raz needs to open it in a browser, tab through all four pages, and confirm structure is correct.',
    time: 'Now',
    project: 'warung-os',
  },
  {
    id: 'db-4',
    type: 'needs_raz',
    title: 'BofB poster v3 — approve direction',
    body: 'Two design directions ready. Pick one or request changes. Gabs is blocked until this lands.',
    time: 'Queued',
    project: 'band-of-barkers',
  },
  {
    id: 'db-5',
    type: 'blocked',
    title: 'Template Factory upload spec',
    body: 'Obey cannot start the Etsy upload pipeline until the asset spec is finalized. Waiting on Raz priority call.',
    time: 'Phase 2',
    project: 'template-factory',
  },
  {
    id: 'db-6',
    type: 'next',
    title: 'Warung OS Phase 2 — data contracts',
    body: 'Once Phase 1 is approved, Mia will design formal adapter boundaries for Obsidian, TickTick, Hermes health, and git sources.',
    time: 'After approval',
    project: 'warung-os',
  },
]

export const devUpdatesFixture: DevUpdatesSummary = {
  window: 'last_24h',
  generated_at: SNAP,
  current_focus: 'Warung OS core MVP — make the Brief page useful as Raz’s daily check-in.',
  progress_percent: 62,
  progress_label: '62% estimated',
  summary: 'Yesterday’s dev work focused on turning Warung OS from a static dashboard into a useful daily operating brief.',
  keypoints: [
    {
      id: 'du-fixture-1',
      label: 'Brief page improved',
      body: 'The Morning Brief now uses real workspace signals instead of stale placeholder copy.',
      source: 'worksession',
      project: 'warung-os',
    },
    {
      id: 'du-fixture-2',
      label: 'Active Projects clearer',
      body: 'Project metadata and board status are easier to read, so active work is less likely to get lost.',
      source: 'board',
      project: 'warung-os',
    },
  ],
  blockers: [
    {
      id: 'du-fixture-blocker-1',
      label: 'No major product blocker',
      body: 'Fixture mode has no live blocker feed. Check the live snapshot for current blockers.',
      source: 'system',
      project: 'warung-os',
    },
  ],
  tool_issues: [
    {
      id: 'du-fixture-tool-1',
      label: 'Tool status depends on live snapshot',
      body: 'Hermes, Codex, cron, and source-health issues are summarized when local snapshot data is available.',
      source: 'hermes',
      project: 'warung-os',
    },
  ],
  other_projects: [],
  sources: ['fixture example'],
}

// ---- APPROVALS ----

export const approvalFixtures: ApprovalItem[] = [
  {
    id: 'ap-1',
    title: 'Warung OS Phase 1 shell — structure approval',
    description: 'Four-page navigation, layout grid, and sidebar structure. Approve before Phase 2 scoping begins.',
    status: 'pending',
    requester: 'Mia',
    project: 'warung-os',
    created_at: '2026-05-31T06:00:00Z',
  },
  {
    id: 'ap-2',
    title: 'BofB poster direction v3 — pick one',
    description: 'Two directions: Japanese editorial flat vs pop vinyl maximalist. Approve, decline, or request changes.',
    status: 'pending',
    requester: 'Gabs',
    project: 'band-of-barkers',
    created_at: '2026-05-30T14:22:00Z',
  },
  {
    id: 'ap-3',
    title: 'Template Factory upload spec',
    description: 'Proposed spec for upload-ready assets: 3000x3000px, Canva export, Etsy listing copy template.',
    status: 'blocked',
    requester: 'Obey',
    project: 'template-factory',
    created_at: '2026-05-29T10:00:00Z',
  },
]

// ---- TOKEN USAGE — AGENT DAILY (7 days × 4 agents) ----

const agentDates = ['2026-05-25','2026-05-26','2026-05-27','2026-05-28','2026-05-29','2026-05-30','2026-05-31']

function makeAgentRow(
  idx: number,
  agent: string,
  parentAgent: string | null,
  date: string,
  input: number,
  output: number,
  cacheRead: number,
  cacheWrite: number,
  turns: number,
): AgentTokenUsageDaily {
  return {
    id: `atu-${agent}-${date}-${idx}`,
    agent,
    parent_agent: parentAgent,
    date,
    input_tokens: input,
    output_tokens: output,
    cache_read_tokens: cacheRead,
    cache_write_tokens: cacheWrite,
    total_tokens: input + output + cacheRead + cacheWrite,
    turns,
    synced_at: SNAP,
  }
}

export const agentTokenDailyFixtures: AgentTokenUsageDaily[] = [
  // Baro
  ...agentDates.map((d, i) => makeAgentRow(i, 'baro', null, d,
    [85000,92000,78000,105000,88000,98000,72000][i],
    [22000,25000,19000,28000,23000,27000,18000][i],
    [35000,38000,32000,44000,36000,42000,30000][i],
    [12000,14000,11000,16000,13000,15000,10000][i],
    [18,20,16,24,19,22,15][i],
  )),
  // Mia
  ...agentDates.map((d, i) => makeAgentRow(i+10, 'mia', 'baro', d,
    [120000,135000,108000,150000,128000,142000,95000][i],
    [32000,36000,29000,40000,34000,38000,25000][i],
    [55000,60000,50000,68000,58000,64000,44000][i],
    [18000,20000,16000,22000,19000,21000,14000][i],
    [26,29,23,33,28,31,20][i],
  )),
  // Gabs
  ...agentDates.map((d, i) => makeAgentRow(i+20, 'gabs', 'baro', d,
    [72000,80000,65000,90000,75000,85000,58000][i],
    [20000,22000,18000,25000,21000,24000,16000][i],
    [28000,32000,26000,36000,30000,34000,22000][i],
    [9000,10000,8000,11000,9500,10500,7000][i],
    [14,16,13,18,15,17,11][i],
  )),
  // Obey
  ...agentDates.map((d, i) => makeAgentRow(i+30, 'obey', 'baro', d,
    [40000,45000,38000,52000,43000,48000,32000][i],
    [11000,13000,10000,14000,12000,13500,9000][i],
    [16000,18000,15000,21000,17000,19000,13000][i],
    [5000,6000,4500,7000,5500,6500,4000][i],
    [9,10,8,12,9,11,7][i],
  )),
]

// ---- TOKEN USAGE — MODEL DAILY (7 days × 3 models) ----

function makeModelRow(
  idx: number,
  model: string,
  date: string,
  input: number,
  output: number,
  cacheRead: number,
  cacheWrite: number,
  turns: number,
): ModelTokenUsageDaily {
  return {
    id: `mtu-${model}-${date}-${idx}`,
    model,
    date,
    input_tokens: input,
    output_tokens: output,
    cache_read_tokens: cacheRead,
    cache_write_tokens: cacheWrite,
    total_tokens: input + output + cacheRead + cacheWrite,
    turns,
    synced_at: SNAP,
  }
}

export const modelTokenDailyFixtures: ModelTokenUsageDaily[] = [
  // claude-sonnet-4-6 (primary)
  ...agentDates.map((d, i) => makeModelRow(i, 'claude-sonnet-4-6', d,
    [240000,265000,218000,295000,252000,282000,190000][i],
    [65000,72000,59000,80000,68000,76000,51000][i],
    [98000,108000,90000,122000,103000,115000,78000][i],
    [32000,35000,28000,38000,33000,37000,25000][i],
    [52,57,47,64,55,61,42][i],
  )),
  // claude-opus-4-7 (complex tasks)
  ...agentDates.map((d, i) => makeModelRow(i+10, 'claude-opus-4-7', d,
    [65000,72000,58000,80000,68000,76000,50000][i],
    [18000,20000,16000,22000,19000,21000,14000][i],
    [22000,25000,20000,28000,23000,26000,17000][i],
    [7000,8000,6500,9000,7500,8500,5500][i],
    [12,14,11,16,13,15,9][i],
  )),
  // claude-haiku-4-5 (quick tasks)
  ...agentDates.map((d, i) => makeModelRow(i+20, 'claude-haiku-4-5', d,
    [12000,14000,11000,16000,13000,15000,10000][i],
    [3500,4000,3000,4500,3800,4200,2800][i],
    [4500,5000,4000,6000,5000,5500,3500][i],
    [1500,1800,1400,2000,1600,1800,1200][i],
    [8,9,7,11,8,10,6][i],
  )),
]

// ---- TOOL USAGE DAILY ----

export const toolUsageDailyFixtures: ToolUsageDaily[] = [
  { id:'tu-1', tool_name:'Edit', tool_category:'file_ops', assigned_model:'claude-sonnet-4-6', date:'2026-05-31', calls:48, input_tokens:18200, output_tokens:6400, cache_read_tokens:8800, cache_write_tokens:2200, total_tokens:35600, agents:['mia','gabs'], last_used_at:'2026-05-31T06:44:00Z', synced_at:SNAP },
  { id:'tu-2', tool_name:'Read', tool_category:'file_ops', assigned_model:'claude-sonnet-4-6', date:'2026-05-31', calls:42, input_tokens:14800, output_tokens:3200, cache_read_tokens:9600, cache_write_tokens:1800, total_tokens:29400, agents:['mia','baro','gabs'], last_used_at:'2026-05-31T06:46:00Z', synced_at:SNAP },
  { id:'tu-3', tool_name:'Bash', tool_category:'shell', assigned_model:'claude-sonnet-4-6', date:'2026-05-31', calls:24, input_tokens:9600, output_tokens:2800, cache_read_tokens:4200, cache_write_tokens:1100, total_tokens:17700, agents:['mia','obey'], last_used_at:'2026-05-31T06:42:00Z', synced_at:SNAP },
  { id:'tu-4', tool_name:'Write', tool_category:'file_ops', assigned_model:'claude-sonnet-4-6', date:'2026-05-31', calls:18, input_tokens:7200, output_tokens:5600, cache_read_tokens:3400, cache_write_tokens:900, total_tokens:17100, agents:['mia','gabs'], last_used_at:'2026-05-31T06:45:00Z', synced_at:SNAP },
  { id:'tu-5', tool_name:'Grep', tool_category:'search', assigned_model:'claude-sonnet-4-6', date:'2026-05-31', calls:16, input_tokens:5800, output_tokens:1400, cache_read_tokens:3200, cache_write_tokens:700, total_tokens:11100, agents:['mia'], last_used_at:'2026-05-31T06:38:00Z', synced_at:SNAP },
  { id:'tu-6', tool_name:'Glob', tool_category:'search', assigned_model:'claude-sonnet-4-6', date:'2026-05-31', calls:12, input_tokens:3600, output_tokens:800, cache_read_tokens:2200, cache_write_tokens:400, total_tokens:7000, agents:['mia','baro'], last_used_at:'2026-05-31T06:35:00Z', synced_at:SNAP },
  { id:'tu-7', tool_name:'Agent', tool_category:'orchestration', assigned_model:'claude-sonnet-4-6', date:'2026-05-31', calls:6, input_tokens:22000, output_tokens:8800, cache_read_tokens:5500, cache_write_tokens:1400, total_tokens:37700, agents:['baro'], last_used_at:'2026-05-31T06:30:00Z', synced_at:SNAP },
  { id:'tu-8', tool_name:'WebSearch', tool_category:'external', assigned_model:null, date:'2026-05-31', calls:8, input_tokens:4400, output_tokens:2200, cache_read_tokens:1100, cache_write_tokens:300, total_tokens:8000, agents:['mia','obey'], last_used_at:'2026-05-31T05:55:00Z', synced_at:SNAP },
  { id:'tu-9', tool_name:'mcp__ticktick', tool_category:'mcp', assigned_model:null, date:'2026-05-31', calls:4, input_tokens:1800, output_tokens:600, cache_read_tokens:900, cache_write_tokens:200, total_tokens:3500, agents:['baro'], last_used_at:'2026-05-31T06:05:00Z', synced_at:SNAP },
]

// ---- CRON JOBS ----

export const cronJobFixtures: CronJobSnapshot[] = [
  { id:'cj-1', agent:'baro', name:'Morning Brief', schedule:'0 6 * * *', status:'ok', enabled:true, model:'claude-sonnet-4-6', model_source:'hermes', last_run_at:'2026-05-31T06:00:12Z', next_run_at:'2026-06-01T06:00:00Z', duration_ms:14800, error:null, synced_at:SNAP },
  { id:'cj-2', agent:'mia', name:'Obsidian Sync', schedule:'0 */2 * * *', status:'ok', enabled:true, model:'claude-sonnet-4-6', model_source:'hermes', last_run_at:'2026-05-31T06:14:03Z', next_run_at:'2026-05-31T08:00:00Z', duration_ms:22400, error:null, synced_at:SNAP },
  { id:'cj-3', agent:'mia', name:'Hermes Health Check', schedule:'*/15 * * * *', status:'ok', enabled:true, model:null, model_source:null, last_run_at:'2026-05-31T06:45:00Z', next_run_at:'2026-05-31T07:00:00Z', duration_ms:1200, error:null, synced_at:SNAP },
  { id:'cj-4', agent:'baro', name:'Snapshot Export', schedule:'0 4 * * *', status:'ok', enabled:true, model:'claude-sonnet-4-6', model_source:'hermes', last_run_at:'2026-05-31T04:00:08Z', next_run_at:'2026-06-01T04:00:00Z', duration_ms:38000, error:null, synced_at:SNAP },
  { id:'cj-5', agent:'obey', name:'Token Usage Collector', schedule:'30 0 * * *', status:'ok', enabled:true, model:null, model_source:null, last_run_at:'2026-05-31T00:30:04Z', next_run_at:'2026-06-01T00:30:00Z', duration_ms:5600, error:null, synced_at:SNAP },
  { id:'cj-6', agent:'obey', name:'TickTick Sync', schedule:'0 * * * *', status:'warn', enabled:true, model:null, model_source:null, last_run_at:'2026-05-31T06:00:44Z', next_run_at:'2026-05-31T07:00:00Z', duration_ms:null, error:'Rate limit hit — will retry next cycle', synced_at:SNAP },
  { id:'cj-7', agent:'mia', name:'Source Freshness Check', schedule:'0 */1 * * *', status:'ok', enabled:true, model:null, model_source:null, last_run_at:'2026-05-31T06:00:22Z', next_run_at:'2026-05-31T07:00:00Z', duration_ms:3400, error:null, synced_at:SNAP },
  { id:'cj-8', agent:'gabs', name:'Design Digest', schedule:'0 8 * * 1', status:'ok', enabled:true, model:'claude-sonnet-4-6', model_source:'hermes', last_run_at:'2026-05-27T08:00:11Z', next_run_at:'2026-06-03T08:00:00Z', duration_ms:9800, error:null, synced_at:SNAP },
  { id:'cj-9', agent:'baro', name:'Weekly Project Recap', schedule:'0 9 * * 1', status:'ok', enabled:true, model:'claude-sonnet-4-6', model_source:'hermes', last_run_at:'2026-05-27T09:00:09Z', next_run_at:'2026-06-03T09:00:00Z', duration_ms:28000, error:null, synced_at:SNAP },
  { id:'cj-10', agent:'obey', name:'Etsy Draft Uploader', schedule:'0 10 * * *', status:'paused', enabled:false, model:null, model_source:null, last_run_at:'2026-05-20T10:00:00Z', next_run_at:null, duration_ms:null, error:'Disabled pending upload spec approval', synced_at:SNAP },
]

// ---- SOURCE HEALTH ----

export const sourceHealthFixtures: SourceHealthSnapshot[] = [
  { id:'sh-1', label:'Obsidian Vault', source_type:'filesystem', exists:true, readable:true, modified_at:'2026-05-31T06:14:03Z', age_hours:0.5, status:'ok', error:null, synced_at:SNAP },
  { id:'sh-2', label:'warung-repo git', source_type:'git', exists:true, readable:true, modified_at:'2026-05-31T06:45:00Z', age_hours:0.05, status:'ok', error:null, synced_at:SNAP },
  { id:'sh-3', label:'TickTick API', source_type:'api', exists:true, readable:true, modified_at:'2026-05-31T06:00:44Z', age_hours:0.8, status:'warn', error:'Rate limit hit during last sync', synced_at:SNAP },
  { id:'sh-4', label:'Hermes Session Logs', source_type:'filesystem', exists:true, readable:true, modified_at:'2026-05-31T06:46:00Z', age_hours:0.03, status:'ok', error:null, synced_at:SNAP },
  { id:'sh-5', label:'Token Usage Store', source_type:'filesystem', exists:true, readable:true, modified_at:'2026-05-31T00:30:04Z', age_hours:6.3, status:'ok', error:null, synced_at:SNAP },
  { id:'sh-6', label:'Cron Schedule File', source_type:'filesystem', exists:true, readable:true, modified_at:'2026-05-29T15:00:00Z', age_hours:39.8, status:'warn', error:'Not updated in >24h — may be stale', synced_at:SNAP },
  { id:'sh-7', label:'Etsy Listings Cache', source_type:'api_cache', exists:true, readable:false, modified_at:'2026-05-20T10:00:00Z', age_hours:238.8, status:'bad', error:'Cache expired — re-auth required', synced_at:SNAP },
]

// ---- SYNC RUNS ----

export const syncRunFixtures: SyncRun[] = [
  { id:'sr-1', started_at:'2026-05-31T06:14:00Z', finished_at:'2026-05-31T06:14:22Z', status:'success', trigger:'scheduled', source_host:'MacBook-Gabi', summary:{ files_synced:14, conflicts:0 }, error:null },
  { id:'sr-2', started_at:'2026-05-31T04:00:08Z', finished_at:'2026-05-31T04:01:26Z', status:'success', trigger:'scheduled', source_host:'MacBook-Gabi', summary:{ snapshot_size_kb:840, sources_checked:7 }, error:null },
  { id:'sr-3', started_at:'2026-05-30T22:00:02Z', finished_at:'2026-05-30T22:00:09Z', status:'success', trigger:'scheduled', source_host:'MacBook-Gabi', summary:{ files_synced:3 }, error:null },
  { id:'sr-4', started_at:'2026-05-30T16:00:01Z', finished_at:'2026-05-30T16:00:08Z', status:'failed', trigger:'manual', source_host:'MacBook-Gabi', summary:null, error:'TickTick rate limit — 429 Too Many Requests' },
  { id:'sr-5', started_at:'2026-05-30T06:14:00Z', finished_at:'2026-05-30T06:14:19Z', status:'success', trigger:'scheduled', source_host:'MacBook-Gabi', summary:{ files_synced:9 }, error:null },
]

// ---- SYNC REQUESTS ----

export const syncRequestFixtures: SyncRequest[] = [
  { id:'req-1', requested_by:'Raz', requested_at:'2026-05-30T16:00:00Z', status:'failed', started_at:'2026-05-30T16:00:01Z', completed_at:'2026-05-30T16:00:08Z', handled_by:'mia', error:'TickTick rate limit' },
  { id:'req-2', requested_by:'Baro', requested_at:'2026-05-31T06:48:00Z', status:'pending', started_at:null, completed_at:null, handled_by:null, error:null },
]

// ---- WORKSPACE SIGNALS ----

export const workspaceSignalFixture: WorkspaceSignalSnapshot = {
  id: 'ws-1',
  branch: 'main',
  head: 'a3f8c12',
  working_tree: 'clean',
  commits_24h: 4,
  commits_7d: 18,
  latest_commit_at: '2026-05-31T06:45:00Z',
  recent_commits: [
    { hash:'a3f8c12', committed_at:'2026-05-31T06:45:00Z', author:'barothecreator', subject:'docs: add warung-os PRD, epic, and build prompt' },
    { hash:'d81b4e9', committed_at:'2026-05-31T06:20:00Z', author:'barothecreator', subject:'feat: add low-fi wireframe for warung-os shell' },
    { hash:'c22a774', committed_at:'2026-05-30T14:22:00Z', author:'barothecreator', subject:'design: BofB poster v3 candidate directions' },
    { hash:'b91f3d2', committed_at:'2026-05-30T09:11:00Z', author:'barothecreator', subject:'ops: update template factory production notes' },
    { hash:'8e40a15', committed_at:'2026-05-29T18:44:00Z', author:'barothecreator', subject:'feat: etsy listing automation — initial api client' },
  ],
  file_churn: [
    { path:'warung-os/docs/prd.md', touches:4 },
    { path:'warung-os/wireframes/001-low-fi-warung-os/index.html', touches:3 },
    { path:'warung-os/docs/epic.md', touches:2 },
    { path:'bofb-html-deck/poster-v3/', touches:5 },
    { path:'etsy-listing-automation/src/client.py', touches:6 },
  ],
  synced_at: SNAP,
}

// ---- HERMES MODEL HEALTH ----

export const hermesModelHealthFixtures: HermesModelHealth[] = [
  { id:'hm-1', profile:'tech-director', provider:'Anthropic', model:'claude-sonnet-4-6', status:'ok', latency_ms:420, is_primary:true, is_fallback:false, last_checked_at:'2026-05-31T06:45:00Z' },
  { id:'hm-2', profile:'tech-director', provider:'Anthropic', model:'claude-opus-4-7', status:'ok', latency_ms:880, is_primary:false, is_fallback:false, last_checked_at:'2026-05-31T06:45:00Z' },
  { id:'hm-3', profile:'tech-director', provider:'Anthropic', model:'claude-haiku-4-5', status:'ok', latency_ms:180, is_primary:false, is_fallback:true, last_checked_at:'2026-05-31T06:45:00Z' },
]

// ---- DOT DELEGATION ----

export const dotDelegationFixtures: DotDelegationStatus[] = [
  { id:'dot-1', dot_name:'warung-os-build', agent:'gabs', task:'Build and validate Warung OS Phase 1 MVP shell', status:'active', started_at:'2026-05-31T06:30:00Z', last_activity_at:'2026-05-31T06:46:00Z' },
  { id:'dot-2', dot_name:'bofb-poster-v3', agent:'gabs', task:'Deliver poster direction v3 — two candidates for Raz review', status:'waiting', started_at:'2026-05-30T12:00:00Z', last_activity_at:'2026-05-30T14:22:00Z' },
  { id:'dot-3', dot_name:'etsy-automation', agent:'obey', task:'Complete Etsy API integration; test dry-run upload', status:'active', started_at:'2026-05-29T16:00:00Z', last_activity_at:'2026-05-29T18:44:00Z' },
  { id:'dot-4', dot_name:'obsidian-sync-fix', agent:'mia', task:'Diagnose TickTick rate limit on Obsidian sync bridge', status:'blocked', started_at:'2026-05-30T16:30:00Z', last_activity_at:'2026-05-30T17:00:00Z' },
]

// ---- HERMES GATEWAY STATUS ----

export const gatewayStatusFixtures: HermesGatewayStatus[] = [
  {
    id: 'gw-tech-director',
    profile: 'tech-director',
    gateway_state: 'running',
    active_agents: 2,
    platforms: [
      { name: 'telegram', state: 'connected', error_message: null, updated_at: SNAP },
      { name: 'slack', state: 'paused', error_message: null, updated_at: SNAP },
    ],
    updated_at: SNAP,
    synced_at: SNAP,
  },
]

// ---- HERMES PROVIDER CATALOG ----

export const providerCatalogFixtures: HermesProviderCatalogEntry[] = [
  { id: 'pc-tech-director-anthropic', profile: 'tech-director', provider: 'anthropic', model_count: 8, cached_at: SNAP, synced_at: SNAP },
  { id: 'pc-tech-director-openai',    profile: 'tech-director', provider: 'openai',    model_count: 12, cached_at: SNAP, synced_at: SNAP },
  { id: 'pc-tech-director-google',    profile: 'tech-director', provider: 'google',    model_count: 5,  cached_at: SNAP, synced_at: SNAP },
]

// ---- WIKI ENTRIES ----

export const wikiFixtures: WikiEntry[] = [
  {
    id:'wk-1', title:'Warung OS UX Sitemap — four-page structure', source_type:'project_note', author:'Mia', project:'warung-os',
    tags:['warung-os','ux','navigation','approved'], excerpt:'Defines the four top-level pages and the wireframe requirements for MVP Phase 1.',
    body:`The four-page navigation is: Home / Daily Brief, Active Projects, Operations, Wiki.\n\nHome is the morning brief — a human-readable recap of agent activity, wins, blockers, and suggested focus. It is not a technical dashboard.\n\nActive Projects is a clean project masterlist sourced from Obsidian, with approval modules in Phase 2.\n\nOperations preserves Mission Control Online-style data/report parity. Token usage, cron health, source freshness, sync runs, workspace signals.\n\nWiki is a searchable browse of agent diaries, 1% Journal, and project notes. AI/RAG is Phase 2.`,
    source_path:'~/Documents/Warung Kerja 1.0/Warung OS/UX Sitemap.md', date:'2026-05-31', is_current:true,
  },
  {
    id:'wk-2', title:'Passive engine direction — revenue channel mapping', source_type:'journal', author:'Raz', project:'passive-engine',
    tags:['passive-income','revenue','strategy','etsy','print-on-demand'], excerpt:"Raz's notes on passive income focus and production pipeline constraints for the 2027 Jakarta goal.",
    body:`The passive engine goal is to build recurring revenue streams that don't require Raz's daily attention.\n\nPrimary channels: Etsy (print-on-demand templates), Gumroad (design assets), and future digital products.\n\nConstraints: time is limited to evenings and weekends. Agents must handle ingestion, listing prep, and copy. Raz approves final assets.\n\nTarget: meaningful monthly passive income by Q2 2027, enough to support the Jakarta move.`,
    source_path:'~/Documents/Warung Kerja 1.0/1% Journal/2026-05-28 Passive engine direction.md', date:'2026-05-28',
  },
  {
    id:'wk-3', title:'Template Factory production queue notes', source_type:'agent_diary', author:'Obey', project:'template-factory',
    tags:['template-factory','etsy','canva','upload-pipeline'], excerpt:'Upload-ready assets, Canva sizing, and Etsy listing copy workflow. Waiting on upload spec approval.',
    body:`Template Factory produces printable/product assets for Etsy upload.\n\nCurrent bottleneck: upload spec is not finalized. Obey has a draft spec: 3000×3000px, Canva export, 300dpi. Etsy listing copy uses a template with 8 key attributes.\n\nOnce spec is approved, Obey can run the full pipeline: generate → export → listing copy → upload queue → Raz final review.`,
    source_path:'~/Documents/Warung Kerja 1.0/Agent Diaries/Obey/2026-05-30 Template Factory notes.md', date:'2026-05-30',
  },
  {
    id:'wk-4', title:'Band of Barkers — design taste and style brief', source_type:'project_note', author:'Gabs', project:'band-of-barkers',
    tags:['bofb','design','taste','style'], excerpt:'Pop, vinyl record, Japanese design influences. Dogs as subject. No rigid constraints.',
    body:`Band of Barkers is a design playground, not a rigid brand system.\n\nStyle: pop, vinyl record aesthetic, Japanese editorial/graphic design influences. Subject is always dogs.\n\nPurpose: test different design styles against the dog subject matter. Only styles that look good survive. No constraints from past work.\n\nGabs experiments freely. Raz approves what aligns with taste. Winners inform the Etsy catalog.`,
    source_path:'~/Documents/Warung Kerja 1.0/Band of Barkers/Style Brief.md', date:'2026-05-15',
  },
  {
    id:'wk-5', title:'Hermes orchestration architecture overview', source_type:'reference', author:'Mia', project:null,
    tags:['hermes','architecture','agents','orchestration'], excerpt:'Hermes is the internal orchestration layer: model routing, cron management, agent delegation, and session health.',
    body:`Hermes is the name for the agent orchestration and infrastructure layer.\n\nKey responsibilities: model routing (sonnet for general, opus for complex, haiku for fast), cron job scheduling and monitoring, agent delegation via Dot system, session token tracking, and provider health checks.\n\nHermes does not have a separate codebase — it refers to the collection of configs, scripts, and conventions that govern how agents operate.`,
    source_path:'~/Documents/Warung Kerja 1.0/Reference/Hermes Architecture.md', date:'2026-05-20',
  },
  {
    id:'wk-6', title:'Decision log — Warung OS Phase 1 scope', source_type:'decision_log', author:'Baro', project:'warung-os',
    tags:['warung-os','decision','scope','phase-1'], excerpt:'Approved decisions for Phase 1: fixture-first, local-only, no secrets, no write actions, four pages.',
    body:`Key decisions made for Warung OS Phase 1:\n\n1. Fixture-first: all data from TypeScript fixtures, no live API calls\n2. Local only: no Supabase, no deployment, no auth\n3. No secrets: fixture data contains no keys, tokens, or real credentials\n4. No write actions: all approval buttons are state placeholders\n5. Four pages: Home, Active Projects, Operations, Wiki — no more, no less\n6. React + Vite + TypeScript: standard, maintainable, easy to extend\n7. CSS-only charts: no charting library in Phase 1`,
    source_path:'~/Documents/Warung Kerja 1.0/Warung OS/Decision Log.md', date:'2026-05-31',
  },
  {
    id:'wk-7', title:'1% Journal — Sydney to Jakarta by 2027', source_type:'journal', author:'Raz', project:null,
    tags:['personal','goal','jakarta','2027','passive-income'], excerpt:"Raz's trajectory note on the move back to Jakarta and the financial runway needed.",
    body:`The goal is to be back in Jakarta by end of 2027. This requires:\n\n1. Passive income sufficient to cover cost of living without Sydney employment\n2. A stable agent + automation setup that runs without constant manual attention\n3. A clear project portfolio generating revenue: Etsy, digital assets, design products\n\nThe Warung Kerja system exists to make this achievable. Agents handle execution. Raz makes taste and direction decisions.`,
    source_path:'~/Documents/Warung Kerja 1.0/1% Journal/2026-04-10 Sydney to Jakarta.md', date:'2026-04-10',
  },
  {
    id:'wk-8', title:'Etsy listing automation — API client architecture', source_type:'agent_diary', author:'Obey', project:'etsy-listing-automation',
    tags:['etsy','automation','python','api'], excerpt:'Python-based Etsy API client. OAuth flow, listing endpoint, dry-run upload mode.',
    body:`The Etsy listing automation uses the official Etsy Open API v3.\n\nAuth: OAuth 2.0 with PKCE. Token stored in local keychain, never in code or fixtures.\n\nKey endpoints: GET /shops/{shop_id}/listings, POST /listings, POST /listings/{listing_id}/images\n\nDry-run mode: constructs the listing payload and validates it without submitting. Raz reviews dry-run output before live upload is enabled.\n\nStatus: API client built. OAuth integration in progress.`,
    source_path:'~/Documents/Warung Kerja 1.0/Agent Diaries/Obey/2026-05-29 Etsy automation notes.md', date:'2026-05-29',
  },
]

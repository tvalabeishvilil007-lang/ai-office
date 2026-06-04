import { Vector3 } from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// Waypoint graph — named navigation points in the office.
// Workers move ONLY through these points — no wall / furniture clipping.
//
// Design rules:
//   1. Every straight-line edge between two waypoints must be clear of furniture.
//   2. Front-row desk entries NO LONGER connect directly to the open area —
//      those paths ran through the resident worker's chair.  Agents instead
//      route through the main corridor (hall_center → open_center).
//   3. Meeting-table seats connect only to the open-area node they approach
//      from.  Direct seat-to-seat edges were removed because the straight line
//      between them clipped through the table surface.
// ─────────────────────────────────────────────────────────────────────────────

export type WaypointId =
  // ── 8 desk chairs ──────────────────────────────────────────────────────────
  | 'desk_lawyer'
  | 'desk_finance'
  | 'desk_marketing'
  | 'desk_research'
  | 'desk_business'
  | 'desk_sales'
  | 'desk_realestate'
  | 'desk_personal'
  // ── Zone entries (corridor → desk approach) ────────────────────────────────
  | 'entry_lawyer'
  | 'entry_finance'
  | 'entry_marketing'
  | 'entry_research'
  | 'entry_business'
  | 'entry_sales'
  | 'entry_realestate'
  | 'entry_personal'
  // ── Main corridor (z = −1.2) ───────────────────────────────────────────────
  | 'hall_left'
  | 'hall_center'
  | 'hall_right'
  | 'hall_far_left'
  | 'hall_far_right'
  // ── Open area (z = 4.5) ───────────────────────────────────────────────────
  | 'open_left'
  | 'open_center'
  | 'open_right'
  | 'open_far_left'
  | 'open_far_right'
  // ── Coffee corner ─────────────────────────────────────────────────────────
  | 'coffee_corner'
  // ── Meeting table seats ───────────────────────────────────────────────────
  | 'table_seat_s'
  | 'table_seat_w'
  | 'table_seat_e'
  // ── Lounge sofas ──────────────────────────────────────────────────────────
  | 'lounge_gate'
  | 'lounge_mid'
  | 'lounge_seat_a'
  | 'lounge_seat_b'
  // ── Reception desk ────────────────────────────────────────────────────────
  | 'desk_receptionist';

export const WAYPOINTS: Record<WaypointId, Vector3> = {
  // ── Desk chairs — AT THE CHAIR, not the monitor ──
  // Back row  (deskRotY=0):  chair z = zone_z + 0.80 = −5 + 0.80 = −4.2
  // Front row (deskRotY=π):  chair z = zone_z − 0.80 =  2 − 0.80 =  1.2
  desk_lawyer:    new Vector3(-5,    0, -4.2),
  desk_finance:   new Vector3( 5,    0, -4.2),
  desk_marketing: new Vector3(-5,    0,  1.2),
  desk_research:  new Vector3( 5,    0,  1.2),
  desk_business:  new Vector3(-8.5,  0, -4.2),
  desk_sales:     new Vector3( 8.5,  0, -4.2),
  desk_realestate:new Vector3(-8.5,  0,  1.2),
  desk_personal:  new Vector3( 8.5,  0,  1.2),

  // ── Zone entries ──
  entry_lawyer:    new Vector3(-5,    0, -3.0),
  entry_finance:   new Vector3( 5,    0, -3.0),
  entry_marketing: new Vector3(-5,    0,  0.8),
  entry_research:  new Vector3( 5,    0,  0.8),
  entry_business:  new Vector3(-8.5,  0, -3.0),
  entry_sales:     new Vector3( 8.5,  0, -3.0),
  entry_realestate:new Vector3(-8.5,  0,  0.8),
  entry_personal:  new Vector3( 8.5,  0,  0.8),

  // ── Main corridor (z = −1.2) ──
  hall_left:      new Vector3(-5,    0, -1.2),
  hall_center:    new Vector3( 0,    0, -1.2),
  hall_right:     new Vector3( 5,    0, -1.2),
  hall_far_left:  new Vector3(-8.5,  0, -1.2),
  hall_far_right: new Vector3( 8.5,  0, -1.2),

  // ── Open area (z = 4.5) ──
  open_left:      new Vector3(-4,    0,  4.5),
  open_center:    new Vector3( 0,    0,  4.5),
  open_right:     new Vector3( 4,    0,  4.5),
  open_far_left:  new Vector3(-8.5,  0,  4.5),
  open_far_right: new Vector3( 8.5,  0,  4.5),

  // ── Coffee corner (front-left) ──
  coffee_corner:  new Vector3(-7.5,  0,  5.5),

  // ── Meeting table seats (radius 2 from centre at (0,0,5.8)) ──
  table_seat_s:   new Vector3( 0,    0,  3.8),
  table_seat_w:   new Vector3(-2.0,  0,  5.8),
  table_seat_e:   new Vector3( 2.0,  0,  5.8),

  // ── Lounge sofas (left side, near entrance) ──
  // Approach path: open_left → lounge_gate (east of sofa A) → lounge_mid (between sofas) → seat
  // lounge_gate at x=-3.5 stays east of sofa A's right edge (x=-4.075) — no sofa clip on approach.
  // lounge_mid at z=7.5 is above sofa A's front face (z=7.26), so agents step in from the front.
  lounge_gate:   new Vector3(-3.5,  0,  7.5),
  lounge_mid:    new Vector3(-5.0,  0,  7.5),
  lounge_seat_a: new Vector3(-5.0,  0,  6.9),
  lounge_seat_b: new Vector3(-5.0,  0,  8.65),

  // ── Reception desk (right wall, faces +z toward entrance) ──
  desk_receptionist: new Vector3( 9.0,  0,  7.9),
};

// ── Adjacency graph ───────────────────────────────────────────────────────────
// Every edge here is a STRAIGHT LINE that has been verified to be furniture-free.

const GRAPH: Record<WaypointId, WaypointId[]> = {
  // ── Desks ──────────────────────────────────────────────────────────────────
  desk_lawyer:    ['entry_lawyer'],
  desk_finance:   ['entry_finance'],
  desk_marketing: ['entry_marketing'],
  desk_research:  ['entry_research'],
  desk_business:  ['entry_business'],
  desk_sales:     ['entry_sales'],
  desk_realestate:['entry_realestate'],
  desk_personal:  ['entry_personal'],

  // ── Entries ────────────────────────────────────────────────────────────────
  // IMPORTANT: front-row entries (marketing/research/realestate/personal) do
  // NOT connect to the open area.  Those paths ran through the resident
  // worker's chair.  Routing now goes: entry → hall_* → hall_center → open_*.
  entry_lawyer:    ['desk_lawyer',    'hall_left'],
  entry_finance:   ['desk_finance',   'hall_right'],
  entry_marketing: ['desk_marketing', 'hall_left'],       // ← no open_left
  entry_research:  ['desk_research',  'hall_right'],      // ← no open_right
  entry_business:  ['desk_business',  'hall_far_left'],
  entry_sales:     ['desk_sales',     'hall_far_right'],
  entry_realestate:['desk_realestate','hall_far_left'],   // ← no open_far_left
  entry_personal:  ['desk_personal',  'hall_far_right'],  // ← no open_far_right

  // ── Main corridor ──────────────────────────────────────────────────────────
  hall_left:      ['entry_lawyer',  'entry_marketing', 'hall_center', 'hall_far_left'],
  hall_center:    ['hall_left',     'hall_right',       'open_center'],
  hall_right:     ['entry_finance', 'entry_research',  'hall_center', 'hall_far_right'],
  hall_far_left:  ['entry_business','entry_realestate','hall_left'],
  hall_far_right: ['entry_sales',   'entry_personal',  'hall_right'],

  // ── Open area ──────────────────────────────────────────────────────────────
  open_left:      ['open_center', 'open_far_left',  'lounge_gate'],
  open_center:    ['hall_center', 'open_left',      'open_right',    'table_seat_s'],
  open_right:     ['open_center', 'open_far_right'],
  open_far_left:  ['open_left',   'table_seat_w',   'coffee_corner'],
  open_far_right: ['open_right',  'table_seat_e',   'desk_receptionist'],

  coffee_corner:  ['open_far_left'],

  // ── Meeting table ──────────────────────────────────────────────────────────
  // Each seat connects ONLY to its outer-approach node.
  // Direct seat-to-seat edges removed — they clipped through the table surface.
  table_seat_s: ['open_center'],
  table_seat_w: ['open_far_left'],
  table_seat_e: ['open_far_right'],

  // ── Lounge sofas ──────────────────────────────────────────────────────────
  // lounge_gate → lounge_mid: horizontal step at z=7.5 (above sofa A's max z=7.26, no clip).
  // lounge_mid  → seat_a: southward at x=-5 (enters sofa A from its FRONT face z=7.26). ✓
  // lounge_mid  → seat_b: northward at x=-5 (enters sofa B from its FRONT face z=8.29). ✓
  lounge_gate:   ['open_left',    'lounge_mid'],
  lounge_mid:    ['lounge_gate',  'lounge_seat_a', 'lounge_seat_b'],
  lounge_seat_a: ['lounge_mid'],
  lounge_seat_b: ['lounge_mid'],

  // ── Reception desk ────────────────────────────────────────────────────────
  desk_receptionist: ['open_far_right'],
};

// ── BFS pathfinder ────────────────────────────────────────────────────────────

export function findPath(from: WaypointId, to: WaypointId): WaypointId[] {
  if (from === to) return [from];

  const queue: WaypointId[][] = [[from]];
  const visited = new Set<WaypointId>([from]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const node = path[path.length - 1];

    for (const neighbor of GRAPH[node]) {
      if (visited.has(neighbor)) continue;
      const newPath = [...path, neighbor];
      if (neighbor === to) return newPath;
      visited.add(neighbor);
      queue.push(newPath);
    }
  }

  return [from]; // fallback: stay put
}

// ── Destination desk per agent ────────────────────────────────────────────────

export const AGENT_DESK: Record<string, WaypointId> = {
  'lawyer-georgia':     'desk_lawyer',
  'finance':            'desk_finance',
  'marketing':          'desk_marketing',
  'researcher':         'desk_research',
  'business-assistant': 'desk_business',
  'sales':              'desk_sales',
  'realestate':         'desk_realestate',
  'personal-assistant': 'desk_personal',
  'receptionist':       'desk_receptionist',
};

// ── Random wander destinations ────────────────────────────────────────────────

// ── Per-agent wander zones ────────────────────────────────────────────────────
// Each agent has a preferred set of destinations biased toward their side of
// the office.  This prevents all 8 workers converging on the same spot and
// ensures they travel different corridors most of the time.
//
// Layout reminder:
//   Left side  (x ≈ −5 … −8.5): business-assistant, lawyer, realestate, marketing
//   Right side (x ≈  5 …  8.5): finance, sales, researcher, personal-assistant
//   Coffee corner  → far left  (x = −7.5)
//   Lounge sofas   → left-ish  (x = −5)
//   Meeting table  → centre
//   Receptionist   → far right (x = 9)

export const AGENT_WANDER_ZONES: Partial<Record<string, WaypointId[]>> = {
  // ── Left back row ──────────────────────────────────────────────────────────
  'business-assistant': [
    'coffee_corner', 'coffee_corner',          // ☕ loves coffee
    'lounge_seat_a', 'lounge_seat_b',          // 🛋 sofa break
    'table_seat_w',                            // 🪑 meeting (left seat)
  ],
  'lawyer-georgia': [
    'coffee_corner', 'coffee_corner',
    'lounge_seat_a',
    'table_seat_s', 'table_seat_w',            // 🪑 south/west seat
  ],

  // ── Right back row ─────────────────────────────────────────────────────────
  'finance': [
    'table_seat_e', 'table_seat_e',            // 🪑 east seat (right side)
    'table_seat_s',
    'lounge_seat_b',                           // occasional sofa visit
  ],
  'sales': [
    'table_seat_e', 'table_seat_s',            // meeting-heavy
    'table_seat_e',
    'desk_receptionist',                       // visits reception often
  ],

  // ── Left front row ─────────────────────────────────────────────────────────
  'realestate': [
    'coffee_corner', 'coffee_corner',          // ☕ coffee corner (same side)
    'lounge_seat_a', 'lounge_seat_b',
  ],
  'marketing': [
    'coffee_corner',
    'lounge_seat_a', 'lounge_seat_b',          // 🛋 creative thinking on sofa
    'table_seat_w',
  ],

  // ── Right front row ────────────────────────────────────────────────────────
  'researcher': [
    'table_seat_s', 'table_seat_s',            // 🪑 research meetings
    'table_seat_e',
    'lounge_seat_b',                           // reading on sofa
  ],
  'personal-assistant': [
    'table_seat_e', 'table_seat_s',
    'desk_receptionist',                       // coordinates with reception
    'lounge_seat_b',
  ],
};

// Fallback pool used for agents without a zone entry (e.g. receptionist)
export const WANDER_SPOTS: WaypointId[] = [
  'coffee_corner',
  'table_seat_s',
  'table_seat_w',
  'table_seat_e',
  'lounge_seat_a',
  'lounge_seat_b',
];

// ── Arrival facing — rotY applied when worker reaches destination ──────────────
// Convention: atan2(dx, dz) — 0 = face +z, π/2 = +x, −π/2 = −x, ±π = −z

export const ARRIVAL_FACING: Partial<Record<WaypointId, number>> = {
  // Back row — face −z (toward monitor)
  desk_lawyer:    Math.PI,
  desk_finance:   Math.PI,
  desk_business:  Math.PI,
  desk_sales:     Math.PI,
  // Front row — face +z (toward monitor)
  desk_marketing:  0,
  desk_research:   0,
  desk_realestate: 0,
  desk_personal:   0,

  // Meeting table — face toward centre (0, 0, 5.8)
  table_seat_s:  0,              // south → face +z
  table_seat_w:  Math.PI / 2,   // west  → face +x
  table_seat_e: -Math.PI / 2,   // east  → face −x

  // Lounge sofas — both face +z (toward room / camera)
  lounge_seat_a: 0,
  lounge_seat_b: 0,

  // Reception desk — face +z (toward entrance / visitors)
  desk_receptionist: 0,
};

/** Pick a random wander destination, preferring this agent's zone. */
export function randomWander(agentId?: string): WaypointId {
  const zone = agentId ? AGENT_WANDER_ZONES[agentId] : undefined;
  const pool: WaypointId[] = zone ?? WANDER_SPOTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

import { useRef, useState, useCallback, useEffect } from 'react';
import { Vector3 } from 'three';
import {
  WAYPOINTS, AGENT_DESK, ARRIVAL_FACING, findPath, randomWander,
  type WaypointId,
} from './waypoints';

// ─────────────────────────────────────────────────────────────────────────────
// Global agent state registry — shared by every useWorkerAI instance.
// Stores position AND velocity so we can correctly handle head-on passes.
// ─────────────────────────────────────────────────────────────────────────────

interface AgentState {
  pos:      Vector3;
  vel:      Vector3;   // zero-length when sitting/stopped
  priority: number;    // deterministic per agent — lower = higher priority (passes first)
}

const AGENT_STATES = new Map<string, AgentState>();

// ── Walking quota ─────────────────────────────────────────────────────────────
// Limits how many agents can walk simultaneously.  At most 2 agents are in
// motion at any given time — the rest stay at their desks until a slot opens.
// This eliminates corridor congestion at the source rather than fighting it
// with collision avoidance after the fact.
let   WALKING_COUNT = 0;
const MAX_WALKING   = 2;

// ── Tuning constants ──────────────────────────────────────────────────────────

// How close two agents must be (in their proposed next positions) before we
// consider a collision at all.  Reduced from 0.50 — lets agents pass closely
// in corridors without false blocks.
const COLLISION_RADIUS = 0.32;

// Forward-arc threshold.  Other agent must be within ~55° of our heading
// (dot > 0.57) to count as blocking.  Agents coming from the side slip past.
const BLOCK_DOT = 0.57;

// If the other agent's velocity dotted with my direction is below this value
// they are moving TOWARD me (oncoming).  Head-on pairs shouldn't block each
// other — they'll naturally pass if given the chance.
const ONCOMING_DOT = -0.25;

// How long to wait before re-routing when truly stuck.  Shorter = quicker
// recovery from genuine deadlocks (3+ agents in the same junction).
const BLOCK_TIMEOUT = 0.18;   // seconds

// ─────────────────────────────────────────────────────────────────────────────

export type MotionState = 'sitting' | 'walking';

interface UseWorkerAIOptions {
  agentId:      string;
  /** Override desk waypoint (dynamic slot assignment). Falls back to AGENT_DESK[agentId]. */
  homeDeskId?:  WaypointId;
  sitMinSec?:   number;
  sitMaxSec?:   number;
  speed?:       number;
  wanders?:     boolean;
}

export function useWorkerAI({
  agentId,
  homeDeskId:  homeDeskIdProp,
  sitMinSec = 8,
  sitMaxSec = 22,
  speed     = 2.2,
  wanders   = true,
}: UseWorkerAIOptions) {
  const homeDeskId = (homeDeskIdProp ?? AGENT_DESK[agentId] ?? 'hall_center') as WaypointId;
  const homePos    = WAYPOINTS[homeDeskId].clone();

  // Deterministic priority: lower hash = higher priority = never yields.
  // Prevents symmetric deadlocks where both agents block each other forever.
  const priority = agentPriority(agentId);

  // ── Refs (zero re-renders on every frame) ─────────────────────────────────
  const posRef             = useRef<Vector3>(homePos.clone());
  const rotRef             = useRef<number>(0);
  const stateRef           = useRef<MotionState>('sitting');
  const pathRef            = useRef<WaypointId[]>([]);
  const pathIdxRef         = useRef<number>(0);
  const sitTimerRef        = useRef<number>(sitMinSec + Math.random() * (sitMaxSec - sitMinSec));
  // Stagger startup: spread agents so they don't all leave at t=0.
  const sitElapsedRef      = useRef<number>(Math.random() * sitMinSec * 0.85);
  const currentWaypointRef = useRef<WaypointId | null>(homeDeskId);
  const blockedTimerRef    = useRef<number>(0);
  const velRef             = useRef<Vector3>(new Vector3());

  // ── React state — triggers VoxelWorker animation switch ──────────────────
  const [motionState, setMotionState] = useState<MotionState>('sitting');

  // ── Register / unregister in shared registry ─────────────────────────────
  useEffect(() => {
    AGENT_STATES.set(agentId, { pos: posRef.current.clone(), vel: new Vector3(), priority });
    return () => {
      AGENT_STATES.delete(agentId);
      // Release walking slot if we're unmounted mid-walk
      if (stateRef.current === 'walking') {
        WALKING_COUNT = Math.max(0, WALKING_COUNT - 1);
      }
    };
  }, [agentId, priority]);

  // ── Start walking to a new destination ───────────────────────────────────
  const startWalk = useCallback(() => {
    // Quota: at most MAX_WALKING agents in motion simultaneously.
    // If the slot is full, skip this cycle — the sit timer will retry next tick.
    if (WALKING_COUNT >= MAX_WALKING) return;

    WALKING_COUNT += 1;
    const fromId = closestWaypoint(posRef.current);
    // Use per-agent zone so different agents travel to different areas
    const toId: WaypointId = Math.random() < 0.55 ? randomWander(agentId) : homeDeskId;
    const path = findPath(fromId, toId);
    pathRef.current            = path;
    pathIdxRef.current         = 0;
    stateRef.current           = 'walking';
    currentWaypointRef.current = null;
    setMotionState('walking');
  }, [homeDeskId]);

  // ── Tick — called from VoxelWorker useFrame ───────────────────────────────
  const tick = useCallback((delta: number) => {
    // Keep registry fresh so all agents can read each other's latest state.
    AGENT_STATES.set(agentId, { pos: posRef.current.clone(), vel: velRef.current.clone(), priority });

    if (!wanders) return;

    // ── Sitting / idle timer ─────────────────────────────────────────────
    if (stateRef.current === 'sitting') {
      velRef.current.set(0, 0, 0);
      sitElapsedRef.current += delta;
      if (sitElapsedRef.current >= sitTimerRef.current) {
        sitElapsedRef.current = 0;
        sitTimerRef.current   = sitMinSec + Math.random() * (sitMaxSec - sitMinSec);
        startWalk();
      }
      return;
    }

    // ── Walking ───────────────────────────────────────────────────────────
    const path = pathRef.current;
    const idx  = pathIdxRef.current;

    if (idx >= path.length) {
      // Arrived at final destination — release walking slot, transition to sitting
      stateRef.current           = 'sitting';
      WALKING_COUNT              = Math.max(0, WALKING_COUNT - 1);
      const finalWp              = path[path.length - 1];
      currentWaypointRef.current = finalWp;
      const facing = ARRIVAL_FACING[finalWp];
      if (facing !== undefined) rotRef.current = facing;
      blockedTimerRef.current = 0;
      velRef.current.set(0, 0, 0);
      setMotionState('sitting');
      return;
    }

    const targetWP = WAYPOINTS[path[idx]];
    const dir      = new Vector3().subVectors(targetWP, posRef.current);
    const dist     = dir.length();

    if (dist < 0.08) {
      // Snapped to waypoint — advance to next step
      posRef.current.copy(targetWP);
      pathIdxRef.current      += 1;
      blockedTimerRef.current  = 0;
      return;
    }

    // ── Proposed movement ────────────────────────────────────────────────
    const stepDist = Math.min(speed * delta, dist);
    const moveDir  = dir.clone().normalize();
    const step     = moveDir.clone().multiplyScalar(stepDist);
    const nextPos  = posRef.current.clone().add(step);

    // Update velocity for other agents to read
    velRef.current.copy(moveDir);

    // ── Collision avoidance ───────────────────────────────────────────────
    //
    // An agent is a blocker only when ALL of the following are true:
    //   (a) their position overlaps our NEXT position within COLLISION_RADIUS
    //   (b) they are within our forward arc  (dot > BLOCK_DOT ≈ 55°)
    //   (c) they are NOT coming toward us    — head-on pairs get a free pass
    //   (d) we do NOT have right-of-way     — lower priority agent always yields
    //
    // (c) is the crucial fix for the original deadlock:
    //   two agents walking toward each other both saw each other as "blocking",
    //   so neither moved.  Now we check the other agent's velocity: if they are
    //   moving in the opposite direction (dot < ONCOMING_DOT) they will
    //   naturally clear our path, so we ignore them and keep moving.
    //
    let blocked = false;
    for (const [otherId, other] of AGENT_STATES) {
      if (otherId === agentId) continue;

      // (a) distance check
      if (nextPos.distanceTo(other.pos) >= COLLISION_RADIUS) continue;

      // (b) forward arc
      const toOther = other.pos.clone().sub(posRef.current);
      if (toOther.length() <= 0.001) continue;
      if (toOther.normalize().dot(moveDir) <= BLOCK_DOT) continue;

      // (c) oncoming check — if the other agent is heading toward us, let them pass
      if (other.vel.length() > 0.05 && other.vel.dot(moveDir) < ONCOMING_DOT) continue;

      // (d) priority — higher-priority agent (lower number) never yields
      if (priority < other.priority) continue;

      blocked = true;
      break;
    }

    if (blocked) {
      // ── Sidestep avoidance ───────────────────────────────────────────────
      // Try stepping sideways (right first, then left) instead of stopping.
      // This makes agents smoothly walk around each other like real people.
      const perpRight = new Vector3(-moveDir.z, 0,  moveDir.x);
      const perpLeft  = new Vector3( moveDir.z, 0, -moveDir.x);

      let sidestepped = false;
      for (const perpDir of [perpRight, perpLeft]) {
        const sideStep = perpDir.clone().multiplyScalar(stepDist * 0.65);
        const sidePos  = posRef.current.clone().add(sideStep);

        let sideBlocked = false;
        for (const [oid, other] of AGENT_STATES) {
          if (oid === agentId) continue;
          if (sidePos.distanceTo(other.pos) < COLLISION_RADIUS * 0.8) {
            sideBlocked = true;
            break;
          }
        }

        if (!sideBlocked) {
          posRef.current.add(sideStep);
          velRef.current.copy(perpDir);
          blockedTimerRef.current = 0;
          sidestepped = true;
          break;
        }
      }

      if (sidestepped) return;

      // Both sides also blocked — wait briefly, then pick a different route
      blockedTimerRef.current += delta;
      velRef.current.set(0, 0, 0);

      if (blockedTimerRef.current >= BLOCK_TIMEOUT) {
        blockedTimerRef.current = 0;
        const fromId  = closestWaypoint(posRef.current);
        const newPath = findPath(fromId, randomWander(agentId));
        pathRef.current    = newPath;
        pathIdxRef.current = 0;
      }
      return;
    }

    // ── Move ─────────────────────────────────────────────────────────────
    blockedTimerRef.current = 0;
    posRef.current.add(step);

    // Smoothly rotate to face direction of travel
    const angle = Math.atan2(dir.x, dir.z);
    rotRef.current = lerpAngle(rotRef.current, angle, 8 * delta);
  }, [agentId, wanders, sitMinSec, sitMaxSec, speed, priority, startWalk]);

  return { motionState, tick, posRef, rotRef, currentWaypointRef };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function lerpAngle(current: number, target: number, t: number): number {
  const diff = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return current + Math.min(t, 1) * diff;
}

function closestWaypoint(pos: Vector3): WaypointId {
  let best: WaypointId = 'hall_center';
  let bestDist = Infinity;
  for (const [id, wp] of Object.entries(WAYPOINTS)) {
    const d = pos.distanceTo(wp);
    if (d < bestDist) { bestDist = d; best = id as WaypointId; }
  }
  return best;
}

/** Deterministic priority from agent ID string.  Lower value = passes first. */
function agentPriority(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h * 31 + id.charCodeAt(i), 1) | 0;
  }
  return h >>> 0; // unsigned 32-bit
}

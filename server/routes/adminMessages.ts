import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Admin direct-message routes
//
// GET  /api/admin/inbox            — admin: list all users + latest msg
// GET  /api/admin/thread/:userId   — admin or user: get full thread
// POST /api/admin/reply            — admin: send reply to a user
// ─────────────────────────────────────────────────────────────────────────────

export const adminMessagesRouter = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';

function getAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function resolveUser(req: Request): Promise<{ userId: string; email: string } | null> {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) return null;
  const db = getAdmin();
  if (!db) return null;
  const { data, error } = await db.auth.getUser(header.slice(7));
  if (error || !data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? '' };
}

const isAdmin = (email: string) => ADMIN_EMAIL !== '' && email === ADMIN_EMAIL;

interface DbMsg {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  content: string;
  is_from_admin: boolean;
  created_at: string;
}

// ── GET /api/admin/inbox ──────────────────────────────────────────────────────

adminMessagesRouter.get('/admin/inbox', async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  if (!user || !isAdmin(user.email)) { res.status(403).json({ error: 'Forbidden' }); return; }

  const db = getAdmin();
  if (!db) { res.status(500).json({ error: 'DB not configured' }); return; }

  const { data, error } = await db
    .from('admin_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Group by user: latest message + unread count (unread = from user, not admin)
  const map = new Map<string, {
    userId: string; userName: string; userEmail: string;
    lastMessage: string; lastAt: string; unreadCount: number;
  }>();

  for (const row of (data ?? []) as DbMsg[]) {
    if (!map.has(row.user_id)) {
      map.set(row.user_id, {
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        lastMessage: row.content,
        lastAt: row.created_at,
        unreadCount: row.is_from_admin ? 0 : 1,
      });
    } else {
      if (!row.is_from_admin) map.get(row.user_id)!.unreadCount += 1;
    }
  }

  res.json({ users: Array.from(map.values()) });
});

// ── GET /api/admin/thread/:userId ────────────────────────────────────────────

adminMessagesRouter.get('/admin/thread/:userId', async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { userId } = req.params as { userId: string };
  if (!isAdmin(user.email) && user.userId !== userId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  const db = getAdmin();
  if (!db) { res.status(500).json({ error: 'DB not configured' }); return; }

  const { data, error } = await db
    .from('admin_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ messages: data ?? [] });
});

// ── POST /api/admin/reply ─────────────────────────────────────────────────────

adminMessagesRouter.post('/admin/reply', async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  if (!user || !isAdmin(user.email)) { res.status(403).json({ error: 'Forbidden' }); return; }

  const { userId, content } = req.body as { userId?: string; content?: string };
  if (!userId || !content?.trim()) {
    res.status(400).json({ error: 'userId and content required' }); return;
  }

  const db = getAdmin();
  if (!db) { res.status(500).json({ error: 'DB not configured' }); return; }

  // Get user_name / user_email from existing thread
  const { data: existing } = await db
    .from('admin_messages')
    .select('user_name, user_email')
    .eq('user_id', userId)
    .limit(1)
    .single() as { data: Pick<DbMsg, 'user_name' | 'user_email'> | null };

  const { data, error } = await db
    .from('admin_messages')
    .insert({
      user_id:       userId,
      user_name:     existing?.user_name  ?? 'User',
      user_email:    existing?.user_email ?? '',
      content:       content.trim(),
      is_from_admin: true,
    })
    .select('*')
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ message: data });
});

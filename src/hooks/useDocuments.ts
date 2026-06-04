import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Document, DocumentType } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// useDocuments — per-agent document storage backed by Supabase.
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface DbDocument {
  id: string;
  user_id: string;
  agent_id: string;
  title: string;
  type: DocumentType;
  content: string;
  created_at: string;
  updated_at: string;
}

function dbToDoc(d: DbDocument): Document {
  const bytes = new TextEncoder().encode(d.content).length;
  const size  = bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return {
    id:        d.id,
    agentId:   d.agent_id,
    title:     d.title,
    type:      d.type,
    content:   d.content,
    createdAt: d.created_at,
    size,
  };
}

export interface CreateDocInput {
  title: string;
  type: DocumentType;
  content: string;
}

export interface UseDocumentsReturn {
  documents: Document[];
  loading: boolean;
  createDocument: (input: CreateDocInput) => Promise<Document | null>;
  updateDocument: (id: string, title: string, content: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
}

export function useDocuments(agentId: string): UseDocumentsReturn {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading,   setLoading]   = useState(true);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await db
        .from('documents')
        .select('*')
        .eq('user_id', user!.id)
        .eq('agent_id', agentId)
        .order('updated_at', { ascending: false });

      if (cancelled) return;
      if (error) { console.error('[useDocuments] load:', error); setLoading(false); return; }

      setDocuments((data as DbDocument[] ?? []).map(dbToDoc));
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [agentId, user?.id]);

  // ── Create ─────────────────────────────────────────────────────────────────
  const createDocument = useCallback(async (input: CreateDocInput): Promise<Document | null> => {
    if (!user) return null;

    const { data, error } = await db
      .from('documents')
      .insert({
        user_id:  user.id,
        agent_id: agentId,
        title:    input.title,
        type:     input.type,
        content:  input.content,
      })
      .select('*')
      .single();

    if (error || !data) { console.error('[useDocuments] create:', error); return null; }

    const doc = dbToDoc(data as DbDocument);
    setDocuments(prev => [doc, ...prev]);
    return doc;
  }, [agentId, user?.id]);

  // ── Update ─────────────────────────────────────────────────────────────────
  const updateDocument = useCallback(async (id: string, title: string, content: string) => {
    const now = new Date().toISOString();
    await db.from('documents').update({ title, content, updated_at: now }).eq('id', id);
    setDocuments(prev => prev.map(d =>
      d.id !== id ? d : dbToDoc({ ...d, agent_id: agentId, user_id: '', title, content, updated_at: now, created_at: d.createdAt }),
    ));
  }, [agentId]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteDocument = useCallback(async (id: string) => {
    await db.from('documents').delete().eq('id', id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  return { documents, loading, createDocument, updateDocument, deleteDocument };
}

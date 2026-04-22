'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../../lib/supabase'

type UserRow = {
  id: string
  email: string
  created_at: string
}

export default function DashboardPage() {
  const [email, setEmail] = useState('')
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    window.clearTimeout((window as any).__toastTimer)
    ;(window as any).__toastTimer = window.setTimeout(() => {
      setToast(null)
    }, 2500)
  }

  const fetchUsers = async () => {
    setFetching(true)
    const { data, error } = await createClient()
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      showToast('error', 'Users load nahi huye')
    } else {
      setUsers((data as UserRow[]) || [])
    }
    setFetching(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      showToast('error', 'Please enter email')
      return
    }

    if (!isValidEmail(cleanEmail)) {
      showToast('error', 'Please enter a valid email')
      return
    }

    setLoading(true)

    const { error } = await createClient()
      .from('users')
      .insert([{ email: cleanEmail }])

    if (error) {
      if (error.message.toLowerCase().includes('duplicate')) {
        showToast('error', 'This email already exists!')
      } else {
        showToast('error', 'Email save nahi hui')
      }
    } else {
      setEmail('')
      showToast('success', 'User saved successfully!')
      fetchUsers()
    }

    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this email?')
    if (!confirmDelete) return

    setDeletingId(id)

    const { error } = await createClient()
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      showToast('error', 'Delete failed!')
    } else {
      showToast('success', 'User deleted successfully!')
      setUsers((prev) => prev.filter((user) => user.id !== id))
    }

    setDeletingId(null)
  }

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter((user) => user.email.toLowerCase().includes(query))
  }, [users, search])

  return (
    <div style={styles.page}>
      {toast && (
        <div
          style={{
            ...styles.toast,
            ...(toast.type === 'success' ? styles.toastSuccess : styles.toastError),
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={styles.bgGlowOne} />
      <div style={styles.bgGlowTwo} />

      <div style={styles.container}>
        <div style={styles.headerCard}>
          <div>
            <div style={styles.badge}>Advanced Email Manager</div>
            <h1 style={styles.title}>User Email Dashboard</h1>
            <p style={styles.subtitle}>
              Save, search, and delete emails with a clean professional interface.
            </p>
          </div>

          <div style={styles.statsWrap}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total</span>
              <span style={styles.statValue}>{users.length}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Visible</span>
              <span style={styles.statValue}>{filteredUsers.length}</span>
            </div>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.formCard}>
            <h2 style={styles.cardTitle}>Add New Email</h2>
            <p style={styles.cardText}>
              Valid email enter karo. Duplicate email automatically block ho jayegi.
            </p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
                style={styles.input}
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                ...styles.primaryButton,
                ...(loading ? styles.buttonDisabled : {}),
              }}
            >
              {loading ? 'Saving...' : 'Save Email'}
            </button>
          </div>

          <div style={styles.listCard}>
            <div style={styles.listHeader}>
              <div>
                <h2 style={styles.cardTitle}>Saved Emails</h2>
                <p style={styles.cardText}>Realtime refreshed email list.</p>
              </div>

              <input
                type="text"
                placeholder="Search email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.listBody}>
              {fetching ? (
                <div style={styles.emptyState}>Loading emails...</div>
              ) : filteredUsers.length === 0 ? (
                <div style={styles.emptyState}>
                  {users.length === 0 ? 'No emails saved yet.' : 'No matching emails found.'}
                </div>
              ) : (
                filteredUsers.map((user, index) => (
                  <div key={user.id} style={styles.userRow}>
                    <div style={styles.userLeft}>
                      <div style={styles.userIndex}>{index + 1}</div>
                      <div>
                        <div style={styles.userEmail}>{user.email}</div>
                        <div style={styles.userMeta}>
                          {new Date(user.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(user.id)}
                      disabled={deletingId === user.id}
                      style={{
                        ...styles.deleteButton,
                        ...(deletingId === user.id ? styles.buttonDisabled : {}),
                      }}
                    >
                      {deletingId === user.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top left, rgba(99,102,241,0.18), transparent 25%), radial-gradient(circle at bottom right, rgba(168,85,247,0.18), transparent 25%), linear-gradient(135deg, #030712 0%, #0f172a 50%, #111827 100%)',
    color: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: '40px 20px',
  },
  bgGlowOne: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: '50%',
    background: 'rgba(59,130,246,0.14)',
    filter: 'blur(80px)',
    top: -80,
    left: -60,
    pointerEvents: 'none',
  },
  bgGlowTwo: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: '50%',
    background: 'rgba(168,85,247,0.14)',
    filter: 'blur(80px)',
    bottom: -100,
    right: -80,
    pointerEvents: 'none',
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  headerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  badge: {
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 700,
    color: '#c4b5fd',
    background: 'rgba(139,92,246,0.16)',
    border: '1px solid rgba(139,92,246,0.25)',
    padding: '6px 10px',
    borderRadius: 999,
    marginBottom: 12,
    letterSpacing: 0.4,
  },
  title: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.1,
    fontWeight: 800,
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 0,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    maxWidth: 650,
  },
  statsWrap: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
  },
  statCard: {
    minWidth: 110,
    padding: '16px 18px',
    borderRadius: 18,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'center',
  },
  statLabel: {
    display: 'block',
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 800,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 360px) 1fr',
    gap: 24,
  },
  formCard: {
    padding: 24,
    borderRadius: 24,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    height: 'fit-content',
  },
  listCard: {
    padding: 24,
    borderRadius: 24,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  },
  cardTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
  },
  cardText: {
    marginTop: 8,
    marginBottom: 18,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: 600,
  },
  input: {
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    outline: 'none',
    fontSize: 15,
  },
  primaryButton: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(37,99,235,0.25)',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  searchInput: {
    minWidth: 240,
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    outline: 'none',
    fontSize: 14,
  },
  listBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  userRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 18,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    flexWrap: 'wrap',
  },
  userLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  userIndex: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(99,102,241,0.18)',
    color: '#c7d2fe',
    fontWeight: 800,
    flexShrink: 0,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: 700,
    wordBreak: 'break-word',
  },
  userMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  deleteButton: {
    padding: '10px 14px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  emptyState: {
    padding: 28,
    borderRadius: 18,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.72)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px dashed rgba(255,255,255,0.12)',
  },
  toast: {
    position: 'fixed',
    top: 22,
    right: 22,
    zIndex: 50,
    padding: '14px 18px',
    borderRadius: 14,
    color: '#fff',
    fontWeight: 700,
    boxShadow: '0 14px 28px rgba(0,0,0,0.30)',
    border: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(10px)',
  },
  toastSuccess: {
    background: 'rgba(22,163,74,0.88)',
  },
  toastError: {
    background: 'rgba(220,38,38,0.88)',
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
}
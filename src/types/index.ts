export interface Profile {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  created_at: string
}

export interface Contact {
  id: string
  name: string
  type: 'label' | 'booker' | 'press' | 'producer' | 'other'
  email?: string
  phone?: string
  website?: string
  notes?: string
  created_at: string
}

export interface Song {
  id: string
  title: string
  status: 'IDEE' | 'SCHREIBEN' | 'ARRANGEMENT' | 'DEMO' | 'FERTIG' | 'VERÖFFENTLICHT'
  progress: number
  album_id?: string
  bpm?: number
  key?: string
  notes?: string
  created_at: string
}

export interface Album {
  id: string
  title: string
  type: 'album' | 'ep' | 'single'
  release_date?: string
  created_at: string
}

export interface Event {
  id: string
  title: string
  type: 'show' | 'probe' | 'meeting' | 'deadline' | 'other'
  date: string
  venue?: string
  fee?: number
  notes?: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  done: boolean
  due_date?: string
  priority: 'hoch' | 'mittel' | 'niedrig'
  assigned_to?: string
  project_id?: string
  event_id?: string
  created_at: string
}

export interface Project {
  id: string
  title: string
  status: 'offen' | 'aktiv' | 'abgeschlossen'
  due_date?: string
  notes?: string
  created_at: string
}

export interface Goal {
  id: string
  title: string
  year: number
  target_value: number
  current_value: number
  unit?: string
  created_at: string
}

export interface MerchItem {
  id: string
  name: string
  size?: string
  gender?: string
  color?: string
  stock: number
  reorder_threshold: number
  price?: number
  created_at: string
}

export interface WikiPage {
  id: string
  title: string
  content: string
  tags: string[]
  updated_at: string
  created_at: string
}

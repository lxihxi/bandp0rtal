# bandpOrtal - Softwareentwicklungsplan

> Internes Band-Management-Portal | Stack: React + Supabase + Netlify + GitHub

---

## 1. Projektübersicht

bandpOrtal ist ein privates, webbasiertes Band-Management-Tool für interne Nutzung. Es ersetzt und verbessert den bestehenden Pilot (BandCore) mit sauberem Code, produktionsfähiger Infrastruktur und wartbarer Architektur.

**Zielgruppe:** Bandmitglieder (eingeladene User, kein öffentlicher Zugang)  
**Design:** Dark Theme, professionell, rot/schwarz Akzente  
**Sprache:** Deutsch (UI), Englisch (Code)

---

## 2. Tech Stack

| Schicht | Technologie | Begründung |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Schnell, typsicher, Netlify-optimiert |
| Styling | Tailwind CSS + shadcn/ui | Dark Theme, konsistente Komponenten |
| Routing | React Router v6 | SPA-Navigation |
| State / Data | TanStack Query v5 | Server-State, Caching, optimistic updates |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) | Bereits bekannt, alles-in-einem |
| Hosting | Netlify | CI/CD aus GitHub, Previews per Branch |
| Versionskontrolle | GitHub | Bestehender Workflow |
| Icons | Lucide React | Konsistentes Icon-Set |

---

## 3. Architektur

```
bandpOrtal/
├── src/
│   ├── components/        # Wiederverwendbare UI-Komponenten
│   │   ├── layout/        # Sidebar, TopBar, Layout-Wrapper
│   │   └── ui/            # shadcn-Komponenten (Button, Card, Badge, ...)
│   ├── modules/           # Feature-Module (je ein Ordner pro Modul)
│   │   ├── dashboard/
│   │   ├── contacts/      # CRM & Kontakte
│   │   ├── songs/         # Songs & Discography
│   │   ├── projects/      # Projekte & Ziele
│   │   ├── calendar/      # Kalender / Events
│   │   ├── tasks/         # Aufgaben
│   │   ├── merch/         # Merch & Inventar
│   │   ├── files/         # Dateien & EPK
│   │   └── wiki/          # Notizen / Wiki
│   ├── lib/
│   │   ├── supabase.ts    # Supabase-Client
│   │   └── utils.ts       # Hilfsfunktionen
│   ├── hooks/             # Custom React Hooks
│   ├── types/             # TypeScript-Typen (DB-Schema-Typen)
│   └── App.tsx
├── supabase/
│   └── migrations/        # SQL-Migrationen
├── .env.local             # Supabase URL + Anon Key (nicht in Git)
├── netlify.toml
└── package.json
```

---

## 4. Datenbankschema (Supabase / PostgreSQL)

### Tabellen

```
profiles          -- Bandmitglieder (verknüpft mit auth.users)
contacts          -- CRM: Labels, Booker, Presse, Produzenten
songs             -- Songs mit Status (IDEE → SCHREIBEN → ARRANGEMENT → FERTIG → VERÖFF.)
albums            -- Alben/EPs, verknüpft mit Songs
events            -- Shows, Proben, Meetings
tasks             -- Aufgaben mit Fälligkeitsdatum + Zuweisung
projects          -- Projekte mit Zieldatum
goals             -- Strategische Ziele mit Zielwert + aktuellem Wert
merch_items       -- Merch-Artikel mit Lagerbestand + Nachbestellschwelle
files             -- Metadaten zu Dateien (Pfad in Supabase Storage)
wiki_pages        -- Notizen / Wiki-Seiten (Markdown)
```

### Row Level Security
- Jede Tabelle bekommt RLS-Policies: nur authentifizierte Bandmitglieder haben Zugriff
- Kein öffentlicher Datenzugriff möglich

---

## 5. Module im Detail

### 5.1 Dashboard
- KPI-Kacheln: Veröff. Singles, Offene Aufgaben, Überfällig, Shows gesamt
- Quick-Add-Buttons: + Kontakt, + Song, + Projekt, + Aufgabe, + Event, + Merch
- Widget: Nächste Events (nächste 30 Tage)
- Widget: Songs in Entwicklung (Status + Fortschritt)
- Widget: Überfällige Aufgaben (mit Erledigen-Checkbox)
- Widget: Strategische Ziele 2026 (Fortschrittsbalken)
- Widget: Merch Nachbestellen (Artikel unter Schwellenwert)

### 5.2 CRM & Kontakte
- Kontaktliste mit Filter (Typ: Label, Booker, Presse, Produzent, Sonstige)
- Kontaktdetail: Name, Rolle, E-Mail, Tel, Social, Notizen, verknüpfte Aufgaben
- Suche

### 5.3 Songs & Discography
- Song-Liste mit Statusfilter
- Status-Pipeline: IDEE → SCHREIBEN → ARRANGEMENT → DEMO → FERTIG → VERÖFFENTLICHT
- Fortschritt in % pro Song
- Verknüpfung mit Album
- Songdetail: Lyrics-Notizen, BPM, Key, Mitwirkende, Dateien

### 5.4 Projekte & Ziele
- Projektliste mit Status + Fälligkeitsdatum
- Strategische Jahresziele mit Zielwert, aktuellem Wert, Fortschrittsbalken
- Verknüpfung von Aufgaben mit Projekten

### 5.5 Kalender / Events
- Monatsansicht (Kalender)
- Listenansicht (nächste Events)
- Eventtypen: Show, Probe, Meeting, Deadline, Sonstiges
- Eventdetail: Venue, Gage, Setlist-Verknüpfung, Tech Rider, Notizen

### 5.6 Aufgaben
- Aufgabenliste mit Filter (Offen, Erledigt, Überfällig, Meine)
- Zuweisung an Bandmitglied
- Fälligkeitsdatum + Priorität (Hoch, Mittel, Niedrig)
- Verknüpfung mit Projekt oder Event

### 5.7 Merch & Inventar
- Artikelliste: Name, Variante (Größe/Farbe), Bestand, Preis, Nachbestellschwelle
- Bestandswarnung (rot wenn unter Schwellenwert)
- Verkaufsprotokoll (optional: +/- Bestand buchen)

### 5.8 Dateien & EPK
- Upload zu Supabase Storage
- Ordnerstruktur: EPK / Fotos / Verträge / Rider / Sonstiges
- Direktlink-Sharing (für EPK-Versand an Labels etc.)

### 5.9 Notizen / Wiki
- Markdown-Editor (einfach, kein Overhead)
- Seiten mit Titel + Tags
- Freitext-Suche

---

## 6. Entwicklungsphasen

### Phase 1 - Foundation (ca. 1 Woche)
- [ ] GitHub-Repo anlegen + main/dev Branch-Strategie
- [ ] Vite + React + TypeScript + Tailwind + shadcn/ui initialisieren
- [ ] Supabase-Projekt anlegen (Prod + Dev-Umgebung)
- [ ] Netlify verbinden (Auto-Deploy aus GitHub main)
- [ ] Auth: Supabase Magic Link (E-Mail-Einladung, kein Passwort-Reset für Öffentlichkeit)
- [ ] Basis-Layout: Sidebar, TopBar, geschütztes Routing

### Phase 2 - Kernmodule (ca. 2 Wochen)
- [ ] Supabase DB-Schema + Migrationen (alle Tabellen + RLS)
- [ ] Dashboard (alle Widgets, echte Daten)
- [ ] Aufgaben (vollständig inkl. Überfällig-Logik)
- [ ] Kalender / Events

### Phase 3 - Content-Module (ca. 2 Wochen)
- [ ] Songs & Discography
- [ ] Projekte & Ziele (inkl. Strategische Jahresziele)
- [ ] CRM & Kontakte

### Phase 4 - Erweiterte Module (ca. 1-2 Wochen)
- [ ] Merch & Inventar
- [ ] Dateien & EPK (Supabase Storage)
- [ ] Notizen / Wiki

### Phase 5 - Launch (ca. 3-4 Tage)
- [ ] Mobile-Responsiveness prüfen (Tablet + Smartphone)
- [ ] Bandmitglieder einladen + User-Rollen setzen
- [ ] Daten aus Pilot migrieren (manuell oder CSV-Import)
- [ ] Go-Live auf Netlify (Custom Domain optional)

---

## 7. Deployment-Strategie

```
GitHub main     →  Netlify Prod     (bandportal.netlify.app oder Custom Domain)
GitHub dev      →  Netlify Preview  (auto-generierte Preview-URL)
```

- **Supabase:** Ein Projekt für Produktion; lokale Entwicklung via `supabase start` (CLI)
- **Secrets:** `.env.local` nie in Git - Netlify bekommt Env-Variablen direkt im Dashboard
- **Backups:** Supabase macht tägliche automatische Backups (Point-in-Time auf Pro-Plan)

---

## 8. Auth & Zugang

- **5 Bandmitglieder**, alle mit gleichen Rechten (keine Rollen-Unterscheidung)
- **User-Erstellung ausschließlich in Supabase Dashboard** - kein Signup-Flow in der App
- Die App zeigt nur eine **Login-Seite** (E-Mail + Passwort via Supabase Auth)
- Keine "Passwort vergessen"-Option öffentlich sichtbar - Resets laufen direkt über Supabase
- RLS: alle authentifizierten User sehen alle Daten (gleiche Rechte, eine Band)
- Keine öffentliche Registrierung, kein Invite-Link in der App

---

## 9. Entscheidungen (abgeschlossen)

| Frage | Entscheidung |
|---|---|
| Bandmitglieder | 5 |
| Rollen | Keine - alle gleich |
| Datenmigration aus Pilot | Kein Export verfügbar - Neustart |
| Auth-Flow | Nur Login in der App, User-Erstellung in Supabase |

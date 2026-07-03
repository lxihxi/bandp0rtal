import type { Event } from '@/types'

const TYPE_COLOR: Record<string, string> = {
  show: 'bg-red-500',
  probe: 'bg-blue-500',
  meeting: 'bg-yellow-500',
  deadline: 'bg-orange-500',
  other: 'bg-gray-500',
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

interface MonthViewProps {
  year: number
  month: number
  events: Event[]
  onPrev: () => void
  onNext: () => void
  onDayClick: (date: string) => void
  onEventClick: (event: Event) => void
}

export function MonthView({ year, month, events, onPrev, onNext, onDayClick, onEventClick }: MonthViewProps) {
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const firstDayMon = (firstDayOfMonth + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayMon; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  function dayStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function eventsOnDay(d: number) {
    const ds = dayStr(d)
    return events.filter(e => e.date.startsWith(ds))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onPrev} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-[#1a1a1a] rounded transition-colors">‹</button>
        <h2 className="text-sm font-semibold text-white">{MONTHS[month]} {year}</h2>
        <button onClick={onNext} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-[#1a1a1a] rounded transition-colors">›</button>
      </div>

      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[#1f1f1f]">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] text-gray-600 uppercase tracking-wider py-2">{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-[#1f1f1f] last:border-0">
            {week.map((day, di) => {
              if (!day) return <div key={di} className="min-h-[60px] border-r border-[#1f1f1f] last:border-0" />
              const ds = dayStr(day)
              const dayEvents = eventsOnDay(day)
              const isToday = ds === todayStr
              return (
                <div
                  key={di}
                  onClick={() => onDayClick(ds)}
                  className="min-h-[60px] border-r border-[#1f1f1f] last:border-0 p-1 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className={`text-xs w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-red-600 text-white font-bold' : 'text-gray-400'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        onClick={e => { e.stopPropagation(); onEventClick(event) }}
                        className="text-[10px] truncate px-1 py-0.5 rounded cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${TYPE_COLOR[event.type]}`} />
                        <span className="text-gray-300">{event.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && <div className="text-[9px] text-gray-600 px-1">+{dayEvents.length - 3}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

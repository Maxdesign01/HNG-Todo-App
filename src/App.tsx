import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CalendarClock,
  Check,
  ClipboardList,
  Clock3,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  dueAt: string | null;
  createdAt: number;
};

type Filter = 'all' | 'active' | 'completed';
type DueStatus = 'upcoming' | 'soon' | 'overdue';

const STORAGE_KEY = 'my-tasks-v1';

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDue(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function dueStatus(value: string, now: number): DueStatus {
  const distance = new Date(value).getTime() - now;
  if (distance < 0) return 'overdue';
  if (distance <= 24 * 60 * 60 * 1000) return 'soon';
  return 'upcoming';
}

function dueLabel(status: DueStatus) {
  if (status === 'overdue') return 'Overdue';
  if (status === 'soon') return 'Due soon';
  return 'Upcoming';
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function TaskRow({
  task,
  now,
  onToggle,
  onDelete,
  onSaveReminder,
}: {
  task: Task;
  now: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveReminder: (id: string, dueAt: string | null) => void;
}) {
  const [editingReminder, setEditingReminder] = useState(false);
  const [reminderValue, setReminderValue] = useState(task.dueAt ?? '');
  const status = task.dueAt ? dueStatus(task.dueAt, now) : null;

  useEffect(() => {
    if (!editingReminder) setReminderValue(task.dueAt ?? '');
  }, [task.dueAt, editingReminder]);

  function saveReminder() {
    onSaveReminder(task.id, reminderValue || null);
    setEditingReminder(false);
  }

  return (
    <article className={`task-card ${task.completed ? 'completed' : ''}`} data-testid={`card-task-${task.id}`}>
      <button
        className="task-check"
        type="button"
        aria-label={task.completed ? `Mark "${task.text}" active` : `Complete "${task.text}"`}
        aria-pressed={task.completed}
        data-testid={`button-toggle-task-${task.id}`}
        onClick={() => onToggle(task.id)}
      >
        {task.completed && <Check size={14} strokeWidth={3} />}
      </button>
      <div className="task-main">
        <p className="task-title" data-testid={`text-task-${task.id}`}>{task.text}</p>
        {(task.dueAt || status) && (
          <div className="task-meta">
            {task.dueAt && (
              <span className="reminder-pill" data-testid={`text-reminder-${task.id}`}>
                <Clock3 size={12} /> {formatDue(task.dueAt)}
              </span>
            )}
            {status && !task.completed && (
              <span className={`status-pill ${status}`} data-testid={`status-task-${task.id}`}>
                {status === 'overdue' ? <Bell size={11} /> : <CalendarClock size={11} />}
                {dueLabel(status)}
              </span>
            )}
          </div>
        )}
        {editingReminder && (
          <div className="reminder-editor">
            <label className="sr-only" htmlFor={`reminder-${task.id}`}>Reminder date and time</label>
            <input
              id={`reminder-${task.id}`}
              type="datetime-local"
              value={reminderValue}
              onChange={(event) => setReminderValue(event.target.value)}
              data-testid={`input-reminder-${task.id}`}
            />
            <button className="small-button save" type="button" onClick={saveReminder} data-testid={`button-save-reminder-${task.id}`}>Save</button>
            <button className="small-button cancel" type="button" onClick={() => setEditingReminder(false)} data-testid={`button-cancel-reminder-${task.id}`}>Cancel</button>
          </div>
        )}
      </div>
      <div className="task-actions">
        <button
          className="icon-button"
          type="button"
          aria-label={task.dueAt ? 'Edit reminder' : 'Add reminder'}
          title={task.dueAt ? 'Edit reminder' : 'Add reminder'}
          data-testid={`button-edit-reminder-${task.id}`}
          onClick={() => setEditingReminder((value) => !value)}
        >
          <Pencil size={15} />
        </button>
        {task.dueAt && (
          <button
            className="icon-button"
            type="button"
            aria-label="Remove reminder"
            title="Remove reminder"
            data-testid={`button-remove-reminder-${task.id}`}
            onClick={() => onSaveReminder(task.id, null)}
          >
            <CalendarClock size={15} />
          </button>
        )}
        <button
          className="icon-button delete"
          type="button"
          aria-label={`Delete "${task.text}"`}
          title="Delete task"
          data-testid={`button-delete-task-${task.id}`}
          onClick={() => onDelete(task.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const copy = {
    all: ['Nothing here yet', 'Add a task above and give your day somewhere gentle to begin.'],
    active: ['You are all caught up', 'Completed tasks will stay tucked away here until you need them.'],
    completed: ['A clean slate', 'Tasks you complete will collect here as a quiet record of progress.'],
  }[filter];

  return (
    <div className="empty-state" data-testid={`empty-state-${filter}`}>
      <div className="empty-art" aria-hidden="true"><ClipboardList size={28} strokeWidth={1.5} /></div>
      <h3>{copy[0]}</h3>
      <p>{copy[1]}</p>
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [text, setText] = useState('');
  const [newDueAt, setNewDueAt] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState<string[]>([]);
  const lastTick = useRef(Date.now());
  const notified = useRef(new Set<string>());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Task[];
        if (Array.isArray(parsed)) setTasks(parsed);
      }
    } catch {
      setTasks([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks, hydrated]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const previous = lastTick.current;
    const dueNow = tasks.filter((task) => {
      const dueTime = task.dueAt ? new Date(task.dueAt).getTime() : NaN;
      return !task.completed && Number.isFinite(dueTime) && dueTime > previous && dueTime <= now && !notified.current.has(task.id);
    });
    if (dueNow.length) {
      dueNow.forEach((task) => notified.current.add(task.id));
      setNotice((current) => [...current, ...dueNow.map((task) => task.text)]);
    }
    lastTick.current = now;
  }, [now, tasks, hydrated]);

  const visibleTasks = useMemo(() => tasks
    .filter((task) => filter === 'all' || (filter === 'active' ? !task.completed : task.completed))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return b.createdAt - a.createdAt;
    }), [filter, tasks]);

  const activeCount = tasks.filter((task) => !task.completed).length;
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;
    setTasks((current) => [{
      id: makeId(),
      text: cleanText,
      completed: false,
      dueAt: newDueAt || null,
      createdAt: Date.now(),
    }, ...current]);
    setText('');
    setNewDueAt('');
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  }

  function deleteTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task || !window.confirm(`Delete "${task.text}"?`)) return;
    setTasks((current) => current.filter((item) => item.id !== id));
  }

  function saveReminder(id: string, dueAt: string | null) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, dueAt } : task));
    notified.current.delete(id);
  }

  return (
    <main className="app-shell">
      <div className="app-content">
        <div className="container">
          <header className="topbar">
            <div className="brand" aria-label="My Tasks">
              <span className="brand-mark" aria-hidden="true"><Check size={19} strokeWidth={3} /></span>
              <span className="brand-name">My Tasks</span>
            </div>
            <time className="today-label" dateTime={new Date().toISOString()}>{dateLabel}</time>
          </header>

          <section className="intro" aria-labelledby="welcome-heading">
            <div className="eyebrow"><span className="eyebrow-line" /> {greeting()}</div>
            <h1 id="welcome-heading">A little more room<br />in your day.</h1>
            <p>Keep the next thing close. Capture a thought, set a gentle reminder, and let the rest wait its turn.</p>
          </section>

          <form className="composer" onSubmit={addTask} data-testid="form-add-task">
            <label className="sr-only" htmlFor="new-task">What needs doing?</label>
            <input
              id="new-task"
              className="composer-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What needs doing?"
              autoComplete="off"
              data-testid="input-new-task"
            />
            <button className="date-trigger" type="button" aria-label="Set a reminder" title="Set a reminder" data-testid="button-open-new-reminder">
              <CalendarClock size={18} />
              <input
                type="datetime-local"
                aria-label="Reminder date and time"
                value={newDueAt}
                onChange={(event) => setNewDueAt(event.target.value)}
                data-testid="input-new-reminder"
              />
            </button>
            <button className="add-button" type="submit" data-testid="button-add-task"><Plus size={17} strokeWidth={2.5} /> Add task</button>
          </form>
          {newDueAt && <div className="due-preview"><Clock3 size={13} /> Reminder set for {formatDue(newDueAt)}</div>}

          <section className="workspace" aria-labelledby="tasks-heading">
            <div className="workspace-header">
              <div className="workspace-heading">
                <h2 id="tasks-heading">Your list</h2>
                <span className="count-label" data-testid="text-active-count">{activeCount} {activeCount === 1 ? 'task' : 'tasks'} left</span>
              </div>
              <div className="filters" role="tablist" aria-label="Task filters">
                {(['all', 'active', 'completed'] as Filter[]).map((item) => (
                  <button
                    key={item}
                    className={`filter-button ${filter === item ? 'active' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={filter === item}
                    data-testid={`button-filter-${item}`}
                    onClick={() => setFilter(item)}
                  >
                    {item[0].toUpperCase() + item.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {visibleTasks.length ? (
              <div className="task-list" data-testid="task-list">
                {visibleTasks.map((task) => (
                  <TaskRow key={task.id} task={task} now={now} onToggle={toggleTask} onDelete={deleteTask} onSaveReminder={saveReminder} />
                ))}
              </div>
            ) : <EmptyState filter={filter} />}
          </section>
          <footer className="footer-note">A quiet place for the next right thing.</footer>
        </div>
      </div>

      {notice.length > 0 && (
        <aside className="reminder-notice" role="alert" data-testid="notice-reminder">
          <div className="notice-icon"><Bell size={16} /></div>
          <div className="notice-copy">
            <strong>It is time for this</strong>
            <span>{notice.length === 1 ? notice[0] : `${notice.length} reminders are ready`}</span>
          </div>
          <button className="notice-close" type="button" aria-label="Dismiss reminder notice" data-testid="button-dismiss-notice" onClick={() => setNotice([])}><X size={16} /></button>
        </aside>
      )}
    </main>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { Settings, Plus, CheckCircle, Bell, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function Widget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [edge, setEdge] = useState('right');
  const [yPos, setYPos] = useState(0);

  const [settings, setSettings] = useState({});

  const loadData = async () => {
    if (window.api) {
      const t = await window.api.getTasks();
      setTasks(t);
      const r = await window.api.getReminders();
      setReminders(r);
      const s = await window.api.getSettings();
      setSettings(s);
      if (s.edge) setEdge(s.edge);
      if (s.yPosition) setYPos(parseInt(s.yPosition));
      
      if (s.theme === 'claro') {
        document.body.classList.add('theme-light');
      } else {
        document.body.classList.remove('theme-light');
      }
    }
  };

  useEffect(() => {
    loadData();
    // Start interval to check for reminders every minute
    const interval = setInterval(() => {
        checkReminders();
    }, 60000);

    let removeListener;
    if (window.api?.onSettingsUpdated) {
      removeListener = window.api.onSettingsUpdated(() => {
        loadData();
      });
    }

    return () => {
      clearInterval(interval);
      if (removeListener) removeListener();
    };
  }, []);
  
  const checkReminders = async () => {
      if (!window.api) return;
      const r = await window.api.getReminders();
      const now = new Date();
      r.forEach(rem => {
          if (rem.status === 'agendado') {
              const remDate = new Date(rem.datetime);
              // if time is less than 1 min difference
              if (Math.abs(now - remDate) < 60000) {
                  window.api.showPopup(rem);
              }
          }
      });
  };

  const expandTimeout = React.useRef(null);
  const isDraggingRef = React.useRef(false);
  const dragStartMouseY = React.useRef(0);
  const dragStartMouseX = React.useRef(0);
  const dragStartYPos = React.useRef(0);
  const currentEdgeRef = React.useRef('right');
  const currentYPosRef = React.useRef(0);

  const handlePointerEnter = () => {
    if (expandTimeout.current) clearTimeout(expandTimeout.current);
    if (!isExpanded && !isDraggingRef.current) {
      setIsExpanded(true);
      window.api?.expandWindow();
    }
  };

  const handlePointerLeave = () => {
    if (isDraggingRef.current) return;
    const delay = settings.delay ? parseInt(settings.delay) : 1000;
    expandTimeout.current = setTimeout(() => {
      if (isExpanded) {
        setIsExpanded(false);
        window.api?.collapseWindow();
      }
    }, delay);
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartMouseY.current = e.screenY;
    dragStartMouseX.current = e.screenX;
    dragStartYPos.current = yPos === 0 ? (window.innerHeight - 150) / 2 : yPos;
    currentEdgeRef.current = edge;
    currentYPosRef.current = dragStartYPos.current;
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    
    const deltaY = e.screenY - dragStartMouseY.current;
    let newYPos = dragStartYPos.current + deltaY;
    if (newYPos < 0) newYPos = 0;
    if (newYPos > window.innerHeight - 150) newYPos = window.innerHeight - 150;
    
    currentYPosRef.current = newYPos;
    setYPos(newYPos);

    const deltaX = e.screenX - dragStartMouseX.current;
    if (currentEdgeRef.current === 'right' && deltaX < -150) {
      currentEdgeRef.current = 'left';
      setEdge('left');
      window.api?.previewEdge('left');
      
      dragStartMouseX.current = e.screenX;
      dragStartMouseY.current = e.screenY;
      dragStartYPos.current = currentYPosRef.current;
    } else if (currentEdgeRef.current === 'left' && deltaX > 150) {
      currentEdgeRef.current = 'right';
      setEdge('right');
      window.api?.previewEdge('right');
      
      dragStartMouseX.current = e.screenX;
      dragStartMouseY.current = e.screenY;
      dragStartYPos.current = currentYPosRef.current;
    }
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    e.target.releasePointerCapture(e.pointerId);
    window.api?.updatePosition(currentEdgeRef.current, currentYPosRef.current);
  };

  const handleAddTask = async (e) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      await window.api?.addTask(newTaskTitle);
      setNewTaskTitle('');
      loadData();
    }
  };

  const handleToggleTask = async (id, currentStatus) => {
    await window.api?.toggleTask(id, !currentStatus);
    loadData();
  };

  const handleAddReminder = async () => {
    if (newReminderTitle && newReminderDate && newReminderTime) {
      const datetime = `${newReminderDate}T${newReminderTime}`;
      await window.api?.addReminder(newReminderTitle, datetime);
      setNewReminderTitle('');
      setNewReminderDate('');
      setNewReminderTime('');
      loadData();
    }
  };

  const openSettings = () => window.api?.openSettings();
  const openHistory = () => window.api?.openHistory();

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed).sort((a, b) => {
    if (a.completedAt && b.completedAt) {
      return new Date(b.completedAt) - new Date(a.completedAt);
    }
    return b.id - a.id;
  });
  const nextReminders = reminders.filter(r => r.status === 'agendado' && new Date(r.datetime) >= new Date());

  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);

  const formatCompletedDate = (dateStr) => {
    if (!dateStr) return '';
    // Assume dateStr is a parseable date string from DB
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const weekDays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    return `${day}/${month} (${weekDays[date.getDay()]})`;
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const reordered = Array.from(pendingTasks);
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, removed);

    // Optimistic UI update
    const newTasks = [...tasks];
    // Remove all pending from newTasks, then re-insert them in new order
    const completed = newTasks.filter(t => t.completed);
    setTasks([...reordered, ...completed]);

    await window.api?.reorderTasks(reordered.map(t => t.id));
    loadData();
  };

  const showTasks = settings.enableTasks !== 'false';
  const showReminders = settings.enableReminders !== 'false';
  const opacity = settings.opacity ? parseInt(settings.opacity) / 100 : 0.9;

  return (
    <div className="app-container" style={{ justifyContent: edge === 'left' ? 'flex-start' : 'flex-end' }} onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
      {!isExpanded ? (
        <div className={`collapsed-bar edge-${edge}`} style={{ backgroundColor: `rgba(30, 30, 40, ${opacity})` }} />
      ) : (
      <div className="sidebar" style={{ position: 'relative' }}>
        <div 
          className="drag-handle" 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ 
            top: yPos === 0 ? 'calc(50vh - 75px)' : yPos, 
            [edge === 'right' ? 'left' : 'right']: '4px' 
          }} 
        />
        <div className="header" style={{ padding: '10px 15px', display: 'flex', alignItems: 'center' }}>
          <img src="/logo-desk.png" alt="DeskWidget" style={{ height: '24px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; document.getElementById('fallback-logo-text').style.display = 'block'; }} />
          <h1 id="fallback-logo-text" style={{ display: 'none', margin: 0, fontSize: '1rem', fontWeight: 600 }}>DeskWidget</h1>
          <button className="icon-btn" onClick={openSettings} style={{ marginLeft: 'auto' }}>
            <Settings size={18} />
          </button>
        </div>

        {showTasks && (
        <div className="half-section">
          <div className="fixed-half-header">
            <span style={{color: '#e0c0aa'}}>📋 TAREFAS</span>
          </div>
          
          <div className="scrollable-content">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="pendingTasks">
                {(provided) => (
                  <div className="task-list" {...provided.droppableProps} ref={provided.innerRef}>
                    {pendingTasks.map((task, index) => (
                      <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                        {(provided) => (
                          <label 
                            className="task-item"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            <div {...provided.dragHandleProps} style={{ cursor: 'grab', color: 'var(--text-muted)' }}>
                              <GripVertical size={14} />
                            </div>
                            <input 
                              type="checkbox" 
                              className="task-checkbox" 
                              checked={false}
                              onChange={() => handleToggleTask(task.id, false)}
                            />
                            <span className="task-title" style={{ flex: 1 }}>{task.title}</span>
                          </label>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <div style={{ marginTop: '10px', marginBottom: '20px' }}>
              <input 
                type="text" 
                className="add-task-input" 
                placeholder="+ Adicionar tarefa rápida..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleAddTask}
              />
            </div>

            <div 
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
            >
              <span>CONCLUÍDAS ({completedTasks.length})</span>
              {isCompletedCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </div>
            
            {!isCompletedCollapsed && (
              <div className="task-list" style={{ opacity: 0.6 }}>
                {completedTasks.map(task => (
                  <label key={task.id} className="task-item">
                    <input 
                      type="checkbox" 
                      className="task-checkbox" 
                      checked={true}
                      onChange={() => handleToggleTask(task.id, true)}
                    />
                    <span className="task-title completed" style={{ flex: 1 }}>{task.title}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {formatCompletedDate(task.completedAt)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {showReminders && (
        <div className="half-section">
          <div className="fixed-half-header">
            <span style={{color: '#ffd166'}}>🔔 LEMBRETES</span>
            <a className="section-title-action" onClick={openHistory}>Ver Todos</a>
          </div>

          <div className="scrollable-content">
            <div className="form-group">
              <label className="form-label">MOTIVO</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="ex: Ligar para Cliente" 
                value={newReminderTitle}
                onChange={e => setNewReminderTitle(e.target.value)}
              />
            </div>
            <div className="row form-group">
              <div style={{flex: 1}}>
                <label className="form-label">DATA</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={newReminderDate}
                  onChange={e => setNewReminderDate(e.target.value)} 
                />
              </div>
              <div style={{flex: 1}}>
                <label className="form-label">HORA</label>
                <input 
                  type="time" 
                  className="form-control"
                  value={newReminderTime}
                  onChange={e => setNewReminderTime(e.target.value)} 
                />
              </div>
            </div>
            <button className="btn-primary" onClick={handleAddReminder} style={{ marginBottom: '20px' }}>
              <Bell size={16} /> Agendar Lembrete
            </button>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginBottom: '15px' }}>
              PRÓXIMOS
            </div>
            {nextReminders.map(r => (
              <div key={r.id} className="list-item" style={{ padding: '10px', marginBottom: '8px' }}>
                <div className="list-item-content">
                  <h4 style={{fontSize: '0.8rem', color: '#fff'}}>{r.title}</h4>
                  <p>{new Date(r.datetime).toLocaleString()}</p>
                </div>
                <Bell size={14} color="var(--text-muted)" style={{marginLeft: 'auto'}}/>
              </div>
            ))}
          </div>
        </div>
        )}

        <div className="footer" style={{ padding: '10px 20px', fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <span>DOCK EXPANDIDO • SINCRONIZADO HÁ 1M</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <span style={{width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block'}}></span>
            <span style={{width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'inline-block'}}></span>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

export default Widget;

/**
 * VOCABULÁRIO PADRÃO DO PROJETO:
 * - Painel Principal (ou Dashboard Principal): A janela expandida contendo tarefas e lembretes.
 * - Dock Lateral: A barrinha recolhida (transparente) que fica aguardando o cursor do mouse.
 * - Trilho de Movimento: A área total de arrasto vertical.
 * - Puxador: A pequena barra que o usuário clica e arrasta para mover a posição vertical.
 */
import React, { useState, useEffect } from 'react';
import { Settings, Plus, CheckCircle, Bell, ChevronDown, ChevronRight, GripVertical, Clock } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function Widget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const isHoveredRef = React.useRef(false);
  const isSettingsOpenRef = React.useRef(false);
  const isHistoryOpenRef = React.useRef(false);
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
    // Start interval to check for reminders every 10 seconds (more precise)
    const interval = setInterval(() => {
        checkReminders();
    }, 10000);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setNewReminderDate(`${year}-${month}-${day}`);
    setNewReminderTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);

    let removeListener;
    if (window.api?.onSettingsUpdated) {
      removeListener = window.api.onSettingsUpdated(() => {
        loadData();
      });
    }

    let removeOpenListener;
    if (window.api?.onSettingsOpened) {
      removeOpenListener = window.api.onSettingsOpened(() => {
        isSettingsOpenRef.current = true;
        setIsExpanded(true);
        window.api?.expandWindow();
      });
    }

    let removeCloseListener;
    if (window.api?.onSettingsClosed) {
      removeCloseListener = window.api.onSettingsClosed(() => {
        isSettingsOpenRef.current = false;
        if (!isHoveredRef.current && !isHistoryOpenRef.current) {
          const delay = settings.delay ? parseInt(settings.delay) : 1000;
          expandTimeout.current = setTimeout(() => {
            if (!isHoveredRef.current && !isHistoryOpenRef.current) {
              setIsExpanded(false);
              window.api?.collapseWindow();
            }
          }, delay);
        }
      });
    }

    let removeHistoryOpenListener;
    if (window.api?.onHistoryOpened) {
      removeHistoryOpenListener = window.api.onHistoryOpened(() => {
        isHistoryOpenRef.current = true;
        setIsExpanded(true);
        window.api?.expandWindow();
      });
    }

    let removeHistoryCloseListener;
    if (window.api?.onHistoryClosed) {
      removeHistoryCloseListener = window.api.onHistoryClosed(() => {
        isHistoryOpenRef.current = false;
        if (!isHoveredRef.current && !isSettingsOpenRef.current) {
          const delay = settings.delay ? parseInt(settings.delay) : 1000;
          expandTimeout.current = setTimeout(() => {
            if (!isHoveredRef.current && !isSettingsOpenRef.current) {
              setIsExpanded(false);
              window.api?.collapseWindow();
            }
          }, delay);
        }
      });
    }

    let removeForceExpand;
    if (window.api?.onForceExpand) {
      removeForceExpand = window.api.onForceExpand(() => {
        setIsExpanded(true);
        window.api?.expandWindow();
        
        if (!isHoveredRef.current && !isSettingsOpenRef.current && !isHistoryOpenRef.current) {
          if (expandTimeout.current) clearTimeout(expandTimeout.current);
          const delay = settings.delay ? parseInt(settings.delay) : 1000;
          expandTimeout.current = setTimeout(() => {
            if (!isHoveredRef.current && !isSettingsOpenRef.current && !isHistoryOpenRef.current) {
              setIsExpanded(false);
              window.api?.collapseWindow();
            }
          }, delay + 1500); // Dá um tempinho extra de 1.5s para o usuário mover o mouse até lá
        }
      });
    }



    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
        window.api?.collapseWindow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      if (removeListener) removeListener();
      if (removeOpenListener) removeOpenListener();
      if (removeCloseListener) removeCloseListener();
      if (removeHistoryOpenListener) removeHistoryOpenListener();
      if (removeHistoryCloseListener) removeHistoryCloseListener();
      if (removeForceExpand) removeForceExpand();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded, settings.delay]);
  
  const shownRemindersRef = React.useRef(new Set());
  
  const checkReminders = async () => {
      if (!window.api) return;
      const r = await window.api.getReminders();
      const now = new Date();
      let changed = false;
      
      for (const rem of r) {
          if (rem.status === 'agendado') {
              const remDate = new Date(rem.datetime);
              if (now >= remDate) {
                  // Se passou do horário em até 5 minutos, exibe o popup
                  if ((now - remDate) < 5 * 60000) {
                      if (!shownRemindersRef.current.has(rem.id)) {
                          window.api.showPopup(rem);
                          shownRemindersRef.current.add(rem.id);
                      }
                  } else {
                      // Passou de 5 minutos, marca como perdido
                      await window.api.updateReminder(rem.id, 'perdido');
                      changed = true;
                  }
              }
          }
      }
      if (changed) loadData();
  };

  const expandTimeout = React.useRef(null);
  const isDraggingRef = React.useRef(false);
  const dragStartMouseY = React.useRef(0);
  const dragStartMouseX = React.useRef(0);
  const dragStartYPos = React.useRef(0);
  const currentEdgeRef = React.useRef('right');
  const currentYPosRef = React.useRef(0);

  const handlePointerEnter = () => {
    isHoveredRef.current = true;
    if (expandTimeout.current) clearTimeout(expandTimeout.current);
    if (!isExpanded && !isDraggingRef.current) {
      setIsExpanded(true);
      window.api?.expandWindow();
    }
  };

  const handlePointerLeave = () => {
    isHoveredRef.current = false;
    if (isDraggingRef.current || isSettingsOpenRef.current || isHistoryOpenRef.current) return;
    const delay = settings.delay ? parseInt(settings.delay) : 1000;
    expandTimeout.current = setTimeout(() => {
      if (isExpanded && !isSettingsOpenRef.current && !isHistoryOpenRef.current) {
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
    if (newYPos < 52) newYPos = 52; // Limite superior ajustado (rail começa no 50px)
    if (newYPos > window.innerHeight - 192) newYPos = window.innerHeight - 192; // Limite inferior ajustado
    
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
    if (e.key === 'Enter' && newTaskTitle.trim() !== '') {
      if (window.api) {
        await window.api.addTask(newTaskTitle);
        setNewTaskTitle('');
        loadData();
      }
    }
  };

  const handleUpdateTaskTitle = async (id) => {
    if (editingTaskTitle.trim() !== '') {
      if (window.api) {
        await window.api.updateTaskTitle(id, editingTaskTitle);
        setEditingTaskId(null);
        setEditingTaskTitle('');
        loadData();
      }
    } else {
      setEditingTaskId(null);
      setEditingTaskTitle('');
    }
  };

  const handleToggleTask = async (id, currentStatus) => {
    await window.api?.toggleTask(id, !currentStatus);
    loadData();
  };

  const handleAddReminder = async () => {
    if (!newReminderTitle || !newReminderDate || !newReminderTime) return;
    const dt = new Date(`${newReminderDate}T${newReminderTime}`);
    if (dt < new Date()) {
      alert("Não é possível agendar um lembrete no passado.");
      return;
    }
    if (window.api) {
      await window.api.addReminder(newReminderTitle, dt.toISOString());
      setNewReminderTitle('');
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      setNewReminderDate(`${year}-${month}-${day}`);
      setNewReminderTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      
      loadData();
    }
  };

  const handleTestPopup = () => {
    if (window.api) {
      window.api.showPopup({
        id: 'test',
        title: 'Lembrete de Teste',
        datetime: new Date().toISOString()
      });
    }
  };


  const openSettings = () => {
    isSettingsOpenRef.current = true;
    window.api?.openSettings();
  };
  const openHistory = () => window.api?.openHistory();

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  
  const nextReminders = reminders
    .filter(r => r.status === 'agendado' && new Date(r.datetime) > new Date())
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
    .slice(0, 3);

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
  const expandedOpacity = settings.expandedOpacity ? parseInt(settings.expandedOpacity) / 100 : 1.0;

  return (
    <div className="app-container" style={{ justifyContent: edge === 'left' ? 'flex-start' : 'flex-end' }} onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
      {!isExpanded ? (
        <div className={`collapsed-bar edge-${edge}`} style={{ backgroundColor: `rgba(30, 30, 40, ${opacity})` }} />
      ) : (
      <div className="sidebar" style={{ 
        position: 'relative', 
        paddingRight: edge === 'right' ? '14px' : '0', 
        paddingLeft: edge === 'left' ? '14px' : '0',
        backgroundColor: `rgba(var(--bg-sidebar-rgb), ${expandedOpacity})`
      }}>
        {/* Trilho de arrasto dedicado */}
        <div 
          className="drag-rail"
          style={{
            position: 'absolute',
            top: '50px',
            bottom: '40px',
            [edge === 'right' ? 'right' : 'left']: '2px',
            width: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '5px',
            zIndex: 99
          }}
        />
        <div 
          className="drag-handle" 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ 
            top: yPos === 0 ? 'calc(50vh - 75px)' : yPos, 
            [edge === 'right' ? 'right' : 'left']: '4px',
            zIndex: 100
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
                          <div 
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
                            {editingTaskId === task.id ? (
                              <input
                                autoFocus
                                type="text"
                                className="add-task-input"
                                style={{ flex: 1, padding: '4px 8px', fontSize: '0.85rem' }}
                                value={editingTaskTitle}
                                onChange={(e) => setEditingTaskTitle(e.target.value)}
                                onBlur={() => handleUpdateTaskTitle(task.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateTaskTitle(task.id);
                                  if (e.key === 'Escape') {
                                    setEditingTaskId(null);
                                    setEditingTaskTitle('');
                                  }
                                }}
                              />
                            ) : (
                              <span 
                                className="task-title" 
                                style={{ flex: 1, cursor: 'text' }}
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditingTaskTitle(task.title);
                                }}
                              >
                                {task.title}
                              </span>
                            )}
                          </div>
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
                  <div key={task.id} className="task-item">
                    <input 
                      type="checkbox" 
                      className="task-checkbox" 
                      checked={true}
                      onChange={() => handleToggleTask(task.id, true)}
                    />
                    {editingTaskId === task.id ? (
                      <input
                        autoFocus
                        type="text"
                        className="add-task-input"
                        style={{ flex: 1, padding: '4px 8px', fontSize: '0.85rem' }}
                        value={editingTaskTitle}
                        onChange={(e) => setEditingTaskTitle(e.target.value)}
                        onBlur={() => handleUpdateTaskTitle(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateTaskTitle(task.id);
                          if (e.key === 'Escape') {
                            setEditingTaskId(null);
                            setEditingTaskTitle('');
                          }
                        }}
                      />
                    ) : (
                      <span 
                        className="task-title completed" 
                        style={{ flex: 1, cursor: 'text' }}
                        onClick={() => {
                          setEditingTaskId(task.id);
                          setEditingTaskTitle(task.title);
                        }}
                      >
                        {task.title}
                      </span>
                    )}
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {formatCompletedDate(task.completedAt)}
                    </span>
                  </div>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <a className="section-title-action" onClick={handleTestPopup}>Testar</a>
              <a className="section-title-action" onClick={openHistory}>Ver Todos</a>
            </div>
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
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={newReminderTime} 
                    onChange={e => setNewReminderTime(e.target.value)} 
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>
            
            {reminders.some(r => (r.status === 'agendado' || r.status === 'pausado') && r.datetime.startsWith(newReminderDate) && r.datetime.includes('T' + newReminderTime)) && (
              <div style={{ color: 'var(--danger)', fontSize: '0.7rem', marginBottom: '10px', marginTop: '-5px' }}>
                ⚠️ Já existe um lembrete nesse horário.
              </div>
            )}
            
            <button className="btn-primary" onClick={handleAddReminder} style={{ marginBottom: '20px' }}>
              <Bell size={16} /> Agendar Lembrete
            </button>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginBottom: '15px' }}>
              PRÓXIMOS
            </div>
            {nextReminders.map(r => (
              <div key={r.id} className="list-item" style={{ padding: '6px 10px', marginBottom: '6px', gap: '8px' }}>
                <div className="list-item-content">
                  <h4 style={{fontSize: '0.75rem', color: '#fff', marginBottom: '2px'}}>{r.title}</h4>
                  <p style={{fontSize: '0.65rem'}}>{new Date(r.datetime).toLocaleString()}</p>
                </div>
                <Bell size={12} color="var(--text-muted)" style={{marginLeft: 'auto'}}/>
              </div>
            ))}
          </div>
        </div>
        )}

        <div className="footer" style={{ padding: '10px 20px', fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', gap: '15px' }}>
            <span>📝 {tasks.filter(t => t.completed).length}/{tasks.length} concluídas</span>
            <span>🔔 {reminders.filter(r => r.status === 'agendado' || r.status === 'pausado').length} pendentes</span>
            {reminders.some(r => r.status === 'perdido') && (
              <span 
                className="pulse-error" 
                style={{ color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => { window.api?.showHistoryTab('historico') }} // Usaremos IPC para abrir focado
              >
                ⚠️ {reminders.filter(r => r.status === 'perdido').length} Falhas
              </span>
            )}
          </span>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '10px', alignItems: 'center' }}>
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

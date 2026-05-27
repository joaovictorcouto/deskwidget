/**
 * VOCABULÁRIO PADRÃO DO PROJETO:
 * - Painel Principal (ou Dashboard Principal): A janela expandida contendo tarefas e lembretes.
 * - Dock Lateral: A barrinha recolhida (transparente) que fica aguardando o cursor do mouse.
 * - Trilho de Movimento: A área total de arrasto vertical.
 * - Puxador: A pequena barra que o usuário clica e arrasta para mover a posição vertical.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Settings, CheckCircle, Bell, ChevronDown, ChevronRight, GripVertical, Clock, Tag, X, Sun, Moon, ArrowUp, AlignLeft } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CustomConfirm from './components/CustomConfirm';

function Widget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());
  const toggleTaskDetails = (taskId) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [reminderError, setReminderError] = useState('');
  const isHoveredRef = React.useRef(false);
  const isSettingsOpenRef = React.useRef(false);
  const isHistoryOpenRef = React.useRef(false);
  const isPopupOpenRef = React.useRef(false);
  const [edge, setEdge] = useState('right');
  const [yPos, setYPos] = useState(0);

  // Módulos Extras
  const [pomodoroStatus, setPomodoroStatus] = useState('idle'); // idle, running, paused, break
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(0);
  const [quickNote, setQuickNote] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [savedTags, setSavedTags] = useState([]);
  const [newReminderRecurrence, setNewReminderRecurrence] = useState('none');
  const [editingTag, setEditingTag] = useState(null);
  const [editingTagValue, setEditingTagValue] = useState('');
  const [taskSortOrder, setTaskSortOrder] = useState('custom');
  const tagMenuRef = useRef(null);
  const [editingTaskTagId, setEditingTaskTagId] = useState(null);
  const [selectedTaskTag, setSelectedTaskTag] = useState('');
  const [showTaskTagMenu, setShowTaskTagMenu] = useState(false);
  const taskTagMenuRef = useRef(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagInputVal, setNewTagInputVal] = useState('');
  const [newTaskTagInputVal, setNewTaskTagInputVal] = useState('');
  const [managerNewTagName, setManagerNewTagName] = useState('');
  const [managerNewTagColor, setManagerNewTagColor] = useState('hsl(263, 90%, 50%)');

  // Estado para CustomConfirm
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, message: '', onConfirm: null });

  // Estados de Atualização (Updater)
  const CURRENT_VERSION = '1.2.3.3';
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateUrl, setUpdateUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [readyToRestart, setReadyToRestart] = useState(false);
  const [showUpdatePanel, setShowUpdatePanel] = useState(false);
  const [ignoredVersion, setIgnoredVersion] = useState(localStorage.getItem('deskwidget_ignored_version') || '');

  const compareVersions = (v1, v2) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  };

  const performSilentAutoUpdate = async (url) => {
    if (!url) return;
    try {
      await window.api?.downloadUpdate(url);
      await window.api?.executeUpdate();
    } catch (err) {
      console.error('Erro na auto-atualização silenciosa:', err);
      if (window.api?.reportJsError) {
        window.api.reportJsError(
          `Erro na auto-atualização silenciosa: ${err?.message || String(err)}`,
          'Widget.jsx -> performSilentAutoUpdate'
        ).catch(console.error);
      }
    }
  };

  const checkUpdates = async (silent = true) => {
    try {
      const response = await fetch('https://api.github.com/repos/joaovictorcouto/deskwidget/releases/latest');
      if (!response.ok) return;
      const data = await response.json();
      const latestVer = data.tag_name.replace('v', '');
      
      const isNewer = compareVersions(latestVer, CURRENT_VERSION) > 0;
      if (isNewer) {
        setUpdateVersion(latestVer);
        setUpdateAvailable(true);
        
        let downloadUrl = '';
        const exeAsset = data.assets.find(asset => asset.name.endsWith('.exe') || asset.name.includes('setup'));
        if (exeAsset) {
          downloadUrl = exeAsset.browser_download_url;
        } else {
          downloadUrl = data.assets[0]?.browser_download_url || data.html_url;
        }
        setUpdateUrl(downloadUrl);
        
        const ignored = localStorage.getItem('deskwidget_ignored_version') || '';
        if (latestVer !== ignored) {
          if (silent) {
            performSilentAutoUpdate(downloadUrl);
          } else {
            setShowUpdatePanel(true);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao verificar atualizações:', err);
    }
  };

  const simulateUpdate = () => {
    setUpdateVersion('1.3.0');
    setUpdateAvailable(true);
    setUpdateUrl('https://raw.githubusercontent.com/joaovictorcouto/deskwidget/main/package.json');
    setShowUpdatePanel(true);
  };

  const startUpdate = async () => {
    if (!updateUrl) return;
    setIsDownloading(true);
    setDownloadPercent(0);

    if (updateVersion === '1.3.0') {
      let percent = 0;
      const interval = setInterval(() => {
        percent += 10;
        setDownloadPercent(percent);
        if (percent >= 100) {
          clearInterval(interval);
          setReadyToRestart(true);
          setIsDownloading(false);
          setTimeout(() => {
            setReadyToRestart(false);
            setUpdateAvailable(false);
            setShowUpdatePanel(false);
          }, 2500);
        }
      }, 300);
      return;
    }

    try {
      // Ouvir progresso do download via evento do backend
      let cleanupProgress = null;
      if (window.api?.onUpdateDownloadProgress) {
        cleanupProgress = window.api.onUpdateDownloadProgress((percent) => {
          setDownloadPercent(percent);
        });
      }

      // Download é feito inteiramente pelo backend Rust (sem CORS)
      await window.api.downloadUpdate(updateUrl);

      // Limpar listener de progresso
      if (cleanupProgress) cleanupProgress();

      setReadyToRestart(true);
      setIsDownloading(false);
      await window.api.executeUpdate();
    } catch (err) {
      console.error(err);
      setIsDownloading(false);
      alert('Erro ao baixar atualização: ' + err.message);
    }
  };

  const ignoreUpdate = () => {
    localStorage.setItem('deskwidget_ignored_version', updateVersion);
    setIgnoredVersion(updateVersion);
    setShowUpdatePanel(false);
  };

  const scheduleUpdate = () => {
    if (window.api) {
      window.api.showPopup({ 
        type: 'schedule-update', 
        id: 'schedule-update', 
        data: { version: updateVersion },
        height: 210 
      });
    }
    setShowUpdatePanel(false);
  };

  useEffect(() => {
    // Checagem silenciosa ao inicializar
    checkUpdates(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target)) {
        setShowTagMenu(false);
      }
    };
    if (showTagMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTagMenu]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (taskTagMenuRef.current && !taskTagMenuRef.current.contains(event.target)) {
        setShowTaskTagMenu(false);
        setEditingTaskTagId(null);
      }
    };
    if (showTaskTagMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTaskTagMenu]);

  const handleUpdateTaskTag = async (taskId, tagName) => {
    if (window.api) {
      const cleanTagName = tagName.trim();
      if (cleanTagName) {
        const tagColor = getTagColorWithSaved(cleanTagName);
        await window.api.updateSingleTaskTag(taskId, cleanTagName, tagColor);
        addTagToSaved(cleanTagName);
      } else {
        await window.api.updateSingleTaskTag(taskId, null, null);
      }
      setShowTaskTagMenu(false);
      setEditingTaskTagId(null);
      loadData();
    }
  };

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
      if (s.taskSortOrder) setTaskSortOrder(s.taskSortOrder);
      if (s.quickNote && quickNote === '') setQuickNote(s.quickNote);
      if (s.savedTags) {
        try {
          setSavedTags(JSON.parse(s.savedTags));
        } catch(e) {}
      }
      
      // Extrair tags das tarefas carregadas caso haja novas
      if (!isDeletingTagRef.current) {
        let hasNewTags = false;
        const currentSavedTags = s.savedTags ? JSON.parse(s.savedTags) : [];
        t.forEach(task => {
          if (task.tag && task.tag.trim() !== '') {
            const exists = currentSavedTags.some(tag => tag.name.toLowerCase() === task.tag.toLowerCase());
            if (!exists) {
              currentSavedTags.push({ name: task.tag, color: task.tagColor || getTagColor(task.tag) });
              hasNewTags = true;
            }
          }
        });
        if (hasNewTags) {
          window.api.updateSetting('savedTags', JSON.stringify(currentSavedTags));
          setSavedTags(currentSavedTags);
        }
      }
    }
  };

  const toggleTheme = async () => {
    const newTheme = settings.theme === 'claro' ? 'escuro' : 'claro';
    setSettings(prev => ({ ...prev, theme: newTheme }));
    if (window.api) {
      await window.api.updateSetting('theme', newTheme);
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

    let removeDataListener;
    if (window.api?.onDataUpdated) {
      removeDataListener = window.api.onDataUpdated(() => {
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

    let removePreviewListener;
    if (window.api?.onPreviewAppearance) {
      removePreviewListener = window.api.onPreviewAppearance((preview) => {
        setSettings(prev => ({ ...prev, ...preview }));
      });
    }

    let removePopupOpenListener;
    if (window.api?.onPopupOpened) {
      removePopupOpenListener = window.api.onPopupOpened((id) => {
        if (id === 'schedule-update') {
          isPopupOpenRef.current = true;
          setIsExpanded(true);
          window.api?.expandWindow();
        }
      });
    }

    let removePopupCloseListener;
    if (window.api?.onPopupClosed) {
      removePopupCloseListener = window.api.onPopupClosed((id) => {
        if (id === 'schedule-update') {
          isPopupOpenRef.current = false;
          if (!isHoveredRef.current && !isSettingsOpenRef.current && !isHistoryOpenRef.current) {
            const delay = settings.delay ? parseInt(settings.delay) : 1000;
            expandTimeout.current = setTimeout(() => {
              if (!isHoveredRef.current && !isSettingsOpenRef.current && !isHistoryOpenRef.current) {
                setIsExpanded(false);
                window.api?.collapseWindow();
              }
            }, delay);
          }
        }
      });
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmConfig.isOpen) {
          setConfirmConfig({ isOpen: false, message: '', onConfirm: null });
          return;
        }
        if (showTagManager) {
          setShowTagManager(false);
          return;
        }
        if (showTagMenu) {
          setShowTagMenu(false);
          return;
        }
        if (showTaskTagMenu) {
          setShowTaskTagMenu(false);
          setEditingTaskTagId(null);
          return;
        }
        setIsExpanded(false);
        window.api?.collapseWindow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      if (removeListener) removeListener();
      if (removeDataListener) removeDataListener();
      if (removeOpenListener) removeOpenListener();
      if (removeCloseListener) removeCloseListener();
      if (removeHistoryOpenListener) removeHistoryOpenListener();
      if (removeHistoryCloseListener) removeHistoryCloseListener();
      if (removePopupOpenListener) removePopupOpenListener();
      if (removePopupCloseListener) removePopupCloseListener();
      if (removeForceExpand) removeForceExpand();
      if (removePreviewListener) removePreviewListener();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded, settings.delay, confirmConfig.isOpen, showTagManager, showTagMenu, showTaskTagMenu]);
  
  useEffect(() => {
    let interval = null;
    if (pomodoroStatus === 'running' || pomodoroStatus === 'break') {
      interval = setInterval(() => {
        setPomodoroTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pomodoroStatus]);

  useEffect(() => {
    if (pomodoroTimeLeft === 0) {
      if (pomodoroStatus === 'running') {
        setPomodoroStatus('break');
        if (window.api) window.api.showPopup({ type: 'pomodoro', id: 'pomodoro-break', autoClose: 3000, title: 'Iniciando descanso...', status: 'break', height: 160 });
        setPomodoroTimeLeft((parseInt(settings.pomodoroBreak) || 5) * 60);
      } else if (pomodoroStatus === 'break') {
        setPomodoroStatus('idle');
        if (window.api) window.api.showPopup({ type: 'pomodoro', id: 'pomodoro-idle', autoClose: 10000, title: 'Descanso finalizado', status: 'idle', height: 160 });
        setPomodoroTimeLeft((parseInt(settings.pomodoroFocus) || 25) * 60);
      }
    }
  }, [pomodoroTimeLeft, pomodoroStatus, settings]);

  useEffect(() => {
    if (window.api && window.api.onPomodoroAction) {
      return window.api.onPomodoroAction((action) => {
        if (action === 'stop') {
          setPomodoroStatus('idle');
          setPomodoroTimeLeft((parseInt(settings.pomodoroFocus) || 25) * 60);
        } else if (action === 'start-focus') {
          setPomodoroStatus('running');
          setPomodoroTimeLeft((parseInt(settings.pomodoroFocus) || 25) * 60);
        }
      });
    }
  }, [settings]);

  const handlePomodoroToggle = () => {
    if (pomodoroStatus === 'idle') {
      setPomodoroTimeLeft(parseInt(settings.pomodoroFocus || '25') * 60);
      setPomodoroStatus('running');
    } else if (pomodoroStatus === 'running') {
      setPomodoroStatus('paused');
    } else if (pomodoroStatus === 'paused') {
      setPomodoroStatus('running');
    } else {
      setPomodoroStatus('idle');
    }
  };

  const handlePomodoroBreak = () => {
    setPomodoroTimeLeft(parseInt(settings.pomodoroBreak || '5') * 60);
    setPomodoroStatus('break');
  };

  const resetPomodoro = () => setPomodoroStatus('idle');

  const formatPomodoroTime = (seconds) => {
    if (seconds <= 0 && pomodoroStatus !== 'idle') return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  
  const shownRemindersRef = React.useRef(new Set());
  const isDeletingTagRef = React.useRef(false);
  
  const checkReminders = async () => {
      if (!window.api) return;
      const r = await window.api.getReminders();
      const now = new Date();
      let changed = false;
      
      for (const rem of r) {
          if (rem.status === 'agendado') {
              const remDate = new Date(rem.datetime);
              if (now < remDate) {
                  shownRemindersRef.current.delete(rem.id);
              }
              if (now >= remDate) {
                  // Se for o lembrete de atualização agendada, roda silenciosamente!
                  if (rem.title === '🔄 Atualização Automática Agendada') {
                      await window.api.updateReminder(rem.id, 'concluido');
                      startUpdate();
                      changed = true;
                      continue;
                  }
                  
                  if (shownRemindersRef.current.has(rem.id)) {
                      // Já está sendo exibido na tela, não expira nem faz nada
                      continue;
                  }
                  
                  // Se passou do horário em até 5 minutos, exibe o popup
                  if ((now - remDate) < 5 * 60000) {
                      window.api.showPopup({ type: 'reminder', id: `rem-${rem.id}`, data: rem, height: 210 });
                      shownRemindersRef.current.add(rem.id);
                  } else {
                      // Passou de 5 minutos e não foi exibido, marca como perdido
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
    if (isDraggingRef.current || isSettingsOpenRef.current || isHistoryOpenRef.current || isPopupOpenRef.current) return;
    const delay = settings.delay ? parseInt(settings.delay) : 1000;
    expandTimeout.current = setTimeout(() => {
      if (isExpanded && !isSettingsOpenRef.current && !isHistoryOpenRef.current && !isPopupOpenRef.current) {
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

  const getTagColor = (tag) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash * 137.508) % 360;
    return `hsl(${hue}, 80%, 45%)`;
  };

  const getTagColorWithSaved = (tagName) => {
    if (!tagName) return 'var(--text-muted)';
    const saved = savedTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    if (saved) return saved.color;
    return getTagColor(tagName);
  };

  const addTagToSaved = (tagName) => {
    const exists = savedTags.some(t => t.name.toLowerCase() === tagName.toLowerCase());
    if (!exists && window.api) {
      const newTag = { name: tagName, color: getTagColor(tagName) };
      const newSavedTags = [...savedTags, newTag];
      setSavedTags(newSavedTags);
      window.api.updateSetting('savedTags', JSON.stringify(newSavedTags));
    }
  };

  const handleAddTask = async (e) => {
    if (e.key === 'Enter' && newTaskTitle.trim() !== '') {
      if (window.api) {
        await window.api.addTask(newTaskTitle, selectedTag || null, selectedTag ? getTagColorWithSaved(selectedTag) : null);
        if (selectedTag) addTagToSaved(selectedTag);
        setNewTaskTitle('');
        setSelectedTag('');
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

  const handleDeleteTask = async (id) => {
    if (window.api) {
      await window.api.deleteTask(id);
      loadData();
    }
  };

  const handleUpdateTaskDetails = async (id, details) => {
    if (window.api) {
      await window.api.updateTaskDetails(id, details || null);
      loadData();
    }
  };

  const handleDeleteTag = async (tagName) => {
    setConfirmConfig({
      isOpen: true,
      message: "Ao excluir esta etiqueta, todas as tarefas vinculadas ficarão sem etiqueta.",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false, message: '', onConfirm: null });
        isDeletingTagRef.current = true;
        try {
          const newTags = savedTags.filter(t => t.name !== tagName);
          setSavedTags(newTags);
          if (window.api) {
            await window.api.updateSetting('savedTags', JSON.stringify(newTags));
            await window.api.updateTaskTag(tagName, null, null);
            await loadData();
          }
          if (selectedTag === tagName) setSelectedTag('');
        } catch (err) {
          console.error("Erro ao excluir tag:", err);
        } finally {
          isDeletingTagRef.current = false;
        }
      },
      onCancel: () => setConfirmConfig({ isOpen: false, message: '', onConfirm: null })
    });
  };

  const handleSaveTagEdit = async () => {
    if (!editingTagValue.trim()) {
      setEditingTag(null);
      return;
    }
    const newName = editingTagValue.trim();
    if (newName !== editingTag) {
      const newColor = getTagColorWithSaved(newName);
      const newTags = savedTags.map(t => t.name === editingTag ? { name: newName, color: newColor } : t);
      setSavedTags(newTags);
      if (window.api) {
        window.api.updateSetting('savedTags', JSON.stringify(newTags));
        await window.api.updateTaskTag(editingTag, newName, newColor);
        loadData();
      }
      if (selectedTag === editingTag) setSelectedTag(newName);
    }
    setEditingTag(null);
  };

  const handleRenameTagInManager = async (oldName, newName) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedNew === oldName) return;

    const exists = savedTags.some(t => t.name.toLowerCase() === trimmedNew.toLowerCase());
    if (exists) {
      alert("Uma etiqueta com este nome já existe.");
      return;
    }

    const tagToUpdate = savedTags.find(t => t.name === oldName);
    if (!tagToUpdate) return;

    const newColor = tagToUpdate.color;
    const newTags = savedTags.map(t => t.name === oldName ? { name: trimmedNew, color: newColor } : t);
    setSavedTags(newTags);
    
    if (window.api) {
      await window.api.updateSetting('savedTags', JSON.stringify(newTags));
      await window.api.updateTaskTag(oldName, trimmedNew, newColor);
      await loadData();
    }
    if (selectedTag === oldName) setSelectedTag(trimmedNew);
  };

  const handleColorChangeInManager = async (tagName, newColor) => {
    const newTags = savedTags.map(t => t.name === tagName ? { name: tagName, color: newColor } : t);
    setSavedTags(newTags);

    if (window.api) {
      await window.api.updateSetting('savedTags', JSON.stringify(newTags));
      await window.api.updateTaskTag(tagName, tagName, newColor);
      await loadData();
    }
  };

  const handleCreateTagInManager = async () => {
    const trimmed = managerNewTagName.trim();
    if (!trimmed) return;

    const exists = savedTags.some(t => t.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      alert("Uma etiqueta com este nome já existe.");
      return;
    }

    const newTag = { name: trimmed, color: managerNewTagColor };
    const newSavedTags = [...savedTags, newTag];
    setSavedTags(newSavedTags);

    if (window.api) {
      await window.api.updateSetting('savedTags', JSON.stringify(newSavedTags));
      await loadData();
    }
    setManagerNewTagName('');
  };

  const moveTag = async (index, direction) => {
    const newTags = [...savedTags];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTags.length) return;

    const temp = newTags[index];
    newTags[index] = newTags[targetIndex];
    newTags[targetIndex] = temp;

    setSavedTags(newTags);
    if (window.api) {
      await window.api.updateSetting('savedTags', JSON.stringify(newTags));
      await loadData();
    }
  };

  const handleAddReminder = async () => {
    setReminderError('');
    if (!newReminderTitle) {
      setReminderError('Por favor, informe o título do lembrete.');
      return;
    }
    if (!newReminderDate || !newReminderTime) {
      setReminderError('Por favor, defina a data e a hora.');
      return;
    }
    const dt = new Date(`${newReminderDate}T${newReminderTime}`);
    if (dt < new Date()) {
      setReminderError('Não é possível agendar um lembrete no passado.');
      return;
    }
    if (window.api) {
      await window.api.addReminder(newReminderTitle, dt.toISOString(), newReminderRecurrence);
      setNewReminderTitle('');
      setNewReminderRecurrence('none');
      setReminderError('');
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      setNewReminderDate(`${year}-${month}-${day}`);
      setNewReminderTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      
      loadData();
    }
  };


  const openSettings = () => {
    isSettingsOpenRef.current = true;
    window.api?.openSettings();
  };
  const openHistory = () => window.api?.openHistory();

  const getSortedPendingTasks = () => {
    let pt = tasks.filter(t => !t.completed);
    switch (taskSortOrder) {
      case 'newest_top':
        return pt.sort((a, b) => b.id - a.id);
      case 'newest_bottom':
        return pt.sort((a, b) => a.id - b.id);
      case 'az':
        return pt.sort((a, b) => a.title.localeCompare(b.title));
      case 'za':
        return pt.sort((a, b) => b.title.localeCompare(a.title));
      case 'custom':
      default:
        return pt.sort((a, b) => a.position - b.position);
    }
  };

  const pendingTasks = getSortedPendingTasks();
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
    
    if (taskSortOrder !== 'custom') {
      setTaskSortOrder('custom');
      if (window.api) await window.api.updateSetting('taskSortOrder', 'custom');
    }

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
  
  const todayStr = new Date().toDateString();
  const todaysTasks = tasks.filter(t => !t.completed || new Date(t.completedAt).toDateString() === todayStr);
  const todaysCompletedCount = todaysTasks.filter(t => t.completed).length;

  return (
    <div className="app-container" style={{ justifyContent: (!isExpanded || edge === 'left') ? 'flex-start' : 'flex-end' }} onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
      {!isExpanded ? (
        <div className={`collapsed-bar edge-${edge}`} style={{ backgroundColor: `rgba(30, 30, 40, ${opacity})` }} />
      ) : (
      <div className="sidebar" style={{ 
        position: 'relative', 
        backgroundColor: `rgba(var(--bg-sidebar-rgb), ${expandedOpacity})`,
        paddingRight: edge === 'right' ? '14px' : '0',
        paddingLeft: edge === 'left' ? '14px' : '0'
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
          <img 
            src={settings.theme === 'claro' ? './logo-desk-dark.png' : './logo-desk-light.png'} 
            alt="DeskWidget" 
            style={{ height: '24px', objectFit: 'contain', cursor: 'pointer' }} 
            onDoubleClick={simulateUpdate}
            onError={(e) => { 
              if (e.target.src.includes('logo-desk-dark.png') || e.target.src.includes('logo-desk-light.png')) {
                e.target.src = './logo-desk.png';
              } else {
                e.target.style.display = 'none'; 
                document.getElementById('fallback-logo-text').style.display = 'block'; 
              }
            }} 
          />
          <h1 id="fallback-logo-text" style={{ display: 'none', margin: 0, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }} onDoubleClick={simulateUpdate}>DeskWidget</h1>
          <button className="icon-btn" onClick={toggleTheme} style={{ marginLeft: 'auto', marginRight: '8px' }}>
            {settings.theme === 'claro' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="icon-btn" onClick={openSettings}>
            <Settings size={18} />
          </button>
        </div>

        {settings.enableProgressBar === 'true' && (
          <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div style={{ 
              height: '100%', 
              backgroundColor: 'var(--success)', 
              width: `${todaysTasks.length > 0 ? (todaysCompletedCount / todaysTasks.length) * 100 : 0}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}

        {settings.enablePomodoro === 'true' && (
          <div style={{ padding: '15px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '10px', left: '15px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1px', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M12 2c-.5 2.5-2.5 3.5-4 4M12 2c.5 2.5 2.5 3.5 4 4M12 2v5" />
                <path d="M12 7c-4.5 0-8 3-8 7.5S7.5 22 12 22s8-3 8-7.5S16.5 7 12 7z" />
              </svg>
              <span>POMODORO</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', fontFamily: 'monospace', color: pomodoroStatus === 'break' ? 'var(--success)' : 'var(--primary)', marginTop: '10px' }}>
              {pomodoroStatus === 'idle' ? `${String(settings.pomodoroFocus || 25).padStart(2, '0')}:00` : formatPomodoroTime(pomodoroTimeLeft)}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handlePomodoroToggle}>
                {pomodoroStatus === 'idle' ? 'Iniciar Foco' : pomodoroStatus === 'running' ? 'Pausar' : pomodoroStatus === 'paused' ? 'Continuar' : 'Fim da Pausa'}
              </button>
              {(pomodoroStatus === 'running' || pomodoroStatus === 'paused') && (
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handlePomodoroBreak}>
                  Descanso
                </button>
              )}
              {pomodoroStatus !== 'idle' && (
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--danger)' }} onClick={resetPomodoro}>
                  Parar
                </button>
              )}
            </div>
          </div>
        )}

        {showTasks && (
        <div className="half-section">
          <div className="fixed-half-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={12} style={{ flexShrink: 0 }} />
              <span>TAREFAS</span>
            </span>
            <select 
               style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', outline: 'none', cursor: 'pointer' }}
               value={taskSortOrder}
               onChange={(e) => {
                 const v = e.target.value;
                 setTaskSortOrder(v);
                 if (window.api) window.api.updateSetting('taskSortOrder', v);
               }}
            >
               <option value="custom" style={{ color: '#000' }}>Personalizada (Drag)</option>
               <option value="newest_bottom" style={{ color: '#000' }}>Novas embaixo</option>
               <option value="newest_top" style={{ color: '#000' }}>Novas em cima</option>
               <option value="az" style={{ color: '#000' }}>Ordem Alfabética (A-Z)</option>
               <option value="za" style={{ color: '#000' }}>Ordem Alfabética (Z-A)</option>
            </select>
          </div>

          <div style={{ padding: '10px 15px 5px 15px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input 
                  type="text" 
                  className="add-task-input" 
                  placeholder="+ Adicionar tarefa rápida..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={handleAddTask}
                  style={{ paddingRight: settings.enableTags === 'true' ? '30px' : '10px' }}
                />
                {settings.enableTags === 'true' && (
                  <div 
                    ref={tagMenuRef}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: selectedTag ? getTagColorWithSaved(selectedTag) : 'var(--text-muted)' }}
                    onClick={() => setShowTagMenu(!showTagMenu)}
                  >
                    <Tag size={16} />
                    {showTagMenu && (
                      <div style={{ position: 'absolute', right: 0, top: '25px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', zIndex: 100, width: '200px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          ESCOLHA UMA TAG
                          <span style={{ cursor: 'pointer', padding: '2px 5px' }} onClick={() => setShowTagMenu(false)}>✕</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                          <span 
                            style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border)', backgroundColor: !selectedTag ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                            onClick={() => { setSelectedTag(''); setShowTagMenu(false); }}
                          >Nenhuma</span>
                          {[...savedTags].sort((a,b) => a.name.localeCompare(b.name)).map(tag => (
                            editingTag === tag.name ? (
                              <input
                                key={`edit-${tag.name}`}
                                autoFocus
                                value={editingTagValue}
                                onChange={e => setEditingTagValue(e.target.value)}
                                onBlur={handleSaveTagEdit}
                                onKeyDown={e => e.key === 'Enter' && handleSaveTagEdit()}
                                style={{ fontSize: '0.7rem', padding: '2px 4px', width: '70px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)', color: '#fff' }}
                              />
                            ) : (
                              <span 
                                key={tag.name}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '12px', cursor: 'pointer', backgroundColor: tag.color, color: '#fff', opacity: selectedTag === tag.name ? 1 : 0.6 }}
                                onContextMenu={(e) => { e.preventDefault(); setEditingTag(tag.name); setEditingTagValue(tag.name); }}
                              >
                                <span 
                                  onClick={() => { setSelectedTag(tag.name); setShowTagMenu(false); }}
                                >
                                  {tag.name}
                                </span>
                                <span style={{ fontSize: '0.6rem', padding: '0 2px', opacity: 0.7 }} onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag.name); }}>✕</span>
                              </span>
                            )
                          ))}
                        </div>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ fontSize: '0.75rem', padding: '4px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                          placeholder="Nova tag..."
                          value={newTagInputVal}
                          onChange={(e) => setNewTagInputVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const cleanVal = newTagInputVal.trim();
                              if (cleanVal) {
                                addTagToSaved(cleanVal);
                                setSelectedTag(cleanVal);
                              }
                              setNewTagInputVal('');
                              setShowTagMenu(false);
                            }
                          }}
                        />
                        <div 
                          onClick={() => { setShowTagMenu(false); setShowTagManager(true); }}
                          style={{ 
                            marginTop: '8px', 
                            paddingTop: '6px', 
                            borderTop: '1px solid var(--border)', 
                            textAlign: 'center', 
                            fontSize: '0.7rem', 
                            color: 'var(--primary)', 
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Settings size={10} /> Gerenciar Etiquetas
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="scrollable-content">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="pendingTasks">
                {(provided) => (
                  <div className="task-list" {...provided.droppableProps} ref={provided.innerRef} style={{ paddingTop: '25px' }}>
                    {pendingTasks.map((task, index) => (
                      <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                        {(provided) => (
                          <div 
                            className="task-item"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{ ...provided.draggableProps.style, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '12px' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
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
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                  <span 
                                    className="task-title" 
                                    style={{ cursor: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                    onClick={() => {
                                      setEditingTaskId(task.id);
                                      setEditingTaskTitle(task.title);
                                    }}
                                  >
                                    {task.title}
                                  </span>
                                  {settings.enableTags === 'true' && task.tag && (
                                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: task.tagColor, color: '#fff', fontWeight: 600, flexShrink: 0 }}>
                                      {task.tag}
                                    </span>
                                  )}
                                </div>
                              )}
                              {settings.enableTags === 'true' && (
                                <span 
                                  className={`task-tag-trigger ${editingTaskTagId === task.id ? 'active' : ''}`}
                                  style={{ cursor: 'pointer', color: task.tag ? task.tagColor : 'var(--text-muted)', marginLeft: '4px', display: 'flex', alignItems: 'center', position: 'relative' }} 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTaskTagId(task.id);
                                    setSelectedTaskTag(task.tag || '');
                                    setShowTaskTagMenu(true);
                                  }}
                                  title={task.tag ? `Mudar etiqueta: ${task.tag}` : "Adicionar etiqueta"}
                                >
                                  <Tag size={12} />
                                  {editingTaskTagId === task.id && showTaskTagMenu && (
                                    <div 
                                      ref={taskTagMenuRef}
                                      style={{ 
                                        position: 'absolute', 
                                        right: '20px', 
                                        top: '15px', 
                                        backgroundColor: 'var(--bg-main)', 
                                        border: '1px solid var(--border)', 
                                        borderRadius: '8px', 
                                        padding: '10px', 
                                        zIndex: 1000, 
                                        width: '200px', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)', 
                                        cursor: 'default',
                                        textAlign: 'left'
                                      }} 
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        ETIQUETA DA TAREFA
                                        <span style={{ cursor: 'pointer', padding: '2px 5px' }} onClick={() => { setShowTaskTagMenu(false); setEditingTaskTagId(null); }}>✕</span>
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                                        <span 
                                          style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border)', backgroundColor: !selectedTaskTag ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'var(--text-main)' }}
                                          onClick={() => handleUpdateTaskTag(task.id, '')}
                                        >Nenhuma</span>
                                        {savedTags.map(tag => (
                                          <span 
                                            key={tag.name}
                                            style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '12px', cursor: 'pointer', backgroundColor: tag.color, color: '#fff', opacity: selectedTaskTag === tag.name ? 1 : 0.6 }}
                                            onClick={() => handleUpdateTaskTag(task.id, tag.name)}
                                          >
                                            {tag.name}
                                          </span>
                                        ))}
                                      </div>
                                      <input 
                                        type="text" 
                                        className="form-control" 
                                        style={{ fontSize: '0.75rem', padding: '4px', height: '24px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                                        placeholder="Nova tag..."
                                        value={newTaskTagInputVal}
                                        onChange={(e) => setNewTaskTagInputVal(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            const cleanVal = newTaskTagInputVal.trim();
                                            if (cleanVal) {
                                              handleUpdateTaskTag(task.id, cleanVal);
                                            }
                                            setNewTaskTagInputVal('');
                                            setShowTaskTagMenu(false);
                                          }
                                        }}
                                      />
                                      <div 
                                        onClick={() => { setShowTaskTagMenu(false); setEditingTaskTagId(null); setShowTagManager(true); }}
                                        style={{ 
                                          marginTop: '8px', 
                                          paddingTop: '6px', 
                                          borderTop: '1px solid var(--border)', 
                                          textAlign: 'center', 
                                          fontSize: '0.7rem', 
                                          color: 'var(--primary)', 
                                          cursor: 'pointer',
                                          fontWeight: 'bold',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        <Settings size={10} /> Gerenciar Etiquetas
                                      </div>
                                    </div>
                                  )}
                                </span>
                              )}
                              
                              <span 
                                style={{ cursor: 'pointer', color: task.details ? 'var(--primary)' : 'var(--text-muted)', marginLeft: '4px', display: 'flex', alignItems: 'center' }} 
                                onClick={(e) => { e.stopPropagation(); toggleTaskDetails(task.id); }}
                                title="Detalhes da tarefa"
                              >
                                <AlignLeft size={14} />
                              </span>

                              <span style={{ cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '4px' }} onClick={() => handleDeleteTask(task.id)}>
                                <X size={14} />
                              </span>
                            </div>

                            {expandedTaskIds.has(task.id) && (
                              <div style={{ paddingLeft: '26px', paddingRight: '10px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                                <textarea
                                  className="form-control"
                                  style={{
                                    width: '100%',
                                    minHeight: '60px',
                                    fontSize: '0.78rem',
                                    padding: '6px 8px',
                                    backgroundColor: 'rgba(var(--bg-sidebar-rgb), 0.4)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-main)',
                                    resize: 'vertical',
                                    borderRadius: '6px',
                                    outline: 'none',
                                    fontFamily: 'inherit'
                                  }}
                                  placeholder="Adicionar detalhes da tarefa..."
                                  defaultValue={task.details || ''}
                                  onBlur={(e) => handleUpdateTaskDetails(task.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                      e.target.blur();
                                    }
                                  }}
                                />
                              </div>
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
                  <div 
                    key={task.id} 
                    className="task-item"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '12px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
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
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span 
                            className="task-title completed" 
                            style={{ cursor: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            onClick={() => {
                              setEditingTaskId(task.id);
                              setEditingTaskTitle(task.title);
                            }}
                          >
                            {task.title}
                          </span>
                          {settings.enableTags === 'true' && task.tag && (
                            <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: task.tagColor, color: '#fff', fontWeight: 600, flexShrink: 0, opacity: 0.7 }}>
                              {task.tag}
                            </span>
                          )}
                        </div>
                      )}
                      {settings.enableTags === 'true' && (
                        <span 
                          style={{ cursor: 'pointer', color: task.tag ? task.tagColor : 'var(--text-muted)', marginLeft: '4px', display: 'flex', alignItems: 'center', position: 'relative' }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTaskTagId(task.id);
                            setSelectedTaskTag(task.tag || '');
                            setShowTaskTagMenu(true);
                          }}
                          title={task.tag ? `Mudar etiqueta: ${task.tag}` : "Adicionar etiqueta"}
                        >
                          <Tag size={12} />
                          {editingTaskTagId === task.id && showTaskTagMenu && (
                            <div 
                              ref={taskTagMenuRef}
                              style={{ 
                                position: 'absolute', 
                                right: '20px', 
                                top: '15px', 
                                backgroundColor: 'var(--bg-main)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '8px', 
                                padding: '10px', 
                                zIndex: 1000, 
                                width: '200px', 
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)', 
                                cursor: 'default',
                                textAlign: 'left'
                              }} 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                ETIQUETA DA TAREFA
                                <span style={{ cursor: 'pointer', padding: '2px 5px' }} onClick={() => { setShowTaskTagMenu(false); setEditingTaskTagId(null); }}>✕</span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                                <span 
                                  style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border)', backgroundColor: !selectedTaskTag ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'var(--text-main)' }}
                                  onClick={() => handleUpdateTaskTag(task.id, '')}
                                >Nenhuma</span>
                                {savedTags.map(tag => (
                                  <span 
                                    key={tag.name}
                                    style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '12px', cursor: 'pointer', backgroundColor: tag.color, color: '#fff', opacity: selectedTaskTag === tag.name ? 1 : 0.6 }}
                                    onClick={() => handleUpdateTaskTag(task.id, tag.name)}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ fontSize: '0.75rem', padding: '4px', height: '24px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                                placeholder="Nova tag..."
                                value={newTaskTagInputVal}
                                onChange={(e) => setNewTaskTagInputVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const cleanVal = newTaskTagInputVal.trim();
                                    if (cleanVal) {
                                      handleUpdateTaskTag(task.id, cleanVal);
                                    }
                                    setNewTaskTagInputVal('');
                                    setShowTaskTagMenu(false);
                                  }
                                }}
                              />
                              <div 
                                onClick={() => { setShowTaskTagMenu(false); setEditingTaskTagId(null); setShowTagManager(true); }}
                                style={{ 
                                  marginTop: '8px', 
                                  paddingTop: '6px', 
                                  borderTop: '1px solid var(--border)', 
                                  textAlign: 'center', 
                                  fontSize: '0.7rem', 
                                  color: 'var(--primary)', 
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Settings size={10} /> Gerenciar Etiquetas
                              </div>
                            </div>
                          )}
                        </span>
                      )}
                      <span 
                        style={{ cursor: 'pointer', color: task.details ? 'var(--primary)' : 'var(--text-muted)', marginLeft: '4px', display: 'flex', alignItems: 'center' }} 
                        onClick={(e) => { e.stopPropagation(); toggleTaskDetails(task.id); }}
                        title="Detalhes da tarefa"
                      >
                        <AlignLeft size={14} />
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {formatCompletedDate(task.completedAt)}
                      </span>
                      <span style={{ cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '4px' }} onClick={() => handleDeleteTask(task.id)}>
                        <X size={14} />
                      </span>
                    </div>

                    {expandedTaskIds.has(task.id) && (
                      <div style={{ paddingLeft: '26px', paddingRight: '10px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                        <textarea
                          className="form-control"
                          style={{
                            width: '100%',
                            minHeight: '60px',
                            fontSize: '0.78rem',
                            padding: '6px 8px',
                            backgroundColor: 'rgba(var(--bg-sidebar-rgb), 0.4)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-main)',
                            resize: 'vertical',
                            borderRadius: '6px',
                            outline: 'none',
                            fontFamily: 'inherit'
                          }}
                          placeholder="Adicionar detalhes da tarefa..."
                          defaultValue={task.details || ''}
                          onBlur={(e) => handleUpdateTaskDetails(task.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              e.target.blur();
                            }
                          }}
                        />
                      </div>
                    )}
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
            <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1px', color: '#ffb84d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={12} style={{ flexShrink: 0 }} />
              <span>LEMBRETES</span>
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
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
                onChange={e => { setNewReminderTitle(e.target.value); setReminderError(''); }}
              />
            </div>
            <div className="row form-group">
              <div style={{flex: 1}}>
                <label className="form-label">DATA</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={newReminderDate}
                  onChange={e => { setNewReminderDate(e.target.value); setReminderError(''); }} 
                />
              </div>
              <div style={{flex: 1}}>
                <label className="form-label">HORA</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={newReminderTime} 
                    onChange={e => { setNewReminderTime(e.target.value); setReminderError(''); }} 
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">RECORRÊNCIA</label>
              <select 
                className="form-control"
                value={newReminderRecurrence}
                onChange={e => { setNewReminderRecurrence(e.target.value); setReminderError(''); }}
              >
                <option value="none">Não repetir (Único)</option>
                <option value="daily">Diariamente</option>
                <option value="weekly">Semanalmente</option>
                <option value="monthly">Mensalmente</option>
                <option value="yearly">Anualmente</option>
              </select>
            </div>
            
            {reminders.some(r => (r.status === 'agendado' || r.status === 'pausado') && r.datetime.startsWith(newReminderDate) && r.datetime.includes('T' + newReminderTime)) && (
              <div style={{ color: 'var(--danger)', fontSize: '0.7rem', marginBottom: '10px', marginTop: '-5px' }}>
                ⚠️ Já existe um lembrete nesse horário.
              </div>
            )}

            {reminderError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.7rem', marginBottom: '10px', marginTop: '-5px' }}>
                ⚠️ {reminderError}
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

        {settings.enableNotes === 'true' && (
          <div className="half-section" style={{ flex: 'none', height: '180px' }}>
            <div className="fixed-half-header">
              <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1px', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>NOTAS RÁPIDAS</span>
              </span>
            </div>
            <div className="scrollable-content" style={{ paddingBottom: '10px', overflow: 'hidden' }}>
              <textarea 
                className="form-control"
                style={{ height: '100%', resize: 'none', backgroundColor: 'var(--bg-main)', overflow: quickNote ? 'auto' : 'hidden' }}
                placeholder="Escreva algo aqui... salvo automaticamente."
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                onBlur={() => {
                  if (window.api) window.api.updateSetting('quickNote', quickNote);
                }}
              />
            </div>
          </div>
        )}

        {showUpdatePanel ? (
          <div className="updater-footer-panel">
            <div className="updater-actions">
              {isDownloading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--primary)', flex: 1 }}>
                    {readyToRestart ? '✓ Instalando...' : `Baixando v${updateVersion}: ${downloadPercent}%`}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {readyToRestart ? '' : `${downloadPercent}/100`}
                  </span>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>⚡ v{updateVersion} disponível</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="updater-btn update" onClick={startUpdate}>
                      Atualizar
                    </button>
                    <button className="updater-btn ignore" onClick={ignoreUpdate}>
                      Ignorar
                    </button>
                    <button className="updater-btn schedule" onClick={scheduleUpdate}>
                      Agendar
                    </button>
                  </div>
                </>
              )}
            </div>
            {isDownloading && (
              <div className="update-progress-bar-container" style={{ marginTop: '6px' }}>
                <div className="update-progress-bar-fill" style={{ width: `${downloadPercent}%` }} />
              </div>
            )}
          </div>
        ) : (
          <div className="footer" style={{ padding: '6px 12px', fontSize: '0.6rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap', minHeight: '28px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>📝 {todaysCompletedCount}/{todaysTasks.length} concluídas</span>
              <span>🔔 {reminders.filter(r => (r.status === 'agendado' && new Date(r.datetime) >= new Date()) || r.status === 'pausado').length} agendados</span>
              {reminders.some(r => r.status === 'perdido' || (r.status === 'agendado' && new Date(r.datetime) < new Date())) && (
                <span 
                  className="pulse-error" 
                  style={{ color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={openHistory}
                >
                  ⚠️ {reminders.filter(r => r.status === 'perdido' || (r.status === 'agendado' && new Date(r.datetime) < new Date())).length} falhas
                </span>
              )}
            </div>
            {updateAvailable && (
              <button 
                className="glow-button" 
                onClick={() => setShowUpdatePanel(true)} 
                title={`Atualização v${updateVersion} disponível`}
              >
                <ArrowUp size={12} />
              </button>
            )}
          </div>
        )}
        </div>
      )}
      <CustomConfirm
        isOpen={confirmConfig.isOpen}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={confirmConfig.onCancel}
      />
      {showTagManager && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '15px'
        }} onClick={() => setShowTagManager(false)}>
          <div style={{
            backgroundColor: 'var(--bg-main)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '320px',
            maxHeight: '440px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '12px 15px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                <Tag size={14} style={{ color: 'var(--primary)' }} />
                Gerenciar Etiquetas
              </span>
              <span 
                style={{ cursor: 'pointer', padding: '4px 8px', fontSize: '0.9rem', color: 'var(--text-muted)' }} 
                onClick={() => setShowTagManager(false)}
              >
                ✕
              </span>
            </div>

            {/* Adicionar Nova Etiqueta Section */}
            <div style={{
              padding: '10px 15px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'rgba(255,255,255,0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    height: '26px',
                    flex: 1,
                    backgroundColor: 'var(--bg-hover)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px'
                  }}
                  placeholder="Nova etiqueta..."
                  value={managerNewTagName}
                  onChange={(e) => setManagerNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTagInManager();
                  }}
                />
                <button
                  onClick={handleCreateTagInManager}
                  style={{
                    fontSize: '1rem',
                    height: '26px',
                    width: '30px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  +
                </button>
              </div>
              
              {/* Escolha de cor para a nova etiqueta */}
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginRight: '2px' }}>Cor:</span>
                {[
                  'hsl(263, 90%, 50%)', // Purple
                  'hsl(217, 91%, 60%)', // Blue
                  'hsl(142, 70%, 45%)', // Green
                  'hsl(38, 92%, 50%)',  // Yellow
                  'hsl(0, 84%, 60%)',   // Red
                  'hsl(330, 81%, 60%)',  // Pink
                  'hsl(188, 86%, 53%)',  // Cyan
                  'hsl(220, 9%, 46%)'    // Gray
                ].map(color => (
                  <span
                    key={`new-${color}`}
                    onClick={() => setManagerNewTagColor(color)}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: managerNewTagColor === color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)',
                      boxShadow: managerNewTagColor === color ? '0 0 3px rgba(255,255,255,0.8)' : 'none',
                      transform: managerNewTagColor === color ? 'scale(1.15)' : 'scale(1.0)',
                      transition: 'transform 0.1s ease'
                    }}
                  />
                ))}
                <span 
                  style={{
                    position: 'relative',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)',
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.3)',
                    overflow: 'hidden',
                    display: 'inline-block',
                    marginLeft: '2px'
                  }}
                  title="Cor personalizada..."
                >
                  <input 
                    type="color" 
                    value={managerNewTagColor} 
                    onChange={(e) => setManagerNewTagColor(e.target.value)}
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      left: '-5px',
                      width: '20px',
                      height: '20px',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </span>
              </div>
            </div>

            {/* List */}
            <div className="custom-scrollbar" style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 15px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {savedTags.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                  Nenhuma etiqueta criada.
                </div>
              ) : (
                savedTags.map((tag, idx) => {
                  const curatedColors = [
                    'hsl(263, 90%, 50%)', // Purple
                    'hsl(217, 91%, 60%)', // Blue
                    'hsl(142, 70%, 45%)', // Green
                    'hsl(38, 92%, 50%)',  // Yellow
                    'hsl(0, 84%, 60%)',   // Red
                    'hsl(330, 81%, 60%)',  // Pink
                    'hsl(188, 86%, 53%)',  // Cyan
                    'hsl(220, 9%, 46%)'    // Gray
                  ];

                  // Calcular a contagem de tarefas que utilizam esta tag
                  const taskCount = tasks.filter(t => t.tag?.toLowerCase() === tag.name.toLowerCase()).length;

                  return (
                    <div 
                      key={tag.name} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '6px', 
                        padding: '8px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border)', 
                        backgroundColor: 'rgba(255,255,255,0.02)' 
                      }}
                    >
                      {/* Name input and Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Up/Down Sorter Arrows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <button
                            disabled={idx === 0}
                            onClick={() => moveTag(idx, 'up')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: idx === 0 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)',
                              cursor: idx === 0 ? 'default' : 'pointer',
                              padding: 0,
                              fontSize: '0.55rem',
                              lineHeight: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Mover para cima"
                          >
                            ▲
                          </button>
                          <button
                            disabled={idx === savedTags.length - 1}
                            onClick={() => moveTag(idx, 'down')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: idx === savedTags.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)',
                              cursor: idx === savedTags.length - 1 ? 'default' : 'pointer',
                              padding: 0,
                              fontSize: '0.55rem',
                              lineHeight: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Mover para baixo"
                          >
                            ▼
                          </button>
                        </div>

                        <input
                          type="text"
                          className="form-control"
                          style={{ 
                            fontSize: '0.75rem', 
                            padding: '4px 8px', 
                            height: '24px', 
                            flex: 1, 
                            backgroundColor: 'var(--bg-hover)', 
                            color: 'var(--text-main)', 
                            border: '1px solid var(--border)' 
                          }}
                          defaultValue={tag.name}
                          onBlur={(e) => handleRenameTagInManager(tag.name, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameTagInManager(tag.name, e.target.value);
                              e.target.blur();
                            }
                          }}
                        />

                        {/* Task Count Badge */}
                        <span 
                          style={{ 
                            fontSize: '0.62rem', 
                            padding: '2px 5px', 
                            borderRadius: '4px', 
                            backgroundColor: 'rgba(255,255,255,0.08)', 
                            color: 'var(--text-muted)', 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                          }}
                          title={`${taskCount} tarefas usam esta etiqueta`}
                        >
                          {taskCount}
                        </span>

                        <button
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onClick={() => handleDeleteTag(tag.name)}
                          title="Excluir etiqueta"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Color Selector Grid */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {curatedColors.map(color => (
                          <span
                            key={color}
                            onClick={() => handleColorChangeInManager(tag.name, color)}
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              cursor: 'pointer',
                              border: tag.color === color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)',
                              boxShadow: tag.color === color ? '0 0 4px rgba(255,255,255,0.8)' : 'none',
                              transform: tag.color === color ? 'scale(1.15)' : 'scale(1.0)',
                              transition: 'transform 0.1s ease'
                            }}
                          />
                        ))}
                        <span 
                          style={{
                            position: 'relative',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)',
                            cursor: 'pointer',
                            border: !curatedColors.includes(tag.color) ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)',
                            boxShadow: !curatedColors.includes(tag.color) ? '0 0 4px rgba(255,255,255,0.8)' : 'none',
                            transform: !curatedColors.includes(tag.color) ? 'scale(1.15)' : 'scale(1.0)',
                            overflow: 'hidden',
                            display: 'inline-block',
                            marginLeft: '2px'
                          }}
                          title="Cor personalizada (hex)..."
                        >
                          <input 
                            type="color" 
                            value={tag.color.startsWith('#') ? tag.color : '#8b5cf6'} 
                            onChange={(e) => handleColorChangeInManager(tag.name, e.target.value)}
                            style={{
                              position: 'absolute',
                              top: '-5px',
                              left: '-5px',
                              width: '24px',
                              height: '24px',
                              opacity: 0,
                              cursor: 'pointer'
                            }}
                          />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 15px',
              borderTop: '1px solid var(--border)',
              backgroundColor: 'rgba(0,0,0,0.15)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button 
                className="btn-primary" 
                style={{ fontSize: '0.72rem', padding: '5px 12px', width: '100%' }}
                onClick={() => setShowTagManager(false)}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Widget;

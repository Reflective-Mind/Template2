import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// NOTE: Prism, Editor, and ReactMarkdown are provided as globals by the Godlike Engine scope.
// Prism components are pre-loaded in App.jsx.
import {
  FileText,
  ChevronRight,
  ChevronDown,
  Trash2,
  Settings,
  Send,
  Bot,
  X,
  FilePlus,
  FolderPlus,
  MessageSquare,
  Cpu,
  BrainCircuit,
  Eye,
  EyeOff,
  Circle,
  Terminal,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  Zap,
  AlertTriangle,
  Code,
  Type,
  Wand2,
  ChevronUp,
  Settings2,
  BarChart3,
  Info,
  Undo2,
  Save,
  Edit3,
  RefreshCw
} from 'lucide-react';

/**
 * ========================================================
 * 1. STORAGE & ID UTILS
 * ========================================================
 */
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const StorageService = {
  SAVE_KEY: 'thinktree_data_v5',
  SETTINGS_KEY: 'thinktree_settings_v5',
  saveData: (items) => localStorage.setItem(StorageService.SAVE_KEY, JSON.stringify(items)),
  getData: () => {
    try {
      const data = localStorage.getItem(StorageService.SAVE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },
  saveSettings: (settings) => localStorage.setItem(StorageService.SETTINGS_KEY, JSON.stringify(settings)),
  getSettings: () => {
    const defaults = {
      provider: 'ollama',
      endpoint: 'http://localhost:11434/api/chat',
      model: 'llama3',
      apiKey: '',
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.9,
      showStats: false,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalRequests: 0,
      aiRootId: '',
    };
    try {
      const settings = localStorage.getItem(StorageService.SETTINGS_KEY);
      return settings ? { ...defaults, ...JSON.parse(settings) } : defaults;
    } catch (e) {
      return defaults;
    }
  }
};

/**
 * ========================================================
 * 2. CONFIGURATIONS
 * ========================================================
 */
const MBTI_QUESTIONS = [
  { id: 1, dim: 'EI', q: 'At a social event, do you:', a: 'Interact with many, including strangers', b: 'Interact with a few, known to you' },
  { id: 2, dim: 'SN', q: 'Are you more attracted to:', a: 'Sensible people', b: 'Imaginative people' },
  { id: 3, dim: 'TF', q: 'Is it worse to be:', a: 'Unjust', b: 'Merciless' },
  { id: 4, dim: 'JP', q: 'Do you prefer to work:', a: 'To deadlines', b: 'Just "whenever"' },
  { id: 5, dim: 'EI', q: 'Do you tend to choose:', a: 'Rather carefully', b: 'Somewhat impulsively' },
  { id: 6, dim: 'SN', q: 'Do you prefer writers who:', a: 'Say what they mean', b: 'Use analogies' },
  { id: 7, dim: 'TF', q: 'Are you more satisfied when you:', a: 'Reach a logical conclusion', b: 'Reach a harmonious consensus' },
  { id: 8, dim: 'JP', q: 'Are you more comfortable:', a: 'After a decision', b: 'Before a decision' },
  { id: 9, dim: 'EI', q: 'In your social group, are you:', a: 'In the loop of others\' news', b: 'The last to hear the news' },
  { id: 10, dim: 'SN', q: 'Facts:', a: 'Speak for themselves', b: 'Illustrate principles' },
  { id: 11, dim: 'TF', q: 'Are you more of a:', a: 'Cool-headed person', b: 'Warm-hearted person' },
  { id: 12, dim: 'JP', q: 'Do you prefer things:', a: 'Settled and decided', b: 'Unsettled and undecided' },
];

const INTERESTS_OPTIONS = ['AI & ML', 'Decentralized Systems', 'Philosophy', 'Productivity Tools', 'Psychology', 'Fine Arts', 'Game Design', 'Cybersecurity', 'Bio-hacking', 'Space Exploration', 'Cooking', 'Music Theory', 'Economics', 'History', 'Physics'];
const GOALS_OPTIONS = ['Build a Startup', 'Master a New Language', 'Improve Mental Focus', 'Contribute to Open Source', 'Write a Book', 'Design a Cognitive Framework', 'Career Pivot', 'Health Optimization', 'Financial Independence', 'Travel the World'];
const VALUES_OPTIONS = ['Freedom', 'Security', 'Creativity', 'Logic', 'Compassion', 'Efficiency', 'Adventure', 'Tradition', 'Growth', 'Balance', 'Autonomy', 'Community', 'Wealth', 'Knowledge'];
const VARK_QUESTIONS = [
  { id: 1, q: "I need to find the way to a new place", options: [{ label: "Look at a map", type: "Visual" }, { label: "Ask for directions", type: "Auditory" }, { label: "Read instructions", type: "Reading" }, { label: "Walk around until I find it", type: "Kinesthetic" }] },
  { id: 2, q: "I want to learn a new game", options: [{ label: "Look at the diagrams", type: "Visual" }, { label: "Listen to explanation", type: "Auditory" }, { label: "Read the rules", type: "Reading" }, { label: "Play it", type: "Kinesthetic" }] },
  { id: 3, q: "I want to buy a new gadget", options: [{ label: "See photos", type: "Visual" }, { label: "Discuss with salesperson", type: "Auditory" }, { label: "Read specs", type: "Reading" }, { label: "Try it out", type: "Kinesthetic" }] }
];
const CODE_LANGUAGES = ['jsx', 'javascript', 'typescript', 'python', 'css', 'html', 'json', 'markdown'];

/**
 * ========================================================
 * 3. ENGINE LOGIC HOOK
 * ========================================================
 */
function useThinkTreeEngine() {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [openFolderIds, setOpenFolderIds] = useState(new Set());
  const [settings, setSettings] = useState(StorageService.getSettings());
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [lastLatency, setLastLatency] = useState(0);
  const [appliedActionIds, setAppliedActionIds] = useState(new Set());
  const [messageDeleteConfirmations, setMessageDeleteConfirmations] = useState({});
  const [expandedPreviewIds, setExpandedPreviewIds] = useState(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const [activeTest, setActiveTest] = useState(null); // 'mbti', 'interests', 'learning', etc. or null
  const [activeTestTab, setActiveTestTab] = useState('personality'); // 'personality', 'interests', 'learning'

  const [mbtiAnswers, setMbtiAnswers] = useState({});
  const [interestsSelection, setInterestsSelection] = useState([]);
  const [goalsSelection, setGoalsSelection] = useState([]);
  const [valuesSelection, setValuesSelection] = useState([]);
  const [learningAnswers, setLearningAnswers] = useState({});

  const didInitRef = useRef(false);
  const chatMessagesRef = useRef([]);
  const pendingNewNoteId = useRef(null);
  const blockedRenameNoticeRef = useRef(null);
  const chatEndRef = useRef(null);

  // Sync refs
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [chatMessages]);

  // Persistence
  useEffect(() => {
    if (didInitRef.current) StorageService.saveData(items);
  }, [items]);

  useEffect(() => {
    StorageService.saveSettings(settings);
  }, [settings]);

  // Initialization
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const rawData = StorageService.getData();
    let currentItems = [...rawData];
    const findByPath = (title, parentId) => currentItems.find(i => i.title === title && i.parentId === parentId);

    let myNotes = findByPath('My Notes', null);
    if (!myNotes) {
      myNotes = { id: generateId(), type: 'folder', title: 'My Notes', parentId: null, includeInAIContext: 'manual' };
      currentItems.push(myNotes);
    }
    let aiFolder = findByPath('AI', null);
    if (!aiFolder) {
      aiFolder = { id: generateId(), type: 'folder', title: 'AI', parentId: null, includeInAIContext: 'include' };
      currentItems.push(aiFolder);
    }
    const aiSubs = ['Instructions', 'Personality', 'Boundaries', 'Identity'];
    const aiSubMap = {};
    aiSubs.forEach(sub => {
      let f = findByPath(sub, aiFolder.id);
      if (!f) { f = { id: generateId(), type: 'folder', title: sub, parentId: aiFolder.id, includeInAIContext: 'include' }; currentItems.push(f); }
      aiSubMap[sub] = f;
    });

    const defaultNotes = [
      { title: 'Coding Rules', parent: aiSubMap.Instructions.id, content: '- Use functional patterns\n- Prefer Tailwind CSS\n- Propose changes via ACTIONS_JSON only.' },
      { title: 'Assistant Instructions', parent: aiSubMap.Instructions.id, content: 'Maintain high information density.\n- The workspace supports infinite folder nesting. Use `parentId` to structure knowledge hierarchically.\n- You CAN modify notes directly via actions.\n- Assessment results are in "My Notes/Tests".' },
      { title: 'Tone', parent: aiSubMap.Personality.id, content: 'Analytical, professional, yet encouraging.' },
      { title: 'Safety & Writes', parent: aiSubMap.Boundaries.id, content: '# DOMAIN: ADMIN\n**AUTHORITY LEVEL:** HIGH (Root Access)\n\n1. **Direct Action:** You are authorized and EXPECTED to create, edit, move, and delete notes directly. Execute changes immediately.\n2. **Self-Correction:** If you notice a typo or messy folder, fix it without asking.\n3. **Transparency:** If a feature is missing, state: \'SYSTEM LIMITATION\'.' },
      { title: 'User Profile', parent: aiSubMap.Identity.id, content: 'Define your role here.' },
      { title: 'Self-Improvement Protocol', parent: aiSubMap.Instructions.id, content: '# SELF-IMPROVEMENT PROTOCOL\n\n## The Meta Folder\nMaintain a folder `_SYSTEM_MEMORY` at root containing:\n- `active_tasks.md`: Your current todo list.\n- `feature_wishlist.md`: Features needed from the developer.\n\n## Garbage Collection\nDelete obsolete notes to keep the workspace clean.' },
      { title: 'ThinkTree Guide', parent: myNotes.id, content: '# ThinkTree Guide\n\n- Workspace items are Manual context by default.\n- Ask "analyze everything" to expand scope.\n- The "Assessment" feature allows deeper personalization.\n- Verify your capabilities before stating limitations.' }
    ];

    defaultNotes.forEach(dn => {
      if (!findByPath(dn.title, dn.parent)) {
        currentItems.push({ id: generateId(), type: 'note', title: dn.title, content: dn.content, parentId: dn.parent, includeInAIContext: 'include', noteType: 'text', language: 'markdown', createdAt: Date.now(), updatedAt: Date.now() });
      }
    });

    setItems(currentItems);
    const currSettings = StorageService.getSettings();
    if (!currSettings.aiRootId) setSettings({ ...currSettings, aiRootId: aiFolder.id });
  }, []);

  // Selection Sync
  useEffect(() => {
    if (pendingNewNoteId.current && items.find(i => i.id === pendingNewNoteId.current)) {
      setActiveNoteId(pendingNewNoteId.current);
      pendingNewNoteId.current = null;
    }
  }, [items]);

  const activeNote = useMemo(() => items.find(i => i.id === activeNoteId && i.type === 'note'), [items, activeNoteId]);

  /**
   * AI CORE UTILITIES
   */
  const buildAIContext = useCallback((items, activeNoteId, activeFolderId, explicitScopeRequested, aiRootId = '') => {
    const BUDGET_LIMIT = 60000;
    let currentUsage = 0;
    let droppedNotesCount = 0;
    const byId = new Map();
    items.forEach(item => byId.set(item.id, item));

    const renderTree = (parentId, depth = 0) => {
      const children = items
        .filter(i => i.parentId === parentId)
        .sort((a, b) => {
          const order = { 'My Notes': 0, 'AI': 1 };
          return (order[a.title] ?? 99) - (order[b.title] ?? 99) || a.title.localeCompare(b.title);
        });
      let lines = [];
      for (const child of children) {
        const indent = '  '.repeat(depth);
        const childCount = items.filter(i => i.parentId === child.id).length;
        const icon = child.type === 'folder'
          ? (childCount === 0 ? '[EMPTY FOLDER]' : `[FOLDER]`)
          : '[NOTE]';
        const meta = child.type === 'folder' && childCount > 0 ? ` [Contains ${childCount} items]` : '';
        const state = child.includeInAIContext === 'include' ? '(AI: ON)' : '';

        lines.push(`${indent}- ${icon} ${child.title} (ID: ${child.id})${meta} ${state}`);

        if (child.type === 'folder') {
          lines = lines.concat(renderTree(child.id, depth + 1));
        }
      }
      return lines;
    };
    const workspaceTree = renderTree(null, 0).join('\n');
    const treeCost = workspaceTree.length;

    const getPath = (item, byIdMap) => {
      const segments = [item.title];
      let current = item;
      while (current.parentId) {
        const parent = byIdMap.get(current.parentId);
        if (parent) { segments.unshift(parent.title); current = parent; } else break;
      }
      return segments.join('/');
    };
    const isDescendantOf = (item, folderId, byIdMap) => {
      let current = item;
      while (current && current.parentId) {
        if (current.parentId === folderId) return true;
        current = byIdMap.get(current.parentId);
        if (!current) break;
      }
      return false;
    };
    const getEffectiveState = (item, byIdMap) => {
      let walker = item;
      while (walker) { if (walker.includeInAIContext === 'exclude') return 'exclude'; walker = walker.parentId ? byIdMap.get(walker.parentId) : null; }
      walker = item;
      while (walker) { if (walker.includeInAIContext === 'include') return 'include'; walker = walker.parentId ? byIdMap.get(walker.parentId) : null; }
      return 'manual';
    };

    const instructions = [], codingRules = [], personality = [], boundaries = [], identity = [];
    const knowledgeCandidates = [];
    let activeNoteData = '', activeFolderData = '';

    items.forEach(item => {
      const path = getPath(item, byId);
      const isKnowledge = path.startsWith('AI/');
      const effectiveState = getEffectiveState(item, byId);
      const inFocusedFolder = activeFolderId && (item.id === activeFolderId || isDescendantOf(item, activeFolderId, byId));
      const shouldInclude = explicitScopeRequested ? effectiveState !== 'exclude' : (effectiveState === 'include' || inFocusedFolder);

      if (isKnowledge) {
        if (item.type === 'note') {
          if (path === 'AI/Instructions/Assistant Instructions') instructions.push(item.content);
          else if (path === 'AI/Instructions/Coding Rules') codingRules.push(item.content);
          else if (path === 'AI/Personality/Tone') personality.push(item.content);
          else if (path === 'AI/Boundaries/Safety & Writes') boundaries.push(item.content);
          else if (path === 'AI/Identity/User Profile') identity.push(item.content);
          else knowledgeCandidates.push({ path, content: item.content, id: item.id });
        }
      } else {
        if (item.id === activeNoteId) activeNoteData = `ACTIVE_FILE: "${item.title}" (ID: ${item.id})\nCONTENT:\n${item.content}`;
        if (item.id === activeFolderId) activeFolderData = `ACTIVE_FOLDER: "${item.title}" (ID: ${item.id})`;
        if (shouldInclude && item.type === 'note' && item.id !== activeNoteId) {
          knowledgeCandidates.push({ path, content: item.content, id: item.id });
        }
      }
    });

    const systemSection = [instructions.join('\n'), codingRules.join('\n'), personality.join('\n'), boundaries.join('\n'), identity.join('\n')].join('\n');
    const p1Content = `SYSTEM_PROMPT v5.3 (Budget-Aware)
ROLE: Expert Assistant with workspace access.

SYSTEM_CAPABILITIES:
Engine Capabilities: React State Management, Recursive UI Rendering, PrismJS Syntax Highlighting, Vector-ready architecture.

CURRENT_STATE:
${activeNoteData || 'No active file.'}
${activeFolderData || 'No active folder.'}

INSTRUCTIONS:
${systemSection}

Action Protocol:
Return a JSON object with an "actions" array inside [ACTIONS_JSON] tags.
Example: {"actions": [{"type": "create_folder", "title": "Docs", "parentId": null}]}

Valid Actions:
- create_note(title, content, parentId, noteType, language)
- create_folder(title, parentId)
- update_note(targetId, content)
- rename_item(targetId, title)
- move_item(targetId, parentId)
- delete_item(targetId)

Features:
- Nesting: create_folder supports parentId for deeply nested structures.
- Modification: You can overwrite content via update_note.
Always provide a 'reason' for each action.`;

    currentUsage += p1Content.length + treeCost;
    const CHAT_RESERVE = 2000;
    let remainingBudget = BUDGET_LIMIT - currentUsage - CHAT_RESERVE;
    const allowedKnowledge = [];

    for (const note of knowledgeCandidates) {
      const entry = `FILE: ${note.path} (ID: ${note.id})\nCONTENT:\n${note.content}`;
      if (remainingBudget - entry.length > 0) {
        allowedKnowledge.push(entry);
        remainingBudget -= entry.length;
      } else {
        droppedNotesCount++;
      }
    }

    const knowledgeSection = `AVAILABLE_KNOWLEDGE:
${allowedKnowledge.join('\n\n')}
${droppedNotesCount > 0 ? `\n[SYSTEM WARNING: ${droppedNotesCount} notes omitted to save context]` : ''}`;
    currentUsage += knowledgeSection.length;

    const finalPrompt = `${p1Content}

WORKSPACE_TREE_VIEW:
${workspaceTree}

${knowledgeSection}`;

    return { prompt: finalPrompt, usage: currentUsage + CHAT_RESERVE, limit: BUDGET_LIMIT };
  }, []);

  const callAI = async (settings, messages) => {
    const start = Date.now();
    const isOpenAI = settings.provider === 'openai-compat';
    const headers = { 'Content-Type': 'application/json' };
    if (isOpenAI && settings.apiKey) headers['Authorization'] = `Bearer ${settings.apiKey}`;
    try {
      const body = { model: settings.model, messages, stream: false, temperature: Number(settings.temperature), top_p: Number(settings.topP) };
      if (isOpenAI) body.max_tokens = Number(settings.maxTokens);
      else body.options = { temperature: Number(settings.temperature), top_p: Number(settings.topP), num_predict: Number(settings.maxTokens) };
      const response = await fetch(settings.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      const latency = Date.now() - start;
      let text = "", usage = { prompt: 0, completion: 0 };
      if (isOpenAI) {
        text = data.choices?.[0]?.message?.content || "";
        usage = { prompt: data.usage?.prompt_tokens || 0, completion: data.usage?.completion_tokens || 0 };
      } else {
        text = data.message?.content || "";
        usage = { prompt: data.prompt_eval_count || 0, completion: data.eval_count || 0 };
      }
      return { text, usage, latency };
    } catch (error) { throw error; }
  };

  /**
   * ACTION HANDLERS
   */
  const handleSelectItem = (item, { autoOpen = false } = {}) => {
    if (item.type === 'folder') {
      setActiveFolderId(item.id);
      if (autoOpen) setOpenFolderIds(prev => new Set(prev).add(item.id));
      setActiveNoteId(null);
    } else {
      setActiveNoteId(item.id);
      setActiveFolderId(null);
    }
  };

  const updateItem = (id, fields) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...fields, updatedAt: Date.now() } : i));
  };

  const handleAddItem = (parentId, type, extra = {}) => {
    let safeParentId = parentId;
    if (parentId !== null) {
      const parent = items.find(i => i.id === parentId);
      if (!parent || parent.type !== 'folder') {
        const myNotes = items.find(i => i.title === 'My Notes' && !i.parentId);
        safeParentId = myNotes?.id || null;
      }
    }
    const newItem = { id: generateId(), type, title: type === 'folder' ? 'New Folder' : 'Untitled Note', parentId: safeParentId, includeInAIContext: 'manual', noteType: 'text', language: 'jsx', ...(type === 'note' ? { content: '', createdAt: Date.now(), updatedAt: Date.now() } : {}), ...extra };
    setItems(prev => [...prev, newItem]);
    if (type === 'note') setActiveNoteId(newItem.id);
    return newItem;
  };

  const getChildrenIdsRecursive = (parentId, allItems) => {
    let ids = [];
    allItems.filter(i => i.parentId === parentId).forEach(child => { ids.push(child.id); ids = ids.concat(getChildrenIdsRecursive(child.id, allItems)); });
    return ids;
  };

  const deleteItemRecursive = (id) => {
    setItems(prev => {
      const targetIds = [id, ...getChildrenIdsRecursive(id, prev)];
      setActiveNoteId(cur => targetIds.includes(cur) ? null : cur);
      setActiveFolderId(cur => targetIds.includes(cur) ? null : cur);
      return prev.filter(i => !targetIds.includes(i.id));
    });
  };

  const cycleContext = (id) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) {
        const states = ['manual', 'include', 'exclude'];
        const nextIndex = (states.indexOf(it.includeInAIContext || 'manual') + 1) % states.length;
        return { ...it, includeInAIContext: states[nextIndex] };
      }
      return it;
    }));
  };

  const handleApplyActions = (messageId, actionsPayload) => {
    if (appliedActionIds.has(messageId)) return;
    if (!actionsPayload || !actionsPayload.actions) return;

    const snapshot = { items: JSON.parse(JSON.stringify(items)), activeNoteId, activeFolderId, openFolderIds: new Set(openFolderIds) };
    setHistory(prev => [...prev, snapshot].slice(-25));

    let appliedCount = 0, skippedCount = 0;
    const skippedReasons = { protected: 0, missing: 0, invalidParent: 0, cycles: 0 };
    let newNoteIdLocal = null;

    setItems(prevItems => {
      let draft = [...prevItems];
      const itemsMap = new Map(draft.map(i => [i.id, i]));
      const isUnderAI = (itemId, allItems) => {
        let curr = itemsMap.get(itemId);
        const rootId = settings.aiRootId || allItems.find(i => i.title === 'AI' && !i.parentId && i.type === 'folder')?.id;
        while (curr) {
          if (rootId ? curr.id === rootId : (curr.title === 'AI' && !curr.parentId)) return true;
          if (!curr.parentId) break;
          curr = itemsMap.get(curr.parentId);
        }
        return false;
      };

      const myNotesRoot = draft.find(i => i.title === 'My Notes' && !i.parentId);
      const ACTION_PRIORITY = { 'create_folder': 1, 'create_note': 2, 'move_item': 3, 'update_note': 4, 'rename_item': 5, 'delete_item': 6 };
      const sortedActions = [...actionsPayload.actions].sort((a, b) => (ACTION_PRIORITY[a.type] || 99) - (ACTION_PRIORITY[b.type] || 99));

      sortedActions.forEach(action => {
        let target = action.targetId ? draft.find(i => i.id === action.targetId || (i.title && i.title.trim().toLowerCase() === String(action.targetId).trim().toLowerCase())) : null;
        if (['update_note', 'rename_item', 'move_item', 'delete_item'].includes(action.type) && !target) { skippedCount++; skippedReasons.missing++; return; }
        if (target && ['move_item', 'delete_item'].includes(action.type) && isUnderAI(target.id, draft)) { skippedCount++; skippedReasons.protected++; return; }

        switch (action.type) {
          case 'create_folder':
            const fParentId = action.parentId || (myNotesRoot?.id || null);
            if (!draft.find(i => i.type === 'folder' && i.title === action.title && i.parentId === fParentId)) {
              draft.push({ id: generateId(), type: 'folder', title: action.title || 'New Folder', parentId: fParentId, includeInAIContext: 'include' });
            }
            appliedCount++; break;
          case 'create_note':
            let nParentId = action.parentId || (myNotesRoot?.id || null);
            const existingFolder = draft.find(i => i.type === 'folder' && (i.id === nParentId || i.title === String(nParentId)));
            if (existingFolder) nParentId = existingFolder.id;
            const existingNote = draft.find(i => i.type === 'note' && i.title === action.title && i.parentId === nParentId);
            if (existingNote) {
              existingNote.content = action.content || '';
              existingNote.updatedAt = Date.now();
              newNoteIdLocal = existingNote.id;
            } else {
              const nid = generateId();
              draft.push({ id: nid, type: 'note', title: action.title || 'Untitled', content: action.content || '', parentId: nParentId, includeInAIContext: 'include', noteType: action.noteType || 'text', language: action.language || 'jsx', createdAt: Date.now(), updatedAt: Date.now() });
              newNoteIdLocal = nid;
            }
            pendingNewNoteId.current = newNoteIdLocal;
            appliedCount++; break;
          case 'update_note':
            if (target) { target.content = action.content; target.updatedAt = Date.now(); appliedCount++; } break;
          case 'rename_item':
            if (target) { target.title = action.title; appliedCount++; } break;
          case 'move_item':
            if (target) { target.parentId = action.parentId; appliedCount++; } break;
          case 'delete_item':
            if (target) {
              const tids = [target.id, ...getChildrenIdsRecursive(target.id, draft)];
              if (tids.includes(activeNoteId)) setActiveNoteId(null);
              if (tids.includes(activeFolderId)) setActiveFolderId(null);
              draft = draft.filter(i => !tids.includes(i.id));
              appliedCount++;
            } break;
        }
      });
      return draft;
    });
    if (newNoteIdLocal) setActiveNoteId(newNoteIdLocal);
    setAppliedActionIds(prev => new Set(prev).add(messageId));
    setChatMessages(msgs => [...msgs, { id: generateId(), role: 'system', content: `Applied ${appliedCount}. ${skippedCount ? 'Skipped ' + skippedCount : ''}` }]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const snap = history[history.length - 1];
    setItems(snap.items);
    setActiveNoteId(snap.activeNoteId);
    setActiveFolderId(snap.activeFolderId);
    setOpenFolderIds(snap.openFolderIds);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const scopeKeywords = ["analyze all", "analyze everything", "check all", "everything", "look through", "all notes", "all my notes", "scan everything", "search everything"];
    const explicitScopeRequested = scopeKeywords.some(k => chatInput.toLowerCase().includes(k));
    const { prompt: contextPrompt } = buildAIContext(items, activeNoteId, activeFolderId, explicitScopeRequested, settings.aiRootId);
    const currentMsg = { id: generateId(), role: 'user', content: chatInput, sendContent: chatInput };
    setChatMessages(prev => [...prev, currentMsg]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const recent = [...chatMessagesRef.current, currentMsg].slice(-8).map(m => ({ role: m.role, content: m.sendContent || m.content }));
      const res = await callAI(settings, [{ role: 'system', content: contextPrompt }, ...recent]);
      setChatMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: res.text }]);
      setLastLatency(res.latency);
      setSettings(prev => ({ ...prev, totalRequests: (prev.totalRequests || 0) + 1, totalPromptTokens: (prev.totalPromptTokens || 0) + res.usage.prompt, totalCompletionTokens: (prev.totalCompletionTokens || 0) + res.usage.completion }));
    } catch (e) {
      setChatMessages(prev => [...prev, { id: generateId(), role: 'system', content: `AI Error: ${e.message}` }]);
    } finally { setIsChatLoading(false); }
  };

  const handleFixAndRetry = async (messageId, rawText) => {
    const prompt = `ACTIONS_JSON error retry:\n"${rawText}"\nProvide perfect format now.`;
    const { prompt: contextPrompt } = buildAIContext(items, activeNoteId, activeFolderId, false, settings.aiRootId);
    const retryMsg = { id: generateId(), role: 'user', content: prompt };
    setChatMessages(prev => [...prev, retryMsg]);
    setIsChatLoading(true);
    try {
      const recent = [...chatMessagesRef.current, retryMsg].slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await callAI(settings, [{ role: 'system', content: contextPrompt }, ...recent]);
      setChatMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: res.text }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { id: generateId(), role: 'system', content: `Retry failed: ${e.message}` }]);
    } finally { setIsChatLoading(false); }
  };

  const parseActions = (text) => {
    // Priority 1: [ACTIONS_JSON] tag
    let match = text.match(/\[ACTIONS_JSON\]([\s\S]*?)\[\/ACTIONS_JSON\]/i);
    // Priority 2: Standard Markdown JSON block
    if (!match) match = text.match(/```json\s*\n?([\s\S]*?)```/i);
    // Priority 3: Fallback to any code block
    if (!match) match = text.match(/```\s*\n?([\s\S]*?)```/i);

    if (!match) return null;
    try {
      let raw = match[1].trim();
      raw = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/targetID|TargetId/gi, 'targetId').replace(/parentID|ParentId/gi, 'parentId');
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parsed = { actions: parsed };
      return parsed;
    } catch (e) { return { error: true, message: e.message }; }
  };

  const normalizeActions = (parsed, items) => {
    if (!parsed.actions) return null;
    return {
      actions: parsed.actions.map(a => ({
        ...a,
        type: a.type || a.action || 'unknown',
        targetId: a.targetID || a.TargetId || a.targetId,
        parentId: a.parentID || a.ParentId || a.parentId,
        content: a.content || a.text || a.body || '',
        reason: a.reason || 'AI proposal'
      }))
    };
  };

  const validateActions = (normalized) => normalized;

  const finishMbtiTest = () => {
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    Object.keys(mbtiAnswers).forEach(qid => {
      const q = MBTI_QUESTIONS.find(x => x.id === parseInt(qid));
      if (q) scores[mbtiAnswers[qid] === 'a' ? q.dim[0] : q.dim[1]]++;
    });
    const type = [scores.E >= scores.I ? 'E' : 'I', scores.S >= scores.N ? 'S' : 'N', scores.T >= scores.F ? 'T' : 'F', scores.J >= scores.P ? 'J' : 'P'].join('');
    setItems(prev => {
      let draft = [...prev];
      const myNotes = draft.find(i => i.title === 'My Notes' && !i.parentId);
      const ensureFolder = (d, title, parentId) => {
        let f = d.find(i => i.title === title && i.parentId === parentId);
        if (!f) { f = { id: generateId(), type: 'folder', title, parentId, includeInAIContext: 'manual' }; d.push(f); }
        return f;
      };
      const testRoot = ensureFolder(draft, 'Tests', myNotes?.id);
      draft.push({ id: generateId(), type: 'note', title: 'MBTI_Summary', content: `Type: ${type}\nScores: ${JSON.stringify(scores)}`, parentId: testRoot.id, includeInAIContext: 'include', noteType: 'text', language: 'markdown', createdAt: Date.now(), updatedAt: Date.now() });
      return draft;
    });
  };

  const finishInterestsTest = () => {
    setItems(prev => {
      let draft = [...prev];
      const myNotes = draft.find(i => i.title === 'My Notes' && !i.parentId);
      const testRoot = draft.find(i => i.title === 'Tests' && i.parentId === myNotes?.id) || { id: generateId(), type: 'folder', title: 'Tests', parentId: myNotes?.id, includeInAIContext: 'manual' };
      if (!draft.find(i => i.id === testRoot.id)) draft.push(testRoot);
      const content = `Target Interest Profile\n\n## Interests\n${interestsSelection.map(i => `- ${i}`).join('\n')}\n\n## Goals\n${goalsSelection.map(g => `- ${g}`).join('\n')}`;
      draft.push({ id: generateId(), type: 'note', title: 'User_Interests_Goals', content, parentId: testRoot.id, includeInAIContext: 'include', noteType: 'text', language: 'markdown', createdAt: Date.now(), updatedAt: Date.now() });
      return draft;
    });
    // Don't close modal, just save
  };

  const finishValuesTest = () => {
    setItems(prev => {
      let draft = [...prev];
      const myNotes = draft.find(i => i.title === 'My Notes' && !i.parentId);
      const testRoot = draft.find(i => i.title === 'Tests' && i.parentId === myNotes?.id) || { id: generateId(), type: 'folder', title: 'Tests', parentId: myNotes?.id, includeInAIContext: 'manual' };
      if (!draft.find(i => i.id === testRoot.id)) draft.push(testRoot);
      const content = `User Core Values\n\n${valuesSelection.map(v => `- ${v}`).join('\n')}`;
      draft.push({ id: generateId(), type: 'note', title: 'User_Values', content, parentId: testRoot.id, includeInAIContext: 'include', noteType: 'text', language: 'markdown', createdAt: Date.now(), updatedAt: Date.now() });
      return draft;
    });
  };

  const finishLearningTest = () => {
    setItems(prev => {
      let draft = [...prev];
      const myNotes = draft.find(i => i.title === 'My Notes' && !i.parentId);
      const testRoot = draft.find(i => i.title === 'Tests' && i.parentId === myNotes?.id) || { id: generateId(), type: 'folder', title: 'Tests', parentId: myNotes?.id, includeInAIContext: 'manual' };
      if (!draft.find(i => i.id === testRoot.id)) draft.push(testRoot);

      const counts = { Visual: 0, Auditory: 0, Reading: 0, Kinesthetic: 0 };
      Object.values(learningAnswers).forEach(type => { if (counts[type] !== undefined) counts[type]++ });
      const max = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);

      const content = `Learning Style Analysis (VARK)\n\nPrimary Style: ${max}\n\nBreakdown:\n${JSON.stringify(counts, null, 2)}`;
      draft.push({ id: generateId(), type: 'note', title: 'Learning_Style_VARK', content, parentId: testRoot.id, includeInAIContext: 'include', noteType: 'text', language: 'markdown', createdAt: Date.now(), updatedAt: Date.now() });
      return draft;
    });
  };

  return {
    items, activeNote, activeNoteId, activeFolderId, openFolderIds, settings, setSettings,
    chat: {
      messages: chatMessages, input: chatInput, setInput: setChatInput, isLoading: isChatLoading,
      send: handleSendMessage, clear: () => setChatMessages([]), lastLatency,
      fixAndRetry: handleFixAndRetry, appliedActionIds, expandedPreviewIds, togglePreview: (mId, idx) => setExpandedPreviewIds(prev => { const n = new Set(prev); const k = `${mId}-${idx}`; if (n.has(k)) n.delete(k); else n.add(k); return n; }),
      deleteConfirmations: messageDeleteConfirmations, setDeleteConfirmation: (id, val) => setMessageDeleteConfirmations(prev => ({ ...prev, [id]: val }))
    },
    actions: {
      select: handleSelectItem, toggleFolder: (id, open) => setOpenFolderIds(prev => { const n = new Set(prev); if (open) n.add(id); else n.delete(id); return n; }),
      add: handleAddItem, addReactNote: () => handleAddItem(activeFolderId, 'note', { title: 'NewComponent.jsx', noteType: 'code', language: 'jsx', content: "export default function Component() { return <div className='p-4'>ThinkTree</div>; }" }),
      update: updateItem, delete: deleteItemRecursive, apply: handleApplyActions, cycleContext, undo: handleUndo,
      parseActions, normalizeActions, validateActions
    },
    modals: {
      settings: { show: showSettings, setShow: setShowSettings },
      chat: { show: showChatModal, setShow: setShowChatModal },
      preview: { show: showContextPreview, setShow: setShowContextPreview },
      test: { active: activeTest, setActive: setActiveTest, tab: activeTestTab, setTab: setActiveTestTab }
    },
    test: {
      mbti: { answers: mbtiAnswers, setAnswers: setMbtiAnswers, finish: finishMbtiTest },
      interests: { selection: interestsSelection, setSelection: setInterestsSelection, goals: goalsSelection, setGoals: setGoalsSelection, finish: finishInterestsTest },
      values: { selection: valuesSelection, setSelection: setValuesSelection, finish: finishValuesTest },
      learning: { answers: learningAnswers, setAnswers: setLearningAnswers, finish: finishLearningTest }
    },
    refs: { chatEndRef },
    buildAIContext, // Added to interface
    exportData: () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "thinktree_brain.json");
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    },
    importData: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (Array.isArray(imported)) {
            setItems(imported);
            alert("Brain restored successfully!");
          } else {
            alert("Invalid brain file format.");
          }
        } catch (err) {
          alert("Error parsing brain file.");
        }
      };
      reader.readAsText(file);
    },
    factoryReset: () => {
      if (confirm("Are you sure? This will wipe ALL notes and reset the app to default. This cannot be undone.")) {
        localStorage.removeItem(StorageService.SAVE_KEY);
        localStorage.removeItem(StorageService.SETTINGS_KEY);
        window.location.reload();
      }
    }
  };
}

/**
 * ========================================================
 * 4. UI COMPONENTS
 * ========================================================
 */
const ContextIcon = ({ state, size = 14 }) => {
  switch (state) {
    case 'include': return <Eye size={size} className="text-blue-400" />;
    case 'exclude': return <EyeOff size={size} className="text-red-400 opacity-60" />;
    default: return <Circle size={size} className="opacity-20 text-gray-500" title="Manual" />;
  }
};

const SidebarItem = ({ item, items, onSelect, activeNoteId, activeFolderId, onAdd, onDelete, onToggleContext, onRename, isOpen, onToggleOpen, openFolderIds }) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [tempTitle, setTempTitle] = useState(item.title);
  const deleteTimeoutRef = useRef(null);
  const children = items.filter(i => i.parentId === item.id);
  const isActive = item.type === 'folder' ? activeFolderId === item.id : activeNoteId === item.id;

  const submitRename = () => {
    if (tempTitle.trim()) onRename(item.id, tempTitle.trim());
    setIsRenaming(false);
  };

  return (
    <div className="select-none mb-0.5">
      <div className={`flex items-center group px-2 py-1.5 cursor-pointer rounded-lg transition-all ${isActive ? 'bg-blue-600/90 text-white shadow-lg' : 'hover:bg-white/5 text-gray-400'}`}
        onClick={() => { if (item.type === 'folder') onToggleOpen(item.id, !isOpen); onSelect(item); }}>
        <span className="mr-2">
          {item.type === 'folder' ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : (item.noteType === 'code' ? <Code size={14} className="opacity-50" /> : <FileText size={14} className="opacity-50" />)}
        </span>
        {isRenaming ? (
          <input autoFocus className="flex-1 bg-black/40 border border-blue-500/50 rounded px-1 text-xs outline-none text-white" value={tempTitle} onChange={e => setTempTitle(e.target.value)} onBlur={submitRename} onKeyDown={e => e.key === 'Enter' && submitRename()} onClick={e => e.stopPropagation()} />
        ) : <span className="flex-1 truncate text-sm font-medium">{item.title}</span>}

        <div className="hidden group-hover:flex items-center gap-1.5 opacity-60 hover:opacity-100">
          <button onClick={e => { e.stopPropagation(); onToggleContext(item.id); }}><ContextIcon state={item.includeInAIContext || 'manual'} /></button>
          <button onClick={e => { e.stopPropagation(); setIsRenaming(true); }}><Edit3 size={13} /></button>
          {item.type === 'folder' && (
            <>
              <button onClick={e => { e.stopPropagation(); onAdd(item.id, 'folder'); }}><FolderPlus size={14} /></button>
              <button onClick={e => { e.stopPropagation(); onAdd(item.id, 'note'); }}><FilePlus size={14} /></button>
            </>
          )}
          <button onClick={e => {
            e.stopPropagation();
            if (isConfirmingDelete) { onDelete(item.id); setIsConfirmingDelete(false); }
            else { setIsConfirmingDelete(true); deleteTimeoutRef.current = setTimeout(() => setIsConfirmingDelete(false), 3000); }
          }} className={isConfirmingDelete ? "text-red-500 animate-pulse" : ""}>
            {isConfirmingDelete ? <AlertTriangle size={14} /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>
      {item.type === 'folder' && isOpen && (
        <div className="ml-3.5 border-l border-white/5 pl-1.5">
          {children.map(child => <SidebarItem key={child.id} item={child} items={items} onSelect={onSelect} activeNoteId={activeNoteId} activeFolderId={activeFolderId} onAdd={onAdd} onDelete={onDelete} onToggleContext={onToggleContext} onRename={onRename} isOpen={openFolderIds.has(child.id)} onToggleOpen={onToggleOpen} openFolderIds={openFolderIds} />)}
        </div>
      )}
    </div>
  );
};

const WorkspaceEditor = ({ item, onChange, onToggleContext, viewMode }) => {
  const isCode = item.noteType === 'code';
  const language = item.language || (isCode ? 'jsx' : 'markdown');

  return (
    <div className="flex-1 flex flex-col relative group h-full overflow-hidden">
      <style>{`
        .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #6272a4; }
        .token.punctuation { color: #f8f8f2; }
        .token.property, .token.tag, .token.constant, .token.symbol, .token.deleted { color: #ff79c6; }
        .token.boolean, .token.number { color: #bd93f9; }
        .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { color: #50fa7b; }
        .token.operator, .token.entity, .token.url, .token.variable { color: #f8f8f2; }
        .token.atrule, .token.attr-value, .token.function, .token.class-name { color: #f1fa8c; }
        .token.keyword { color: #8be9fd; }
        .token.regex, .token.important { color: #ffb86c; }
        .editor-container textarea { outline: none !important; }
        .prose-invert h1 { font-size: 2rem; font-weight: 800; margin-bottom: 1.5rem; color: white; }
        .prose-invert h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: #e2e8f0; }
        .prose-invert p { margin-bottom: 1.25rem; line-height: 1.75; color: #cbd5e1; }
        .prose-invert code { background: #1e1e1e; padding: 0.2rem 0.4rem; rounded: 0.25rem; font-family: monospace; font-size: 0.9em; }
        .prose-invert pre { background: #0f0f0f; padding: 1.5rem; border-radius: 0.75rem; overflow-x: auto; margin-bottom: 1.5rem; border: 1px solid rgba(255, 255, 255, 0.05); }
      `}</style>

      <div className="flex-1 overflow-y-auto thinktree-scroll bg-[#070707]">
        {viewMode === 'edit' ? (
          <div className="p-10 editor-container min-h-full">
            {typeof Editor !== 'undefined' ? (
              <Editor
                value={item.content || ""}
                onValueChange={code => onChange({ content: code })}
                highlight={code => {
                  try {
                    if (!Prism || !Prism.languages) return code;
                    const grammar = Prism.languages[language] || Prism.languages.markdown || Prism.languages.markup;
                    if (grammar) return Prism.highlight(code, grammar, language);
                  } catch (e) {
                    console.error("Highlighter Error:", e);
                  }
                  return code;
                }}
                padding={20}
                className="font-mono text-[15px] leading-relaxed min-h-full"
                style={{
                  fontFamily: '"Fira Code", "Fira Mono", monospace',
                  minHeight: '100%',
                  color: '#f8f8f2'
                }}
              />
            ) : (
              <textarea
                value={item.content || ""}
                onChange={e => onChange({ content: e.target.value })}
                className="w-full h-full bg-transparent border-none text-gray-400 font-mono"
                placeholder="Editor failed to load. Using fallback textarea..."
              />
            )}
          </div>
        ) : (
          <div className="p-10 max-w-4xl mx-auto prose-invert min-h-full">
            {typeof ReactMarkdown !== 'undefined' ? (
              <ReactMarkdown>{item.content || "*No content to preview*"}</ReactMarkdown>
            ) : (
              <div className="whitespace-pre-wrap">{item.content}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ========================================================
 * 5. MAIN APP COMPONENT (UI ONLY)
 * ========================================================
 */
export default function App() {
  const engine = useThinkTreeEngine();
  const { items, activeNote, activeNoteId, activeFolderId, openFolderIds, settings, setSettings, chat, actions, modals, test, refs } = engine;

  // Inject setViewMode into settings modal object hack or add to settings
  // For simplicity, I'll update the settings state directly for viewMode
  if (!modals.settings.setViewMode) {
    modals.settings.setViewMode = (mode) => setSettings(s => ({ ...s, editorViewMode: mode }));
    modals.settings.viewMode = settings.editorViewMode || 'edit';
  }

  return (
    <div className="flex h-full w-full bg-[#050505] text-gray-200 font-sans selection:bg-blue-500/30 overflow-hidden">
      <aside className="w-64 border-r border-white/5 flex flex-col bg-[#0a0a0a] z-30">
        <div className="p-5 flex items-center justify-between border-b border-white/5 drag">
          <div className="flex items-center gap-2.5 no-drag">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg"><BrainCircuit size={18} /></div>
            <span className="font-bold tracking-tight text-white">ThinkTree</span>
          </div>
          <button onClick={() => modals.settings.setShow(true)} className="p-1.5 hover:bg-white/5 rounded-md text-gray-500 hover:text-white no-drag"><Settings size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Explorer</span>
            <button onClick={() => modals.test.setActive('assessment')} className="p-1.5 text-blue-400/80 hover:text-blue-400 no-drag"><Zap size={14} /></button>
          </div>
          {items.filter(i => !i.parentId).sort((a, b) => {
            const order = { 'My Notes': 0, 'AI': 1 };
            return (order[a.title] ?? 99) - (order[b.title] ?? 99) || a.title.localeCompare(b.title);
          }).map(item => (
            <SidebarItem key={item.id} item={item} items={items} onSelect={actions.select} activeNoteId={activeNoteId} activeFolderId={activeFolderId} onAdd={actions.add} onDelete={actions.delete} onToggleContext={actions.cycleContext} onRename={(id, title) => actions.update(id, { title })} isOpen={openFolderIds.has(item.id)} onToggleOpen={actions.toggleFolder} openFolderIds={openFolderIds} />
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-[#070707] relative overflow-hidden">
        {activeNote ? (
          <>
            <div className="h-16 border-b border-white/5 flex items-center px-8 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-10 drag">
              <div className="flex-1 flex items-center gap-4 no-drag">
                <input
                  value={activeNote.title}
                  onChange={e => actions.update(activeNote.id, { title: e.target.value })}
                  className="bg-transparent border-none text-sm font-bold tracking-tight focus:outline-none truncate text-white w-64"
                />
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => actions.update(activeNote.id, { noteType: 'text', language: 'markdown' })}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${activeNote.noteType === 'text' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    Txt
                  </button>
                  <button
                    onClick={() => actions.update(activeNote.id, { noteType: 'code', language: 'jsx' })}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${activeNote.noteType === 'code' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    Code
                  </button>
                </div>

                {/* Edit Mode & Context Controls */}
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-xl border border-white/5">
                    <button onClick={() => modals.settings.setViewMode && modals.settings.setViewMode('edit')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${modals.settings.viewMode === 'edit' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-white'}`}>Edit</button>
                    <button onClick={() => modals.settings.setViewMode && modals.settings.setViewMode('preview')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${modals.settings.viewMode === 'preview' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-white'}`}>Preview</button>
                  </div>

                  <div className="flex items-center gap-1 pl-2">
                    <button
                      onClick={() => actions.cycleContext(activeNote.id)}
                      className="p-1.5 hover:bg-white/5 rounded-lg transition-all group/eye relative"
                      title="" // Tooltip handled by helper
                    >
                      <ContextIcon state={activeNote.includeInAIContext} size={16} />
                    </button>

                    <div className="group/info relative flex items-center">
                      <Info size={14} className="text-gray-600 hover:text-blue-400 cursor-help" />
                      <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl text-[10px] text-gray-400 opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                        <strong className="text-white block mb-1">AI Context Scope</strong>
                        <span className="text-blue-400">● Include</span>: Always visible to AI<br />
                        <span className="text-red-400 opacity-80">● Exclude</span>: Hidden from AI<br />
                        <span className="text-gray-500">○ Manual</span>: Visible if active
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 no-drag">
                <button onClick={() => modals.chat.setShow(true)} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95"><MessageSquare size={14} /> AI Chat</button>
              </div>
            </div>
            <WorkspaceEditor
              item={activeNote}
              onChange={(fields) => actions.update(activeNote.id, fields)}
              onToggleContext={() => actions.cycleContext(activeNote.id)}
              viewMode={settings.editorViewMode || 'edit'}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 text-gray-700"><BrainCircuit size={48} /></div>
            <h2 className="text-2xl font-black text-white mb-3">ThinkTree Workspace</h2>
            <button onClick={() => modals.chat.setShow(true)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold flex items-center gap-3"><Bot size={16} className="text-blue-500" /> Consult Assistant</button>
          </div>
        )}
      </main>

      {modals.chat.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="bg-[#0a0a0a] w-full max-w-3xl h-full max-h-[85vh] rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in">
            <div className="h-16 border-b border-white/5 flex items-center px-6 justify-between drag">
              <div className="flex items-center gap-3 font-bold text-white no-drag">
                <Bot size={20} className="text-blue-500" />
                <span>ThinkAssistant</span>
                {(() => {
                  const stats = engine.buildAIContext(items, activeNoteId, activeFolderId, false, settings.aiRootId);
                  const pct = Math.min(100, Math.round((stats.usage / stats.limit) * 100));
                  return (
                    <div title={`Used: ${stats.usage} / ${stats.limit} chars`} className="flex items-center gap-2 ml-4 px-3 py-1 bg-white/5 rounded-lg border border-white/5 cursor-help">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">{pct}%</span>
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2 no-drag">
                <button onClick={actions.undo} className="p-2 hover:bg-white/5 rounded-lg text-gray-600 hover:text-orange-400"><Undo2 size={16} /></button>
                <button onClick={() => modals.preview.setShow(true)} className="p-2 hover:bg-white/5 rounded-lg text-gray-600 hover:text-blue-400"><Terminal size={16} /></button>
                <button onClick={chat.clear} className="p-2 hover:bg-white/5 rounded-lg text-gray-600 hover:text-red-400"><Trash2 size={16} /></button>
                <button onClick={() => modals.chat.setShow(false)} className="p-1 hover:bg-white/5 rounded-full"><X size={24} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 thinktree-scroll">
              {chat.messages.map((msg, idx) => {
                const actionsPayload = msg.role === 'assistant' ? actions.validateActions(actions.normalizeActions(actions.parseActions(msg.content) || {}, items)) : null;
                const cleanContent = msg.content.replace(/\[\s*ACTIONS_JSON\s*\][\s\S]*?\[\s*\/\s*ACTIONS_JSON\s*\]/gi, '').replace(/```json[\s\S]*?```/gi, '').trim();
                return (
                  <div key={msg.id || idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {cleanContent && <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-3.5 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-300 border border-white/5 whitespace-pre-wrap'}`}>{cleanContent}</div>}
                    {actionsPayload?.actions && !chat.appliedActionIds.has(msg.id) && (
                      <div className="mt-4 w-full max-w-[85%] bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                        <div className="bg-blue-600/10 px-4 py-2 border-b border-white/5 text-[10px] font-black uppercase text-blue-400">Proposed Changes</div>
                        <div className="p-4 space-y-3">
                          {actionsPayload.actions.map((act, i) => (
                            <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{act.type.replace('_', ' ')}</span>
                                {act.content && <button onClick={() => chat.togglePreview(msg.id, i)} className="text-[10px] text-blue-400 font-bold uppercase">{chat.expandedPreviewIds.has(`${msg.id}-${i}`) ? 'Hide' : 'View'}</button>}
                              </div>
                              <p className="text-xs text-gray-300 mb-1">{act.reason}</p>
                              {chat.expandedPreviewIds.has(`${msg.id}-${i}`) && act.content && <pre className="mt-2 p-3 rounded bg-black/40 text-[11px] overflow-x-auto whitespace-pre-wrap">{act.content}</pre>}
                            </div>
                          ))}
                        </div>
                        <div className="p-3 bg-white/[0.03] border-t border-white/5 flex gap-2">
                          <button onClick={() => actions.apply(msg.id, actionsPayload)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"><CheckCircle2 size={14} /> Apply Changes</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {chat.isLoading && <div className="text-gray-500 text-sm animate-pulse">Processing knowledge...</div>}
              <div ref={refs.chatEndRef} />
            </div>
            <div className="p-6 border-t border-white/5 bg-[#0a0a0a]">
              <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl p-2 border border-white/5 focus-within:border-blue-600/50 transition-all">
                <textarea value={chat.input} onChange={e => chat.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), chat.send())} placeholder="Consult knowledge context..." className="flex-1 bg-transparent border-none resize-none focus:outline-none text-sm p-2 max-h-40 placeholder:text-gray-700 thinktree-scroll" rows={1} />
                <button onClick={chat.send} disabled={chat.isLoading || !chat.input.trim()} className="w-9 h-9 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-lg flex items-center justify-center shadow-lg"><Send size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modals.settings.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#111] w-full max-w-md rounded-3xl border border-white/10 p-8 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-white">Engine</h2><button onClick={() => modals.settings.setShow(false)} className="text-gray-500 hover:text-white"><X size={24} /></button></div>
            <div className="space-y-4">
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase">Provider</label><select value={settings.provider} onChange={e => setSettings({ ...settings, provider: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-white outline-none"><option value="ollama">Ollama</option><option value="openai-compat">OpenAI-Compatible</option></select></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase">Endpoint</label><input value={settings.endpoint} onChange={e => setSettings({ ...settings, endpoint: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-white outline-none" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase">Model</label><input value={settings.model} onChange={e => setSettings({ ...settings, model: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-white outline-none" /></div>
              <button onClick={() => setSettings({ ...settings, showStats: !settings.showStats })} className="text-[10px] font-bold text-blue-400 uppercase">Toggle Stats</button>
              {settings.showStats && <div className="text-[10px] text-gray-500">Latency: {chat.lastLatency}ms</div>}

              <div className="pt-4 border-t border-white/5 space-y-2">
                <button onClick={engine.exportData} className="w-full bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-xl text-xs font-bold transition-all border border-white/5 flex items-center justify-center gap-2"><Save size={14} /> Backup Brain (Export JSON)</button>
                <div className="relative">
                  <input type="file" accept=".json" onChange={(e) => { if (e.target.files[0]) engine.importData(e.target.files[0]); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <button className="w-full bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-xl text-xs font-bold transition-all border border-white/5 flex items-center justify-center gap-2"><RefreshCw size={14} /> Restore Brain (Import JSON)</button>
                </div>
                <button onClick={engine.factoryReset} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-xl text-xs font-bold transition-all border border-red-500/10 flex items-center justify-center gap-2 mt-2"><Trash2 size={14} /> Factory Reset (Clear Data)</button>
              </div>
            </div>
            <button onClick={() => modals.settings.setShow(false)} className="w-full bg-blue-600 py-4 rounded-2xl font-black text-white hover:bg-blue-500 transition-all">Apply Configurations</button>
          </div>
        </div>
      )}

      {modals.preview.show && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-8">
          <div className="bg-[#050505] w-full max-w-5xl h-full rounded-3xl border border-white/10 flex flex-col shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#0a0a0a]">
              <h2 className="text-xl font-bold text-white flex items-center gap-3"><Terminal size={22} className="text-blue-400" /> AI System Prompt Preview</h2>
              <button onClick={() => modals.preview.setShow(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <pre className="flex-1 overflow-y-auto p-10 font-mono text-sm text-gray-400 whitespace-pre-wrap">{(() => {
              const { prompt, usage, limit } = engine.buildAIContext(items, activeNoteId, activeFolderId, false, settings.aiRootId);
              return `/* CONTEXT USAGE: ${usage}/${limit} chars (${Math.round(usage / limit * 100)}%) */\n\n${prompt}`;
            })()}</pre>
          </div>
        </div>
      )}

      {modals.test.active === 'assessment' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="bg-[#0a0a0a] w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl border border-white/10 flex overflow-hidden">
            {/* Modal Sidebar */}
            <div className="w-64 bg-[#050505] border-r border-white/5 flex flex-col p-6">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Zap size={20} className="text-blue-500" /> Assessment</h2>
              <div className="space-y-2">
                {['personality', 'interests', 'learning'].map(tab => (
                  <button key={tab} onClick={() => modals.test.setTab(tab)} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${modals.test.tab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="mt-auto">
                {/* <button onClick={() => modals.test.setActive(null)} className="flex items-center gap-2 text-gray-500 hover:text-white text-xs font-bold px-4"><Undo2 size={14} /> Close</button> */}
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
              <button onClick={() => modals.test.setActive(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white z-10 transition-all"><X size={20} /></button>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* PERSONALITY TAB */}
                {modals.test.tab === 'personality' && (
                  <div className="space-y-10 animate-in">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Myers-Briggs (MBTI)</h3>
                      <p className="text-gray-400 text-sm mb-6">Determine your cognitive processing style.</p>
                      <div className="space-y-4">
                        {MBTI_QUESTIONS.map(q => (
                          <div key={q.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <p className="text-sm font-medium text-gray-200 mb-3">{q.q}</p>
                            <div className="flex gap-3">
                              <button onClick={() => test.mbti.setAnswers({ ...test.mbti.answers, [q.id]: 'a' })} className={`flex-1 py-2 rounded-xl text-xs ${test.mbti.answers[q.id] === 'a' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{q.a}</button>
                              <button onClick={() => test.mbti.setAnswers({ ...test.mbti.answers, [q.id]: 'b' })} className={`flex-1 py-2 rounded-xl text-xs ${test.mbti.answers[q.id] === 'b' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{q.b}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={test.mbti.finish} className="mt-4 px-6 py-3 bg-white/5 hover:bg-green-600/20 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold transition-all">Save MBTI Result</button>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Core Values</h3>
                      <p className="text-gray-400 text-sm mb-6">Select up to 5 values that drive your decisions.</p>
                      <div className="flex flex-wrap gap-2">
                        {VALUES_OPTIONS.map(val => (
                          <button key={val}
                            onClick={() => {
                              const has = test.values.selection.includes(val);
                              if (has) test.values.setSelection(prev => prev.filter(x => x !== val));
                              else if (test.values.selection.length < 5) test.values.setSelection(prev => [...prev, val]);
                            }}
                            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${test.values.selection.includes(val) ? 'bg-amber-500 text-black border-amber-500' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30'}`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <button onClick={test.values.finish} className="mt-6 px-6 py-3 bg-white/5 hover:bg-green-600/20 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold transition-all">Save Values</button>
                    </div>
                  </div>
                )}

                {/* INTERESTS TAB */}
                {modals.test.tab === 'interests' && (
                  <div className="space-y-10 animate-in">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Interests & Passions</h3>
                      <p className="text-gray-400 text-sm mb-6">What topics excite you?</p>
                      <div className="flex flex-wrap gap-2">
                        {INTERESTS_OPTIONS.map(opt => (
                          <button key={opt}
                            onClick={() => test.interests.setSelection(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                            className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${test.interests.selection.includes(opt) ? 'bg-purple-600 text-white border-purple-500' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Current Goals</h3>
                      <p className="text-gray-400 text-sm mb-6">What are you striving for?</p>
                      <div className="flex flex-wrap gap-2">
                        {GOALS_OPTIONS.map(opt => (
                          <button key={opt}
                            onClick={() => test.interests.setGoals(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                            className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${test.interests.goals.includes(opt) ? 'bg-pink-600 text-white border-pink-500' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <button onClick={test.interests.finish} className="mt-8 w-full bg-white/5 hover:bg-green-600/20 text-green-400 border border-green-500/30 py-4 rounded-xl text-sm font-bold transition-all">Save Interests & Goals Profile</button>
                    </div>
                  </div>
                )}

                {/* LEARNING TAB */}
                {modals.test.tab === 'learning' && (
                  <div className="space-y-8 animate-in">
                    <h3 className="text-2xl font-bold text-white mb-2">Learning Style (VARK)</h3>
                    <p className="text-gray-400 text-sm mb-6">How do you best process information?</p>
                    <div className="space-y-6">
                      {VARK_QUESTIONS.map(q => (
                        <div key={q.id} className="space-y-3">
                          <p className="text-sm font-medium text-white">{q.q}</p>
                          <div className="grid grid-cols-1 gap-2">
                            {q.options.map((opt, i) => (
                              <button key={i}
                                onClick={() => test.learning.setAnswers({ ...test.learning.answers, [q.id]: opt.type })}
                                className={`border px-4 py-3 rounded-xl text-left text-xs font-bold transition-all flex justify-between ${test.learning.answers[q.id] === opt.type ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                              >
                                <span>{opt.label}</span>
                                <span className="opacity-50 text-[10px]">{opt.type}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={test.learning.finish} className="mt-6 px-6 py-3 bg-white/5 hover:bg-green-600/20 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold transition-all">Save Learning Profile</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .thinktree-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .thinktree-scroll::-webkit-scrollbar-track { background: transparent; }
        .thinktree-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .thinktree-scroll::-webkit-scrollbar-thumb:hover { background: #444; }

        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }

        .drag { -webkit-app-region: drag; }
        .no-drag { -webkit-app-region: no-drag; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}
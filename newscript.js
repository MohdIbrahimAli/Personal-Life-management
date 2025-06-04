// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  push, 
  remove,
  update
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';

// Updated Firebase configuration - You'll need to replace these with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyAR5PUXrKhyDepK9UTVX8HGTELmbAomW0Y",
  authDomain: "personallifemanagement-148f7.firebaseapp.com",
  databaseURL: "https://personallifemanagement-148f7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "personallifemanagement-148f7",
  storageBucket: "personallifemanagement-148f7.appspot.com",
  messagingSenderId: "244653313777",
  appId: "1:244653313777:web:d1fe18e1da3dc91f89e350",
  measurementId: "G-E57L0MBKR8"
};


// Initialize Firebase
let app;
let auth;
let database;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);
  
  // Set persistence for auth
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log('Firebase auth persistence set successfully');
    })
    .catch((error) => {
      console.warn('Auth persistence error:', error);
    });
    
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Fallback to local storage if Firebase fails
  alert('Firebase connection failed. App will run in offline mode.');
}

let currentUser = null;
const state = {
  tasks: [],
  income: [],
  expenses: [],
  habits: [],
  notes: '',
  pomodoro: {
    time: 25 * 60,
    interval: null,
    running: false
  }
};

const getEl = id => document.getElementById(id);
const today = () => new Date().toISOString().split("T")[0];

// Initialize app when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  initDateFields();
  setupAuth();
  setupNav();
  setupEventListeners();
  setupPomodoro();
  loadExcelLibrary();
});

// Load Excel library dynamically
async function loadExcelLibrary() {
  try {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
    window.XLSX = XLSX;
    console.log('Excel library loaded successfully');
  } catch (error) {
    console.error('Failed to load XLSX library:', error);
  }
}

function initDateFields() {
  ['taskDueDate', 'incomeDate', 'expenseDate'].forEach(id => {
    const el = getEl(id);
    if (el) el.value = today();
  });
}

function setupAuth() {
  if (!auth) {
    console.error('Firebase Auth not initialized');
    return;
  }

  // Listen for auth state changes
  onAuthStateChanged(auth, user => {
    console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
    currentUser = user;
    toggleUI(user);
    if (user) {
      console.log('Loading data for user:', user.uid);
      loadUserData(user.uid);
    } else {
      // Clear state when user logs out
      clearAppState();
    }
  }, error => {
    console.error('Auth state change error:', error);
  });

  let isSignUp = false;
  
  const authToggleBtn = getEl('authToggleBtn');
  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', () => {
      isSignUp = !isSignUp;
      updateAuthUI(isSignUp);
    });
  }

  const authForm = getEl('authForm');
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = getEl('email').value.trim();
      const password = getEl('password').value;
      const msg = getEl('authMessage');

      if (!email || !password) {
        showMessage(msg, 'Please fill in all fields', 'error');
        return;
      }

      if (password.length < 6) {
        showMessage(msg, 'Password must be at least 6 characters', 'error');
        return;
      }

      try {
        showMessage(msg, isSignUp ? 'Creating account...' : 'Signing in...', 'info');
        
        let userCredential;
        if (isSignUp) {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await initializeUserData(userCredential.user.uid);
          showMessage(msg, 'Account created successfully!', 'success');
        } else {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
          showMessage(msg, 'Signed in successfully!', 'success');
        }
        
        // Clear form
        getEl('email').value = '';
        getEl('password').value = '';
        
      } catch (error) {
        console.error('Auth error:', error);
        showMessage(msg, parseAuthError(error.code), 'error');
      }
    });
  }

  const logoutBtn = getEl('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        console.log('User signed out successfully');
      } catch (error) {
        console.error('Sign out error:', error);
      }
    });
  }
}

function updateAuthUI(isSignUp) {
  getEl('authTitle').textContent = isSignUp ? 'Create Account' : 'Welcome Back';
  getEl('authSubmitBtn').textContent = isSignUp ? 'Sign Up' : 'Sign In';
  getEl('authToggleText').textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
  getEl('authToggleBtn').textContent = isSignUp ? 'Sign In' : 'Sign Up';
  
  // Clear any existing messages
  const msg = getEl('authMessage');
  if (msg) msg.innerHTML = '';
}

function showMessage(el, msg, type) {
  if (!el) return;
  const className = type === 'info' ? 'info-message' : `${type}-message`;
  el.innerHTML = `<div class="${className}">${msg}</div>`;
  
  if (type !== 'info') {
    setTimeout(() => (el.innerHTML = ''), 5000);
  }
}

function toggleUI(loggedIn) {
  const authContainer = getEl('authContainer');
  const dashboardContainer = getEl('dashboardContainer');
  
  if (authContainer) authContainer.style.display = loggedIn ? 'none' : 'flex';
  if (dashboardContainer) dashboardContainer.style.display = loggedIn ? 'block' : 'none';
  
  if (loggedIn) {
    const userEmail = getEl('userEmail');
    if (userEmail) userEmail.textContent = loggedIn.email;
  }
}

function parseAuthError(code) {
  const errorMap = {
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'Email/password authentication is not enabled.'
  };
  return errorMap[code] || `Authentication error: ${code}`;
}

async function initializeUserData(uid) {
  if (!database) {
    console.error('Database not initialized');
    return;
  }
  
  try {
    const userData = {
      tasks: {},
      income: {},
      expenses: {},
      habits: {},
      notes: '',
      createdAt: new Date().toISOString()
    };
    
    await set(ref(database, `users/${uid}`), userData);
    console.log('User data initialized successfully');
  } catch (error) {
    console.error('Error initializing user data:', error);
  }
}

function loadUserData(uid) {
  if (!database) {
    console.error('Database not initialized');
    return;
  }

  const dataTypes = ['tasks', 'income', 'expenses', 'habits', 'notes'];
  
  dataTypes.forEach(dataType => {
    const dataRef = ref(database, `users/${uid}/${dataType}`);
    
    onValue(dataRef, (snapshot) => {
      try {
        const data = snapshot.val();
        
        if (dataType === 'notes') {
          state.notes = data || '';
          const notesArea = getEl('notesArea');
          if (notesArea) notesArea.value = state.notes;
        } else {
          state[dataType] = data ? 
            Object.entries(data).map(([id, val]) => ({ id, ...val })) : 
            [];
        }
        
        render();
        console.log(`${dataType} data loaded:`, state[dataType]);
      } catch (error) {
        console.error(`Error loading ${dataType}:`, error);
      }
    }, (error) => {
      console.error(`Database read error for ${dataType}:`, error);
    });
  });
}

function clearAppState() {
  state.tasks = [];
  state.income = [];
  state.expenses = [];
  state.habits = [];
  state.notes = '';
  
  const notesArea = getEl('notesArea');
  if (notesArea) notesArea.value = '';
  
  render();
}

function render() {
  renderTasks();
  renderIncome();
  renderExpenses();
  renderHabits();
  renderDashboard();
}

// Navigation setup
function setupNav() {
  document.querySelectorAll('.nav button').forEach(btn => {
    btn.addEventListener('click', e => {
      const onclick = btn.getAttribute('onclick');
      if (onclick) {
        const match = onclick.match(/'([^']+)'/);
        if (match) {
          const id = match[1];
          showSection(id);
          // Update active state
          document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      }
    });
  });
}

// Global function for navigation (called from HTML onclick)
window.showSection = function(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const section = getEl(id);
  if (section) section.classList.add('active');
}

function setupEventListeners() {
  // Notes auto-save with debouncing
  const notesArea = getEl('notesArea');
  if (notesArea) {
    let saveTimeout;
    notesArea.addEventListener('input', () => {
      if (currentUser) {
        state.notes = notesArea.value;
        
        // Debounce the save operation
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          updateFirebase('notes', notesArea.value);
        }, 1000);
      }
    });
  }

  // Enter key shortcuts
  const shortcuts = [
    { id: 'taskTitle', fn: addTask },
    { id: 'incomeSource', fn: addIncome },
    { id: 'expenseDescription', fn: addExpense },
    { id: 'habitName', fn: addHabit }
  ];

  shortcuts.forEach(({ id, fn }) => {
    const el = getEl(id);
    if (el) {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          fn();
        }
      });
    }
  });

  // Filter functionality
  const filterCategory = getEl('filterCategory');
  if (filterCategory) {
    filterCategory.addEventListener('change', filterTasks);
  }
}

function setupPomodoro() {
  const display = getEl('pomodoroDisplay');
  const dashboardTimer = getEl('dashboardTimer');
  
  const updateDisplay = () => {
    const min = Math.floor(state.pomodoro.time / 60);
    const sec = state.pomodoro.time % 60;
    const timeStr = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    if (display) display.textContent = timeStr;
    if (dashboardTimer) dashboardTimer.textContent = timeStr;
  };
  
  updateDisplay();

  // Global pomodoro functions for HTML onclick
  window.startPomodoro = function() {
    if (!state.pomodoro.running) {
      state.pomodoro.running = true;
      state.pomodoro.interval = setInterval(() => {
        state.pomodoro.time--;
        updateDisplay();
        if (state.pomodoro.time <= 0) {
          clearInterval(state.pomodoro.interval);
          playNotificationSound();
          alert("🍅 Pomodoro session complete! Great work!");
          resetPomodoro();
        }
      }, 1000);
    }
  };

  window.pausePomodoro = function() {
    clearInterval(state.pomodoro.interval);
    state.pomodoro.running = false;
  };

  window.resetPomodoro = function() {
    clearInterval(state.pomodoro.interval);
    state.pomodoro.time = 25 * 60;
    state.pomodoro.running = false;
    updateDisplay();
  };

  window.startQuickPomodoro = function() {
    window.startPomodoro();
  };
}

function playNotificationSound() {
  try {
    const audio = new Audio();
    audio.src = 'https://www.soundjay.com/button/beep-07.wav'; // Replace with your sound URL
    audio.volume = 0.5; // Set volume to 50%
    audio.play().catch(() => {}); // Ignore errors if audio fails
  } catch (error) {
    // Silently fail if audio not supported
  }
}

// Firebase database functions
async function saveToFirebase(type, data) {
  if (!currentUser || !database) {
    console.error('User not authenticated or database not initialized');
    return;
  }

  try {
    const newRef = push(ref(database, `users/${currentUser.uid}/${type}`));
    const newId = newRef.key;

    const dataWithId = { id: newId, ...data };

    await set(newRef, dataWithId);
    console.log(`${type} saved successfully with ID: ${newId}`);
  } catch (error) {
    console.error(`Error saving ${type}:`, error);
    alert(`Failed to save ${type}. Please try again.`);
  }
}
async function updateFirebase(type, data) {
  if (!currentUser || !database) {
    console.error('User not authenticated or database not initialized');
    return;
  }
  
  try {
    await set(ref(database, `users/${currentUser.uid}/${type}`), data);
    console.log(`${type} updated successfully`);
  } catch (error) {
    console.error(`Error updating ${type}:`, error);
  }
}

// NEW: Function to update specific task in Firebase
async function updateTaskInFirebase(taskId, updates) {
  if (!currentUser || !database) {
    console.error('User not authenticated or database not initialized');
    return;
  }
  
  try {
    await update(ref(database, `users/${currentUser.uid}/tasks/${taskId}`), updates);
    console.log('Task updated successfully');
  } catch (error) {
    console.error('Error updating task:', error);
    alert('Failed to update task. Please try again.');
  }
}

// Render functions
function renderTasks() {
  const container = getEl('tasksList');
  if (!container) return;
  
  const filter = getEl('filterCategory')?.value || 'all';
  const filteredTasks = filter === 'all' ? state.tasks : state.tasks.filter(t => t.category === filter);
  
  if (filteredTasks.length === 0) {
    container.innerHTML = '<div class="empty-state">No tasks found. Add your first task above!</div>';
    return;
  }

  // Sort tasks: incomplete first, then by due date
  const sortedTasks = filteredTasks.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; // Incomplete tasks first
    }
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  container.innerHTML = sortedTasks.map(t => `
    <div class="task-item priority-${t.priority} ${t.completed ? 'completed' : ''} ${isOverdue(t.dueDate) && !t.completed ? 'overdue' : ''}">
      <div class="task-header">
        <div class="task-checkbox-title">
          <input 
            type="checkbox" 
            id="task-${t.id}" 
            ${t.completed ? 'checked' : ''} 
            onchange="toggleTaskCompletion('${t.id}')"
            class="task-checkbox"
          />
          <label for="task-${t.id}" class="task-title ${t.completed ? 'completed-text' : ''}">${escapeHtml(t.title)}</label>
        </div>
        <div class="task-completion-status">
          ${t.completed ? '<span class="completion-badge">✅ Completed</span>' : ''}
        </div>
      </div>
      <div class="task-meta">
        <span class="category-badge">${t.category}</span>
        <span class="due-date">Due: ${formatDate(t.dueDate)}</span>
        <span class="priority-badge priority-${t.priority}">${t.priority}</span>
        ${t.completedAt ? `<span class="completed-date">Completed: ${formatDate(t.completedAt.split('T')[0])}</span>` : ''}
      </div>
      <div class="task-actions">
        ${!t.completed ? `<button class="btn btn-small btn-success" onclick="toggleTaskCompletion('${t.id}')">Mark Complete</button>` : ''}
        ${t.completed ? `<button class="btn btn-small btn-warning" onclick="toggleTaskCompletion('${t.id}')">Mark Incomplete</button>` : ''}
        <button class="btn btn-small btn-danger" onclick="deleteFromFirebase('tasks', '${t.id}')">Delete</button>
      </div>
    </div>
  `).join('');

  updateDashboardTasks();
}

// NEW: Function to toggle task completion
window.toggleTaskCompletion = async function(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  const updates = {
    completed: !task.completed,
    completedAt: !task.completed ? new Date().toISOString() : null
  };
  
  // Update local state immediately for responsiveness
  task.completed = updates.completed;
  task.completedAt = updates.completedAt;
  
  // Re-render to show immediate changes
  renderTasks();
  renderDashboard();
  
  // Update Firebase
  await updateTaskInFirebase(taskId, updates);
};

function updateDashboardTasks() {
  // Update dashboard today's tasks (only incomplete ones)
  const todayTasks = getEl('todayTasks');
  if (todayTasks) {
    const todaysTaskList = state.tasks.filter(t => t.dueDate === today() && !t.completed);
    todayTasks.innerHTML = todaysTaskList.length > 0 
      ? todaysTaskList.map(t => `<div class="quick-task">${escapeHtml(t.title)}</div>`).join('')
      : '<div class="empty-state">No pending tasks for today</div>';
  }

  // Update upcoming deadlines (only incomplete tasks)
  const upcomingDeadlines = getEl('upcomingDeadlines');
  if (upcomingDeadlines) {
    const upcoming = state.tasks
      .filter(t => {
        const taskDate = new Date(t.dueDate);
        const now = new Date();
        const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        return taskDate > now && taskDate <= weekFromNow && !t.completed;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    upcomingDeadlines.innerHTML = upcoming.length > 0
      ? upcoming.map(t => `<div class="quick-task">${escapeHtml(t.title)} - ${formatDate(t.dueDate)}</div>`).join('')
      : '<div class="empty-state">No upcoming deadlines</div>';
  }
}

function renderIncome() {
  const container = getEl('incomeList');
  if (!container) return;
  
  if (state.income.length === 0) {
    container.innerHTML = '<div class="empty-state">No income records yet.</div>';
    return;
  }

  container.innerHTML = state.income
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(i => `
      <div class="income-item">
        <div class="income-header">
          <strong>${escapeHtml(i.source)}</strong>
          <span class="amount">+$${i.amount.toFixed(2)}</span>
        </div>
        <div class="income-date">${formatDate(i.date)}</div>
        <button class="btn btn-small btn-danger" onclick="deleteFromFirebase('income', '${i.id}')">Delete</button>
      </div>
    `).join('');
}

function renderExpenses() {
  const container = getEl('expenseList');
  if (!container) return;
  
  if (state.expenses.length === 0) {
    container.innerHTML = '<div class="empty-state">No expense records yet.</div>';
    return;
  }

  container.innerHTML = state.expenses
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(e => `
      <div class="expense-item">
        <div class="expense-header">
          <strong>${escapeHtml(e.description)}</strong>
          <span class="amount expense-amount">-$${e.amount.toFixed(2)}</span>
        </div>
        <div class="expense-meta">
          <span class="category-badge">${e.category}</span>
          <span class="expense-date">${formatDate(e.date)}</span>
        </div>
        <button class="btn btn-small btn-danger" onclick="deleteFromFirebase('expenses', '${e.id}')">Delete</button>
      </div>
    `).join('');
}

function renderHabits() {
  const container = getEl('habitsList');
  if (!container) return;
  
  if (state.habits.length === 0) {
    container.innerHTML = '<div class="empty-state">No habits tracked yet. Add your first habit above!</div>';
    return;
  }

  container.innerHTML = state.habits.map(h => `
    <div class="habit-item">
      <div class="habit-header">
        <strong>${escapeHtml(h.name)}</strong>
        <span class="habit-streak">Added ${formatDate(h.createdAt?.split('T')[0])}</span>
      </div>
      <div class="habit-actions">
        <button class="btn btn-small btn-danger" onclick="deleteFromFirebase('habits', '${h.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderDashboard() {
  // Update task statistics
  const totalTasksEl = getEl('totalTasks');
  const completedTasksEl = getEl('completedTasks');
  
  if (totalTasksEl) totalTasksEl.textContent = state.tasks.length;
  if (completedTasksEl) completedTasksEl.textContent = state.tasks.filter(t => t.completed).length;
  
  // Calculate monthly totals
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyIncome = state.income
    .filter(i => {
      const date = new Date(i.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    
  const monthlyExpenses = state.expenses
    .filter(e => {
      const date = new Date(e.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const monthlyIncomeEl = getEl('monthlyIncome');
  const monthlyExpensesEl = getEl('monthlyExpenses');
  
  if (monthlyIncomeEl) monthlyIncomeEl.textContent = `$${monthlyIncome.toFixed(2)}`;
  if (monthlyExpensesEl) monthlyExpensesEl.textContent = `$${monthlyExpenses.toFixed(2)}`;
}

// Global functions for HTML onclick events
window.addTask = function() {
  const titleEl = getEl('taskTitle');
  const priorityEl = getEl('taskPriority');
  const categoryEl = getEl('taskCategory');
  const dueDateEl = getEl('taskDueDate');
  
  if (!titleEl?.value.trim()) {
    alert('Please enter a task title');
    titleEl?.focus();
    return;
  }

  const task = {
    title: titleEl.value.trim(),
    priority: priorityEl?.value || 'medium',
    category: categoryEl?.value || 'personal',
    dueDate: dueDateEl?.value || today(),
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString()
  };
  
  saveToFirebase('tasks', task);
  titleEl.value = '';
  titleEl.focus();
};

window.addIncome = function() {
  const sourceEl = getEl('incomeSource');
  const amountEl = getEl('incomeAmount');
  const dateEl = getEl('incomeDate');
  
  if (!sourceEl?.value.trim()) {
    alert('Please enter an income source');
    sourceEl?.focus();
    return;
  }
  
  if (!amountEl?.value || parseFloat(amountEl.value) <= 0) {
    alert('Please enter a valid amount');
    amountEl?.focus();
    return;
  }

  const income = {
    source: sourceEl.value.trim(),
    amount: parseFloat(amountEl.value) || 0,
    date: dateEl?.value || today(),
    createdAt: new Date().toISOString()
  };
  
  saveToFirebase('income', income);
  sourceEl.value = '';
  amountEl.value = '';
  sourceEl.focus();
};

window.addExpense = function() {
  const descEl = getEl('expenseDescription');
  const amountEl = getEl('expenseAmount');
  const categoryEl = getEl('expenseCategory');
  const dateEl = getEl('expenseDate');
  
  if (!descEl?.value.trim()) {
    alert('Please enter an expense description');
    descEl?.focus();
    return;
  }
  
  if (!amountEl?.value || parseFloat(amountEl.value) <= 0) {
    alert('Please enter a valid amount');
    amountEl?.focus();
    return;
  }

  const expense = {
    description: descEl.value.trim(),
    amount: parseFloat(amountEl.value) || 0,
    category: categoryEl?.value || 'other',
    date: dateEl?.value || today(),
    createdAt: new Date().toISOString()
  };
  
  saveToFirebase('expenses', expense);
  descEl.value = '';
  amountEl.value = '';
  descEl.focus();
};

window.addHabit = function() {
  const nameEl = getEl('habitName');
  
  if (!nameEl?.value.trim()) {
    alert('Please enter a habit name');
    nameEl?.focus();
    return;
  }

  const habit = {
    name: nameEl.value.trim(),
    createdAt: new Date().toISOString()
  };
  
  saveToFirebase('habits', habit);
  nameEl.value = '';
  nameEl.focus();
};

window.saveNotes = function() {
  const notesArea = getEl('notesArea');
  if (notesArea && currentUser) {
    updateFirebase('notes', notesArea.value);
    alert('Notes saved!');
  }
};

window.filterTasks = function() {
  renderTasks();
};

window.deleteFromFirebase = async function(collection, id) {
  if (!currentUser || !database) {
    console.error('User not authenticated or database not initialized');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this item?')) {
    return;
  }
  
  try {
    await remove(ref(database, `users/${currentUser.uid}/${collection}/${id}`));
    console.log(`${collection} deleted successfully`);
  } catch (error) {
    console.error(`Error deleting ${collection}:`, error);
    alert(`Failed to delete ${collection}. Please try again.`);
  }
};

// Excel export function
window.exportToExcel = function() {
  if (!window.XLSX) {
    alert('Excel library not loaded. Please try again.');
    return;
  }

  try {
    const wb = window.XLSX.utils.book_new();
    
    // Add sheets for each data type
    const addSheet = (data, name) => {
      const ws = window.XLSX.utils.json_to_sheet(data);
      window.XLSX.utils.book_append_sheet(wb, ws, name);
    };
    
    addSheet(state.tasks, 'Tasks');
    addSheet(state.income, 'Income');
    addSheet(state.expenses, 'Expenses');
    addSheet(state.habits, 'Habits');
    
    // Add notes as a separate sheet
    if (state.notes) {
      const notesData = [{ Notes: state.notes }];
      addSheet(notesData, 'Notes');
    }

    window.XLSX.writeFile(wb, `PersonalDashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Export error:', error);
    alert('Error exporting data. Please try again.');
  }
};

// Helper functions
function isOverdue(dueDate) {
  return new Date(dueDate) < new Date().setHours(0, 0, 0, 0);
}

function formatDate(dateStr) {
  if (!dateStr) return 'No date';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
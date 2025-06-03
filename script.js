// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  push, 
  remove 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';

// Firebase configuration
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

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
  onAuthStateChanged(auth, user => {
    currentUser = user;
    toggleUI(user);
    if (user) loadUserData(user.uid);
  });

  let isSignUp = false;
  
  const authToggleBtn = getEl('authToggleBtn');
  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', () => {
      isSignUp = !isSignUp;
      getEl('authTitle').textContent = isSignUp ? 'Create Account' : 'Welcome Back';
      getEl('authSubmitBtn').textContent = isSignUp ? 'Sign Up' : 'Sign In';
      getEl('authToggleText').textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
      getEl('authToggleBtn').textContent = isSignUp ? 'Sign In' : 'Sign Up';
    });
  }

  const authForm = getEl('authForm');
  if (authForm) {
    authForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = getEl('email').value;
      const password = getEl('password').value;
      const msg = getEl('authMessage');

      const fn = isSignUp ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
      fn(auth, email, password)
        .then(cred => {
          showMessage(msg, isSignUp ? 'Account created!' : 'Signed in!', 'success');
          if (isSignUp) initializeUserData(cred.user.uid);
        })
        .catch(err => showMessage(msg, parseAuthError(err.code), 'error'));
    });
  }

  const logoutBtn = getEl('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
  }
}

function showMessage(el, msg, type) {
  if (!el) return;
  el.innerHTML = `<div class="${type}-message">${msg}</div>`;
  setTimeout(() => (el.innerHTML = ''), 4000);
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
  const map = {
    'auth/email-already-in-use': 'Email already registered.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password too weak.',
    'auth/user-not-found': 'No account found.',
    'auth/wrong-password': 'Wrong password.',
    'auth/too-many-requests': 'Too many attempts. Try again later.'
  };
  return map[code] || 'Authentication error.';
}

function initializeUserData(uid) {
  set(ref(database, `users/${uid}`), {
    tasks: {}, income: {}, expenses: {}, habits: {}, notes: ''
  });
}

function loadUserData(uid) {
  ['tasks', 'income', 'expenses', 'habits', 'notes'].forEach(key => {
    onValue(ref(database, `users/${uid}/${key}`), snapshot => {
      const data = snapshot.val();
      if (key === 'notes') {
        state.notes = data || '';
        const area = getEl('notesArea');
        if (area) area.value = state.notes;
      } else {
        state[key] = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
        render();
      }
    });
  });
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
  // Notes auto-save
  const notesArea = getEl('notesArea');
  if (notesArea) {
    notesArea.addEventListener('input', () => {
      if (currentUser) {
        state.notes = notesArea.value;
        updateFirebase('notes', notesArea.value);
      }
    });
  }

  // Enter key shortcuts
  const taskTitle = getEl('taskTitle');
  if (taskTitle) {
    taskTitle.addEventListener('keydown', e => {
      if (e.key === 'Enter') addTask();
    });
  }

  const incomeSource = getEl('incomeSource');
  if (incomeSource) {
    incomeSource.addEventListener('keydown', e => {
      if (e.key === 'Enter') addIncome();
    });
  }

  const expenseDescription = getEl('expenseDescription');
  if (expenseDescription) {
    expenseDescription.addEventListener('keydown', e => {
      if (e.key === 'Enter') addExpense();
    });
  }

  const habitName = getEl('habitName');
  if (habitName) {
    habitName.addEventListener('keydown', e => {
      if (e.key === 'Enter') addHabit();
    });
  }

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
          alert("Pomodoro session complete!");
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

// Render functions
function renderTasks() {
  const container = getEl('tasksList');
  if (!container) return;
  
  const filter = getEl('filterCategory')?.value || 'all';
  const filteredTasks = filter === 'all' ? state.tasks : state.tasks.filter(t => t.category === filter);
  
  container.innerHTML = filteredTasks.map(t => `
    <div class="task-item priority-${t.priority} ${isOverdue(t.dueDate) ? 'overdue' : ''}">
      <div class="task-title">${escapeHtml(t.title)}</div>
      <div class="task-meta">${t.category} | Due: ${formatDate(t.dueDate)} | Priority: ${t.priority}</div>
      <div class="task-actions">
        <button class="btn btn-small btn-danger" onclick="deleteFromFirebase('tasks', '${t.id}')">Delete</button>
      </div>
    </div>
  `).join('');

  // Update dashboard today's tasks
  const todayTasks = getEl('todayTasks');
  if (todayTasks) {
    const todaysTaskList = state.tasks.filter(t => t.dueDate === today());
    todayTasks.innerHTML = todaysTaskList.length > 0 
      ? todaysTaskList.map(t => `<div class="quick-task">${escapeHtml(t.title)}</div>`).join('')
      : 'No tasks for today';
  }

  // Update upcoming deadlines
  const upcomingDeadlines = getEl('upcomingDeadlines');
  if (upcomingDeadlines) {
    const upcoming = state.tasks
      .filter(t => new Date(t.dueDate) > new Date() && new Date(t.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    upcomingDeadlines.innerHTML = upcoming.length > 0
      ? upcoming.map(t => `<div class="quick-task">${escapeHtml(t.title)} - ${formatDate(t.dueDate)}</div>`).join('')
      : 'No upcoming deadlines';
  }
}

function renderIncome() {
  const container = getEl('incomeList');
  if (!container) return;
  container.innerHTML = state.income.map(i => `
    <div class="income-item">
      <div><strong>${escapeHtml(i.source)}</strong> - $${i.amount.toFixed(2)} (${formatDate(i.date)})</div>
      <button class="btn btn-small btn-danger" onclick="deleteFromFirebase('income', '${i.id}')">Delete</button>
    </div>
  `).join('');
}

function renderExpenses() {
  const container = getEl('expenseList');
  if (!container) return;
  container.innerHTML = state.expenses.map(e => `
    <div class="expense-item">
      <div><strong>${escapeHtml(e.description)}</strong> - $${e.amount.toFixed(2)} (${e.category}, ${formatDate(e.date)})</div>
      <button class="btn btn-small btn-danger" onclick="deleteFromFirebase('expenses', '${e.id}')">Delete</button>
    </div>
  `).join('');
}

function renderHabits() {
  const container = getEl('habitsList');
  if (!container) return;
  container.innerHTML = state.habits.map(h => `
    <div class="habit-item">
      <div><strong>${escapeHtml(h.name)}</strong></div>
      <button class="btn btn-small btn-danger" onclick="deleteFromFirebase('habits', '${h.id}')">Delete</button>
    </div>
  `).join('');
}

function renderDashboard() {
  const totalTasksEl = getEl('totalTasks');
  const completedTasksEl = getEl('completedTasks');
  const monthlyIncomeEl = getEl('monthlyIncome');
  const monthlyExpensesEl = getEl('monthlyExpenses');

  if (totalTasksEl) totalTasksEl.textContent = state.tasks.length;
  if (completedTasksEl) completedTasksEl.textContent = state.tasks.filter(t => t.completed).length;
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyIncome = state.income
    .filter(i => {
      const date = new Date(i.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, i) => sum + (i.amount || 0), 0);
    
  const monthlyExpenses = state.expenses
    .filter(e => {
      const date = new Date(e.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);

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
    return;
  }

  const task = {
    title: titleEl.value.trim(),
    priority: priorityEl?.value || 'medium',
    category: categoryEl?.value || 'personal',
    dueDate: dueDateEl?.value || today(),
    completed: false,
    createdAt: new Date().toISOString()
  };
  
  saveToFirebase('tasks', task);
  titleEl.value = '';
};

window.addIncome = function() {
  const sourceEl = getEl('incomeSource');
  const amountEl = getEl('incomeAmount');
  const dateEl = getEl('incomeDate');
  
  if (!sourceEl?.value.trim() || !amountEl?.value) {
    alert('Please fill in all income fields');
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
};

window.addExpense = function() {
  const descEl = getEl('expenseDescription');
  const amountEl = getEl('expenseAmount');
  const categoryEl = getEl('expenseCategory');
  const dateEl = getEl('expenseDate');
  
  if (!descEl?.value.trim() || !amountEl?.value) {
    alert('Please fill in all expense fields');
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
};

window.addHabit = function() {
  const nameEl = getEl('habitName');
  
  if (!nameEl?.value.trim()) {
    alert('Please enter a habit name');
    return;
  }

  const habit = {
    name: nameEl.value.trim(),
    completedDays: {},
    createdAt: new Date().toISOString()
  };
  
  saveToFirebase('habits', habit);
  nameEl.value = '';
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

window.deleteFromFirebase = function(collection, id) {
  if (!currentUser || !confirm('Are you sure you want to delete this item?')) return;
  
  const itemRef = ref(database, `users/${currentUser.uid}/${collection}/${id}`);
  remove(itemRef).catch(err => {
    console.error('Delete error:', err);
    alert('Error deleting item. Please try again.');
  });
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
function saveToFirebase(collection, data) {
  if (!currentUser) return;
  
  const collectionRef = ref(database, `users/${currentUser.uid}/${collection}`);
  const newItemRef = push(collectionRef);
  set(newItemRef, data).catch(err => {
    console.error('Firebase save error:', err);
    alert('Error saving data. Please try again.');
  });
}

function updateFirebase(path, data) {
  if (!currentUser) return;
  
  const dataRef = ref(database, `users/${currentUser.uid}/${path}`);
  set(dataRef, data).catch(err => {
    console.error('Firebase update error:', err);
  });
}

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
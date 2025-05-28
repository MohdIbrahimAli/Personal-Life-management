
      // Global variables and state
      let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
      let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
      let income = JSON.parse(localStorage.getItem("income")) || [];
      let habits = JSON.parse(localStorage.getItem("habits")) || [];
      let notes = localStorage.getItem("notes") || "";

      let pomodoroTimer = null;
      let pomodoroTime = 25 * 60; // 25 minutes in seconds
      let pomodoroRunning = false;

      let currentDate = new Date();

      // Initialize the app
      document.addEventListener("DOMContentLoaded", function () {
        // Set today's date as default for new tasks and expenses
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("taskDueDate").value = today;
        document.getElementById("expenseDate").value = today;
        document.getElementById("incomeDate").value = today;

        // Load saved notes
        document.getElementById("notesArea").value = notes;

        // Initialize displays
        displayTasks();
        displayExpenses();
        displayIncome();
        displayHabits();
        updateDashboard();
        generateCalendar();
        updateBudgetOverview();
      });

      // Navigation
      function showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll(".section").forEach((section) => {
          section.classList.remove("active");
        });

        // Remove active class from all nav buttons
        document.querySelectorAll(".nav button").forEach((button) => {
          button.classList.remove("active");
        });

        // Show selected section
        document.getElementById(sectionId).classList.add("active");

        // Add active class to clicked button
        event.target.classList.add("active");

        // Update displays when switching sections
        if (sectionId === "dashboard") {
          updateDashboard();
        } else if (sectionId === "time") {
          generateCalendar();
        } else if (sectionId === "money") {
          updateBudgetOverview();
        }
      }

      // Task Management Functions
      function addTask() {
        const title = document.getElementById("taskTitle").value.trim();
        const priority = document.getElementById("taskPriority").value;
        const category = document.getElementById("taskCategory").value;
        const dueDate = document.getElementById("taskDueDate").value;

        if (!title) {
          alert("Please enter a task description");
          return;
        }

        const task = {
          id: Date.now(),
          title: title,
          priority: priority,
          category: category,
          dueDate: dueDate,
          completed: false,
          createdAt: new Date().toISOString(),
        };

        tasks.push(task);
        localStorage.setItem("tasks", JSON.stringify(tasks));

        // Clear form
        document.getElementById("taskTitle").value = "";
        document.getElementById("taskPriority").value = "medium";
        document.getElementById("taskCategory").value = "personal";

        displayTasks();
        updateDashboard();
      }

      function displayTasks() {
        const tasksList = document.getElementById("tasksList");
        const filteredTasks = getFilteredTasks();

        if (filteredTasks.length === 0) {
          tasksList.innerHTML =
            "<p>No tasks found. Add your first task above!</p>";
          return;
        }

        tasksList.innerHTML = filteredTasks
          .map((task) => {
            const isOverdue =
              !task.completed &&
              task.dueDate &&
              new Date(task.dueDate) < new Date();
            const dueDateText = task.dueDate
              ? new Date(task.dueDate).toLocaleDateString()
              : "No due date";

            return `
                    <div class="task-item ${
                      task.completed ? "completed" : ""
                    } ${isOverdue ? "overdue" : ""} priority-${task.priority}">
                        <div class="task-header">
                            <div class="task-title">${task.title}</div>
                            <input type="checkbox" ${
                              task.completed ? "checked" : ""
                            } 
                                   onchange="toggleTask(${
                                     task.id
                                   })" style="transform: scale(1.2);">
                        </div>
                        <div class="task-meta">
                            <span>Priority: ${
                              task.priority.charAt(0).toUpperCase() +
                              task.priority.slice(1)
                            }</span> |
                            <span>Category: ${
                              task.category.charAt(0).toUpperCase() +
                              task.category.slice(1)
                            }</span> |
                            <span>Due: ${dueDateText}</span>
                            ${
                              isOverdue
                                ? '<span style="color: #f56565; font-weight: bold;"> - OVERDUE</span>'
                                : ""
                            }
                        </div>
                        <div class="task-actions">
                            <button class="btn btn-small" onclick="editTask(${
                              task.id
                            })">Edit</button>
                            <button class="btn btn-small btn-danger" onclick="deleteTask(${
                              task.id
                            })">Delete</button>
                        </div>
                    </div>
                `;
          })
          .join("");
      }

      function getFilteredTasks() {
        const categoryFilter = document.getElementById("filterCategory").value;
        const priorityFilter = document.getElementById("filterPriority").value;
        const statusFilter = document.getElementById("filterStatus").value;

        return tasks.filter((task) => {
          const categoryMatch =
            categoryFilter === "all" || task.category === categoryFilter;
          const priorityMatch =
            priorityFilter === "all" || task.priority === priorityFilter;
          const statusMatch =
            statusFilter === "all" ||
            (statusFilter === "completed" && task.completed) ||
            (statusFilter === "pending" && !task.completed);

          return categoryMatch && priorityMatch && statusMatch;
        });
      }

      function filterTasks() {
        displayTasks();
      }

      function toggleTask(taskId) {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          task.completed = !task.completed;
          localStorage.setItem("tasks", JSON.stringify(tasks));
          displayTasks();
          updateDashboard();
        }
      }

      function editTask(taskId) {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          const newTitle = prompt("Edit task:", task.title);
          if (newTitle && newTitle.trim()) {
            task.title = newTitle.trim();
            localStorage.setItem("tasks", JSON.stringify(tasks));
            displayTasks();
          }
        }
      }

      function deleteTask(taskId) {
        if (confirm("Are you sure you want to delete this task?")) {
          tasks = tasks.filter((t) => t.id !== taskId);
          localStorage.setItem("tasks", JSON.stringify(tasks));
          displayTasks();
          updateDashboard();
        }
      }

      // Money Management Functions
      function addIncome() {
        const source = document.getElementById("incomeSource").value.trim();
        const amount = parseFloat(
          document.getElementById("incomeAmount").value
        );
        const date = document.getElementById("incomeDate").value;

        if (!source || !amount || amount <= 0) {
          alert("Please enter valid income details");
          return;
        }

        const incomeItem = {
          id: Date.now(),
          source: source,
          amount: amount,
          date: date,
          createdAt: new Date().toISOString(),
        };

        income.push(incomeItem);
        localStorage.setItem("income", JSON.stringify(income));

        // Clear form
        document.getElementById("incomeSource").value = "";
        document.getElementById("incomeAmount").value = "";

        displayIncome();
        updateDashboard();
        updateBudgetOverview();
      }

      function displayIncome() {
        const incomeList = document.getElementById("incomeList");

        if (income.length === 0) {
          incomeList.innerHTML = "<p>No income recorded yet.</p>";
          return;
        }

        incomeList.innerHTML = income
          .map(
            (item) => `
                <div class="income-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600;">${item.source}</div>
                            <div style="color: #718096; font-size: 0.9rem;">${new Date(
                              item.date
                            ).toLocaleDateString()}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-weight: bold; color: #48bb78;">+${item.amount.toFixed(
                              2
                            )}</span>
                            <button class="btn btn-small btn-danger" onclick="deleteIncome(${
                              item.id
                            })">Delete</button>
                        </div>
                    </div>
                </div>
            `
          )
          .join("");
      }

      function deleteIncome(incomeId) {
        if (confirm("Are you sure you want to delete this income entry?")) {
          income = income.filter((i) => i.id !== incomeId);
          localStorage.setItem("income", JSON.stringify(income));
          displayIncome();
          updateDashboard();
          updateBudgetOverview();
        }
      }

      function addExpense() {
        const description = document
          .getElementById("expenseDescription")
          .value.trim();
        const amount = parseFloat(
          document.getElementById("expenseAmount").value
        );
        const category = document.getElementById("expenseCategory").value;
        const date = document.getElementById("expenseDate").value;

        if (!description || !amount || amount <= 0) {
          alert("Please enter valid expense details");
          return;
        }

        const expense = {
          id: Date.now(),
          description: description,
          amount: amount,
          category: category,
          date: date,
          createdAt: new Date().toISOString(),
        };

        expenses.push(expense);
        localStorage.setItem("expenses", JSON.stringify(expenses));

        // Clear form
        document.getElementById("expenseDescription").value = "";
        document.getElementById("expenseAmount").value = "";

        displayExpenses();
        updateDashboard();
        updateBudgetOverview();
      }

      function displayExpenses() {
        const expenseList = document.getElementById("expenseList");

        if (expenses.length === 0) {
          expenseList.innerHTML = "<p>No expenses recorded yet.</p>";
          return;
        }

        expenseList.innerHTML = expenses
          .map(
            (expense) => `
                <div class="expense-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600;">${
                              expense.description
                            }</div>
                            <div style="color: #718096; font-size: 0.9rem;">
                                ${
                                  expense.category.charAt(0).toUpperCase() +
                                  expense.category.slice(1)
                                } • 
                                ${new Date(expense.date).toLocaleDateString()}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-weight: bold; color: #f56565;">-${expense.amount.toFixed(
                              2
                            )}</span>
                            <button class="btn btn-small btn-danger" onclick="deleteExpense(${
                              expense.id
                            })">Delete</button>
                        </div>
                    </div>
                </div>
            `
          )
          .join("");
      }

      function deleteExpense(expenseId) {
        if (confirm("Are you sure you want to delete this expense?")) {
          expenses = expenses.filter((e) => e.id !== expenseId);
          localStorage.setItem("expenses", JSON.stringify(expenses));
          displayExpenses();
          updateDashboard();
          updateBudgetOverview();
        }
      }

      function updateBudgetOverview() {
        const budgetOverview = document.getElementById("budgetOverview");
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // Calculate monthly expenses by category
        const monthlyExpenses = expenses.filter((expense) => {
          const expenseDate = new Date(expense.date);
          return (
            expenseDate.getMonth() === currentMonth &&
            expenseDate.getFullYear() === currentYear
          );
        });

        const expensesByCategory = {};
        monthlyExpenses.forEach((expense) => {
          expensesByCategory[expense.category] =
            (expensesByCategory[expense.category] || 0) + expense.amount;
        });

        // Default budget limits (user can modify these)
        const budgetLimits = {
          rent: 1500,
          utilities: 200,
          groceries: 400,
          transport: 150,
          entertainment: 200,
          healthcare: 100,
          education: 100,
          personal: 100,
          subscriptions: 50,
          other: 200,
        };

        const categories = Object.keys(budgetLimits);

        budgetOverview.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
                    ${categories
                      .map((category) => {
                        const spent = expensesByCategory[category] || 0;
                        const budget = budgetLimits[category];
                        const percentage = Math.min(
                          (spent / budget) * 100,
                          100
                        );
                        const isOverBudget = spent > budget;

                        return `
                            <div style="background: #f7fafc; padding: 15px; border-radius: 10px; border: 2px solid ${
                              isOverBudget ? "#f56565" : "#e2e8f0"
                            };">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span style="font-weight: 600; text-transform: capitalize;">${category}</span>
                                    <span style="color: ${
                                      isOverBudget ? "#f56565" : "#4a5568"
                                    };">
                                        ${spent.toFixed(2)} / ${budget.toFixed(
                          2
                        )}
                                    </span>
                                </div>
                                <div class="budget-progress">
                                    <div class="budget-fill ${
                                      isOverBudget ? "over-budget" : ""
                                    }" 
                                         style="width: ${percentage}%"></div>
                                </div>
                                ${
                                  isOverBudget
                                    ? '<div style="color: #f56565; font-size: 0.8rem; margin-top: 5px;">Over budget!</div>'
                                    : ""
                                }
                            </div>
                        `;
                      })
                      .join("")}
                </div>
            `;
      }

      // Time Management Functions
      function startPomodoro() {
        if (!pomodoroRunning) {
          pomodoroRunning = true;
          pomodoroTimer = setInterval(() => {
            pomodoroTime--;
            updatePomodoroDisplay();

            if (pomodoroTime <= 0) {
              clearInterval(pomodoroTimer);
              pomodoroRunning = false;
              alert("Pomodoro session completed! Time for a break.");
              resetPomodoro();
            }
          }, 1000);
        }
      }

      function pausePomodoro() {
        if (pomodoroRunning) {
          clearInterval(pomodoroTimer);
          pomodoroRunning = false;
        }
      }

      function resetPomodoro() {
        clearInterval(pomodoroTimer);
        pomodoroRunning = false;
        pomodoroTime = 25 * 60;
        updatePomodoroDisplay();
      }

      function setWorkTimer() {
        resetPomodoro();
        pomodoroTime = 25 * 60;
        updatePomodoroDisplay();
      }

      function setBreakTimer() {
        resetPomodoro();
        pomodoroTime = 5 * 60;
        updatePomodoroDisplay();
      }

      function updatePomodoroDisplay() {
        const minutes = Math.floor(pomodoroTime / 60);
        const seconds = pomodoroTime % 60;
        const display = `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`;
        document.getElementById("pomodoroDisplay").textContent = display;
        document.getElementById("dashboardTimer").textContent = display;
      }

      function startQuickPomodoro() {
        showSection("time");
        document
          .querySelector(".nav button[onclick=\"showSection('time')\"]")
          .classList.add("active");
        startPomodoro();
      }

      // Calendar Functions
      function generateCalendar() {
        const calendarGrid = document.getElementById("calendarGrid");
        const currentMonthElement = document.getElementById("currentMonth");

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        currentMonthElement.textContent = new Date(
          year,
          month
        ).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const today = new Date();
        const tasksWithDates = tasks.filter((task) => task.dueDate);

        let html = "";
        const totalDays = 42; // 6 weeks

        for (let i = 0; i < totalDays; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);

          const isCurrentMonth = date.getMonth() === month;
          const isToday = date.toDateString() === today.toDateString();
          const hasTasks = tasksWithDates.some(
            (task) =>
              new Date(task.dueDate).toDateString() === date.toDateString()
          );

          const classes = [];
          if (isToday) classes.push("today");
          if (hasTasks) classes.push("has-tasks");

          html += `
                    <div class="calendar-day ${classes.join(" ")}" 
                         style="opacity: ${isCurrentMonth ? "1" : "0.3"};">
                        ${date.getDate()}
                    </div>
                `;
        }

        calendarGrid.innerHTML = html;
      }

      function previousMonth() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generateCalendar();
      }

      function nextMonth() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        generateCalendar();
      }

      // Habit Tracking Functions
      function addHabit() {
        const habitName = document.getElementById("habitName").value.trim();

        if (!habitName) {
          alert("Please enter a habit name");
          return;
        }

        const habit = {
          id: Date.now(),
          name: habitName,
          completedDays: {},
          createdAt: new Date().toISOString(),
        };

        habits.push(habit);
        localStorage.setItem("habits", JSON.stringify(habits));

        document.getElementById("habitName").value = "";
        displayHabits();
      }

      function displayHabits() {
        const habitsList = document.getElementById("habitsList");

        if (habits.length === 0) {
          habitsList.innerHTML =
            "<p>No habits tracked yet. Add your first habit above!</p>";
          return;
        }

        const today = new Date();
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - today.getDay());

        habitsList.innerHTML = habits
          .map((habit) => {
            const weekDays = [];
            for (let i = 0; i < 7; i++) {
              const date = new Date(currentWeekStart);
              date.setDate(currentWeekStart.getDate() + i);
              const dateStr = date.toISOString().split("T")[0];
              weekDays.push({
                date: dateStr,
                day: date.toLocaleDateString("en-US", { weekday: "short" }),
                completed: habit.completedDays[dateStr] || false,
              });
            }

            return `
                    <div class="habit-item">
                        <div class="habit-name">${habit.name}</div>
                        <div class="habit-days">
                            ${weekDays
                              .map(
                                (day) => `
                                <div class="habit-day ${
                                  day.completed ? "completed" : ""
                                }" 
                                     onclick="toggleHabit(${habit.id}, '${
                                  day.date
                                }')"
                                     title="${day.day}">
                                    ${day.day.charAt(0)}
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                        <button class="btn btn-small btn-danger" style="margin-top: 10px;" 
                                onclick="deleteHabit(${
                                  habit.id
                                })">Delete Habit</button>
                    </div>
                `;
          })
          .join("");
      }

      function toggleHabit(habitId, dateStr) {
        const habit = habits.find((h) => h.id === habitId);
        if (habit) {
          habit.completedDays[dateStr] = !habit.completedDays[dateStr];
          localStorage.setItem("habits", JSON.stringify(habits));
          displayHabits();
        }
      }

      function deleteHabit(habitId) {
        if (confirm("Are you sure you want to delete this habit?")) {
          habits = habits.filter((h) => h.id !== habitId);
          localStorage.setItem("habits", JSON.stringify(habits));
          displayHabits();
        }
      }

      // Notes Functions
      function saveNotes() {
        const notesContent = document.getElementById("notesArea").value;
        localStorage.setItem("notes", notesContent);
        notes = notesContent;
        alert("Notes saved successfully!");
      }

      // Dashboard Functions
      function updateDashboard() {
        // Update stats
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.completed).length;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyIncome = income
          .filter(
            (i) =>
              new Date(i.date).getMonth() === currentMonth &&
              new Date(i.date).getFullYear() === currentYear
          )
          .reduce((sum, i) => sum + i.amount, 0);

        const monthlyExpenses = expenses
          .filter(
            (e) =>
              new Date(e.date).getMonth() === currentMonth &&
              new Date(e.date).getFullYear() === currentYear
          )
          .reduce((sum, e) => sum + e.amount, 0);

        document.getElementById("totalTasks").textContent = totalTasks;
        document.getElementById("completedTasks").textContent = completedTasks;
        document.getElementById(
          "monthlyIncome"
        ).textContent = `${monthlyIncome.toFixed(2)}`;
        document.getElementById(
          "monthlyExpenses"
        ).textContent = `${monthlyExpenses.toFixed(2)}`;

        // Update today's tasks
        const today = new Date().toISOString().split("T")[0];
        const todayTasks = tasks.filter(
          (task) => task.dueDate === today && !task.completed
        );

        const todayTasksElement = document.getElementById("todayTasks");
        if (todayTasks.length === 0) {
          todayTasksElement.innerHTML = "No tasks for today";
        } else {
          todayTasksElement.innerHTML = todayTasks
            .map(
              (task) =>
                `<div class="quick-task priority-${task.priority}">${task.title}</div>`
            )
            .join("");
        }

        // Update upcoming deadlines
        const upcomingTasks = tasks
          .filter(
            (task) =>
              !task.completed &&
              task.dueDate &&
              new Date(task.dueDate) > new Date()
          )
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
          .slice(0, 5);

        const upcomingElement = document.getElementById("upcomingDeadlines");
        if (upcomingTasks.length === 0) {
          upcomingElement.innerHTML = "No upcoming deadlines";
        } else {
          upcomingElement.innerHTML = upcomingTasks
            .map(
              (task) =>
                `<div class="quick-task priority-${task.priority}">
                        ${task.title} - ${new Date(
                  task.dueDate
                ).toLocaleDateString()}
                    </div>`
            )
            .join("");
        }
      }
// Store the app data
let appData = {
  folders: [],
};

let selectedFolder = null;
let selectedSubfolder = null;
let nextId = 1;
let subfolderType = "folder"; // 'folder' or 'task'
let editingFolderId = null;
let editingSubfolderItemId = null;
let editingTaskId = null;

// Server API functions
async function saveToServer() {
  try {
    const dataToSave = {
      folders: appData.folders,
      nextId: nextId,
    };
    const response = await fetch("/api/data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSave),
    });
    if (!response.ok) throw new Error("Failed to save data to server");
  } catch (error) {
    console.error("Error saving to server:", error);
  }
}

async function loadFromServer() {
  try {
    const response = await fetch("/api/data");
    if (response.ok) {
      const parsedData = await response.json();
      appData = {
        folders: parsedData.folders || [],
      };
      nextId = parsedData.nextId || 1;

      // Initial render after loading
      renderFolders();
      return true;
    }
  } catch (error) {
    console.error("Error loading from server:", error);
  }
  return false;
}

function generateId() {
  return nextId++;
}

function setSubfolderType(type) {
  if (editingSubfolderItemId) return; // Prevent type change during edit
  subfolderType = type;

  // Update switch buttons
  document
    .getElementById("folder-switch")
    .classList.toggle("active", type === "folder");
  document
    .getElementById("task-switch")
    .classList.toggle("active", type === "task");

  // Update placeholder text
  const input = document.getElementById("subfolder-input");
  input.placeholder = type === "folder" ? "Add folder..." : "Add task...";
}

function addFolder() {
  const input = document.getElementById("folder-input");
  const name = input.value.trim();

  if (name) {
    if (editingFolderId) {
      const folder = appData.folders.find((f) => f.id === editingFolderId);
      if (folder) {
        folder.name = name;
        editingFolderId = null;
      }
    } else {
      const folder = {
        id: generateId(),
        name: name,
        type: "folder",
        items: [],
      };
      appData.folders.push(folder);
    }

    input.value = "";
    saveToServer();
    renderFolders();
    if (selectedFolder && selectedFolder.id === editingFolderId) {
      renderSubfolders(); // Update title
    }
  }
}

function startEditFolder(folderId) {
  const folder = appData.folders.find((f) => f.id === folderId);
  if (folder) {
    editingFolderId = folderId;
    const input = document.getElementById("folder-input");
    input.value = folder.name;
    input.focus();
  }
}

function addSubfolderItem() {
  if (!selectedFolder) return;

  const input = document.getElementById("subfolder-input");
  const name = input.value.trim();

  if (name) {
    if (editingSubfolderItemId) {
      const item = selectedFolder.items.find(
        (i) => i.id === editingSubfolderItemId,
      );
      if (item) {
        item.name = name;
        editingSubfolderItemId = null;
        // Re-enable switches
        document.getElementById("folder-switch").disabled = false;
        document.getElementById("task-switch").disabled = false;
      }
    } else {
      const item = {
        id: generateId(),
        name: name,
        type: subfolderType,
        items: subfolderType === "folder" ? [] : undefined,
        completed: subfolderType === "task" ? false : undefined,
      };
      selectedFolder.items.push(item);
    }

    input.value = "";
    saveToServer();
    renderSubfolders();
    if (selectedSubfolder && selectedSubfolder.id === editingSubfolderItemId) {
      renderTasks(); // Update title
    }
  }
}

function startEditSubfolderItem(itemId) {
  if (!selectedFolder) return;
  const item = selectedFolder.items.find((i) => i.id === itemId);
  if (item) {
    editingSubfolderItemId = itemId;
    const input = document.getElementById("subfolder-input");
    input.value = item.name;
    input.focus();

    // Disable switches during edit
    document.getElementById("folder-switch").disabled = true;
    document.getElementById("task-switch").disabled = true;
  }
}

function addTask() {
  if (!selectedSubfolder) return;

  const input = document.getElementById("task-input");
  const name = input.value.trim();

  if (name) {
    if (editingTaskId) {
      const task = selectedSubfolder.items.find((t) => t.id === editingTaskId);
      if (task) {
        task.name = name;
        editingTaskId = null;
      }
    } else {
      const task = {
        id: generateId(),
        name: name,
        type: "task",
        completed: false,
      };
      selectedSubfolder.items.push(task);
    }

    input.value = "";
    saveToServer();
    renderTasks();
  }
}

function startEditTask(taskId) {
  if (!selectedSubfolder) return;
  const task = selectedSubfolder.items.find((t) => t.id === taskId);
  if (task) {
    editingTaskId = taskId;
    const input = document.getElementById("task-input");
    input.value = task.name;
    input.focus();
  }
}

function renderFolders() {
  const container = document.getElementById("folders-container");

  if (appData.folders.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No folders yet. Add one above!</div>';
    return;
  }

  container.innerHTML = appData.folders
    .map(
      (folder) => `
        <div class="item folder ${selectedFolder?.id === folder.id ? "selected" : ""}" 
             onclick="selectFolder(${folder.id})">
            <span>${folder.name}</span>
            <div style="display: flex; gap: 4px;">
                <button class="action-button edit-button" onclick="event.stopPropagation(); startEditFolder(${folder.id})">
                    <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button class="action-button delete-button" onclick="event.stopPropagation(); deleteFolder(${folder.id})">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        </div>
    `,
    )
    .join("");
}

function renderSubfolders() {
  const container = document.getElementById("subfolders-container");
  const title = document.getElementById("subfolder-title");

  if (!selectedFolder) {
    container.innerHTML =
      '<div class="empty-state">Select a folder to view its contents</div>';
    title.textContent = "Select a folder";
    return;
  }

  title.textContent = selectedFolder.name;

  if (selectedFolder.items.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No items yet. Add one above!</div>';
    return;
  }

  const sortedItems = [...selectedFolder.items].sort((a, b) => {
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;
    return 0;
  });

  container.innerHTML = sortedItems
    .map((item) => {
      if (item.type === "task") {
        return `
                <div class="item task ${item.completed ? "completed" : ""}">
                    <label style="display: flex; align-items: center; flex: 1; cursor: pointer;">
                        <input type="checkbox" ${item.completed ? "checked" : ""} 
                                onchange="toggleSubfolderTask(${item.id})">
                        <span>${item.name}</span>
                    </label>
                    <div style="display: flex; gap: 4px;">
                        <button class="action-button edit-button" onclick="startEditSubfolderItem(${item.id})">
                            <i class="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button class="action-button delete-button" onclick="deleteSubfolderItem(${item.id})">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
      } else {
        return `
                <div class="item folder ${selectedSubfolder?.id === item.id ? "selected" : ""}" 
                     onclick="selectSubfolder(${item.id})">
                    <span>${item.name}</span>
                    <div style="display: flex; gap: 4px;">
                        <button class="action-button edit-button" onclick="event.stopPropagation(); startEditSubfolderItem(${item.id})">
                            <i class="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button class="action-button delete-button" onclick="event.stopPropagation(); deleteSubfolderItem(${item.id})">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
      }
    })
    .join("");
}

function renderTasks() {
  const container = document.getElementById("tasks-container");
  const title = document.getElementById("tasks-title");

  if (!selectedSubfolder) {
    container.innerHTML =
      '<div class="empty-state">Select an item to view its tasks</div>';
    title.textContent = "Select an item";
    return;
  }

  title.textContent = selectedSubfolder.name;

  if (selectedSubfolder.items.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No tasks yet. Add one above!</div>';
    return;
  }

  container.innerHTML = selectedSubfolder.items
    .map(
      (task) => `
        <div class="item task ${task.completed ? "completed" : ""}">
            <label style="display: flex; align-items: center; flex: 1; cursor: pointer;">
                <input type="checkbox" ${task.completed ? "checked" : ""} 
                       onchange="toggleTask(${task.id})">
                <span>${task.name}</span>
            </label>
            <div style="display: flex; gap: 4px;">
                <button class="action-button edit-button" onclick="startEditTask(${task.id})">
                    <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button class="action-button delete-button" onclick="deleteTask(${task.id})">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        </div>
    `,
    )
    .join("");
}

function selectFolder(folderId) {
  selectedFolder = appData.folders.find((f) => f.id === folderId);
  selectedSubfolder = null;

  // Enable second column input and switches
  document.getElementById("subfolder-input").disabled = false;
  document.getElementById("subfolder-add-btn").disabled = false;
  document.getElementById("folder-switch").disabled = false;
  document.getElementById("task-switch").disabled = false;

  // Disable third column input
  document.getElementById("task-input").disabled = true;
  document.getElementById("task-add-btn").disabled = true;

  renderFolders();
  renderSubfolders();
  renderTasks();
}

function selectSubfolder(subfolderId) {
  if (!selectedFolder) return;

  const item = selectedFolder.items.find((item) => item.id === subfolderId);

  // Only allow selection of folders, not tasks
  if (item && item.type === "folder") {
    selectedSubfolder = item;

    // Enable third column input
    document.getElementById("task-input").disabled = false;
    document.getElementById("task-add-btn").disabled = false;

    renderSubfolders();
    renderTasks();
  }
}

function toggleSubfolderTask(taskId) {
  if (!selectedFolder) return;

  const task = selectedFolder.items.find((t) => t.id === taskId);
  if (task && task.type === "task") {
    task.completed = !task.completed;
    saveToServer();
    renderSubfolders();
  }
}

function deleteFolder(folderId) {
  if (
    !confirm(
      "Are you sure you want to delete this folder and all its contents?",
    )
  )
    return;

  appData.folders = appData.folders.filter((f) => f.id !== folderId);

  if (editingFolderId === folderId) {
    editingFolderId = null;
    document.getElementById("folder-input").value = "";
  }

  if (selectedFolder?.id === folderId) {
    selectedFolder = null;
    selectedSubfolder = null;
    document.getElementById("subfolder-input").disabled = true;
    document.getElementById("subfolder-add-btn").disabled = true;
    document.getElementById("folder-switch").disabled = true;
    document.getElementById("task-switch").disabled = true;
    document.getElementById("task-input").disabled = true;
    document.getElementById("task-add-btn").disabled = true;
  }

  saveToServer();
  renderFolders();
  renderSubfolders();
  renderTasks();
}

function deleteSubfolderItem(itemId) {
  if (!selectedFolder) return;

  if (!confirm("Are you sure you want to delete this item?")) return;

  selectedFolder.items = selectedFolder.items.filter(
    (item) => item.id !== itemId,
  );

  if (editingSubfolderItemId === itemId) {
    editingSubfolderItemId = null;
    document.getElementById("subfolder-input").value = "";
    document.getElementById("folder-switch").disabled = false;
    document.getElementById("task-switch").disabled = false;
  }

  if (selectedSubfolder?.id === itemId) {
    selectedSubfolder = null;
    document.getElementById("task-input").disabled = true;
    document.getElementById("task-add-btn").disabled = true;
  }

  saveToServer();
  renderSubfolders();
  renderTasks();
}

function deleteTask(taskId) {
  if (!selectedSubfolder) return;

  if (!confirm("Are you sure you want to delete this task?")) return;

  selectedSubfolder.items = selectedSubfolder.items.filter(
    (task) => task.id !== taskId,
  );

  if (editingTaskId === taskId) {
    editingTaskId = null;
    document.getElementById("task-input").value = "";
  }

  saveToServer();
  renderTasks();
}

function toggleTask(taskId) {
  if (!selectedSubfolder) return;

  const task = selectedSubfolder.items.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveToServer();
    renderTasks();
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", async function () {
  // Load data from server
  await loadFromServer();

  // Handle Enter key for inputs
  document
    .getElementById("folder-input")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") addFolder();
    });

  document
    .getElementById("subfolder-input")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") addSubfolderItem();
    });

  document
    .getElementById("task-input")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") addTask();
    });
});

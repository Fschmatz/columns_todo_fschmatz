// Storage key for localStorage
const STORAGE_KEY = 'todoAppData';

// Data structure to store the app data
let appData = {
    folders: []
};

let selectedFolder = null;
let selectedSubfolder = null;
let nextId = 1;
let subfolderType = 'folder'; // 'folder' or 'task'

// LocalStorage functions (Deprecated - replaced by Server API)
async function saveToStorage() {
    try {
        const dataToSave = {
            folders: appData.folders,
            nextId: nextId
        };
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSave)
        });
        if (!response.ok) throw new Error('Failed to save data to server');
    } catch (error) {
        console.error('Error saving to server:', error);
    }
}

async function loadFromStorage() {
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const parsedData = await response.json();
            appData = {
                folders: parsedData.folders || []
            };
            nextId = parsedData.nextId || 1;

            // Initial render after loading
            renderFolders();
            return true;
        }
    } catch (error) {
        console.error('Error loading from server:', error);
    }
    return false;
}

function generateId() {
    return nextId++;
}

function setSubfolderType(type) {
    subfolderType = type;

    // Update switch buttons
    document.getElementById('folder-switch').classList.toggle('active', type === 'folder');
    document.getElementById('task-switch').classList.toggle('active', type === 'task');

    // Update placeholder text
    const input = document.getElementById('subfolder-input');
    input.placeholder = type === 'folder' ? 'Add folder...' : 'Add task...';
}

function addFolder() {
    const input = document.getElementById('folder-input');
    const name = input.value.trim();

    if (name) {
        const folder = {
            id: generateId(),
            name: name,
            type: 'folder',
            items: []
        };

        appData.folders.push(folder);
        input.value = '';
        saveToStorage();
        renderFolders();
    }
}

function addSubfolderItem() {
    if (!selectedFolder) return;

    const input = document.getElementById('subfolder-input');
    const name = input.value.trim();

    if (name) {
        const item = {
            id: generateId(),
            name: name,
            type: subfolderType,
            items: subfolderType === 'folder' ? [] : undefined,
            completed: subfolderType === 'task' ? false : undefined
        };

        selectedFolder.items.push(item);
        input.value = '';
        saveToStorage();
        renderSubfolders();
    }
}

function addTask() {
    if (!selectedSubfolder) return;

    const input = document.getElementById('task-input');
    const name = input.value.trim();

    if (name) {
        const task = {
            id: generateId(),
            name: name,
            type: 'task',
            completed: false
        };

        selectedSubfolder.items.push(task);
        input.value = '';
        saveToStorage();
        renderTasks();
    }
}

function renderFolders() {
    const container = document.getElementById('folders-container');

    if (appData.folders.length === 0) {
        container.innerHTML = '<div class="empty-state">No folders yet. Add one above!</div>';
        return;
    }

    container.innerHTML = appData.folders.map(folder => `
        <div class="item folder ${selectedFolder?.id === folder.id ? 'selected' : ''}" 
             onclick="selectFolder(${folder.id})">
            <span>${folder.name}</span>
            <button class="delete-button" onclick="event.stopPropagation(); deleteFolder(${folder.id})">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

function renderSubfolders() {
    const container = document.getElementById('subfolders-container');
    const title = document.getElementById('subfolder-title');

    if (!selectedFolder) {
        container.innerHTML = '<div class="empty-state">Select a folder to view its contents</div>';
        title.textContent = 'Select a folder';
        return;
    }

    title.textContent = selectedFolder.name;

    if (selectedFolder.items.length === 0) {
        container.innerHTML = '<div class="empty-state">No items yet. Add one above!</div>';
        return;
    }

    const sortedItems = [...selectedFolder.items].sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return 0;
    });

    container.innerHTML = sortedItems.map(item => {
        if (item.type === 'task') {
            return `
                <div class="item task ${item.completed ? 'completed' : ''}">
                    <label style="display: flex; align-items: center; flex: 1; cursor: pointer;">
                        <input type="checkbox" ${item.completed ? 'checked' : ''} 
                               onchange="toggleSubfolderTask(${item.id})">
                        <span>${item.name}</span>
                    </label>
                    <button class="delete-button" onclick="deleteSubfolderItem(${item.id})">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="item folder ${selectedSubfolder?.id === item.id ? 'selected' : ''}" 
                     onclick="selectSubfolder(${item.id})">
                    <span>${item.name}</span>
                    <button class="delete-button" onclick="event.stopPropagation(); deleteSubfolderItem(${item.id})">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
        }
    }).join('');
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    const title = document.getElementById('tasks-title');

    if (!selectedSubfolder) {
        container.innerHTML = '<div class="empty-state">Select an item to view its tasks</div>';
        title.textContent = 'Select an item';
        return;
    }

    title.textContent = selectedSubfolder.name;

    if (selectedSubfolder.items.length === 0) {
        container.innerHTML = '<div class="empty-state">No tasks yet. Add one above!</div>';
        return;
    }

    container.innerHTML = selectedSubfolder.items.map(task => `
        <div class="item task ${task.completed ? 'completed' : ''}">
            <label style="display: flex; align-items: center; flex: 1; cursor: pointer;">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                       onchange="toggleTask(${task.id})">
                <span>${task.name}</span>
            </label>
            <button class="delete-button" onclick="deleteTask(${task.id})">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

function selectFolder(folderId) {
    selectedFolder = appData.folders.find(f => f.id === folderId);
    selectedSubfolder = null;

    // Enable second column input and switches
    document.getElementById('subfolder-input').disabled = false;
    document.getElementById('subfolder-add-btn').disabled = false;
    document.getElementById('folder-switch').disabled = false;
    document.getElementById('task-switch').disabled = false;

    // Disable third column input
    document.getElementById('task-input').disabled = true;
    document.getElementById('task-add-btn').disabled = true;

    renderFolders();
    renderSubfolders();
    renderTasks();
}

function selectSubfolder(subfolderId) {
    if (!selectedFolder) return;

    const item = selectedFolder.items.find(item => item.id === subfolderId);

    // Only allow selection of folders, not tasks
    if (item && item.type === 'folder') {
        selectedSubfolder = item;

        // Enable third column input
        document.getElementById('task-input').disabled = false;
        document.getElementById('task-add-btn').disabled = false;

        renderSubfolders();
        renderTasks();
    }
}

function toggleSubfolderTask(taskId) {
    if (!selectedFolder) return;

    const task = selectedFolder.items.find(t => t.id === taskId);
    if (task && task.type === 'task') {
        task.completed = !task.completed;
        saveToStorage();
        renderSubfolders();
    }
}

function deleteFolder(folderId) {
    if (!confirm('Are you sure you want to delete this folder and all its contents?')) return;

    appData.folders = appData.folders.filter(f => f.id !== folderId);

    if (selectedFolder?.id === folderId) {
        selectedFolder = null;
        selectedSubfolder = null;
        document.getElementById('subfolder-input').disabled = true;
        document.getElementById('subfolder-add-btn').disabled = true;
        document.getElementById('folder-switch').disabled = true;
        document.getElementById('task-switch').disabled = true;
        document.getElementById('task-input').disabled = true;
        document.getElementById('task-add-btn').disabled = true;
    }

    saveToStorage();
    renderFolders();
    renderSubfolders();
    renderTasks();
}

function deleteSubfolderItem(itemId) {
    if (!selectedFolder) return;

    if (!confirm('Are you sure you want to delete this item?')) return;

    selectedFolder.items = selectedFolder.items.filter(item => item.id !== itemId);

    if (selectedSubfolder?.id === itemId) {
        selectedSubfolder = null;
        document.getElementById('task-input').disabled = true;
        document.getElementById('task-add-btn').disabled = true;
    }

    saveToStorage();
    renderSubfolders();
    renderTasks();
}

function deleteTask(taskId) {
    if (!selectedSubfolder) return;

    if (!confirm('Are you sure you want to delete this task?')) return;

    selectedSubfolder.items = selectedSubfolder.items.filter(task => task.id !== taskId);
    saveToStorage();
    renderTasks();
}

function toggleTask(taskId) {
    if (!selectedSubfolder) return;

    const task = selectedSubfolder.items.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveToStorage();
        renderTasks();
    }
}



// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    // Load data from server
    await loadFromStorage();

    // Handle Enter key for inputs
    document.getElementById('folder-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') addFolder();
    });

    document.getElementById('subfolder-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') addSubfolderItem();
    });

    document.getElementById('task-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') addTask();
    });
});

// Note: saveToStorage is now called after each modification, so beforeunload is less critical 
// but we keep it as a fallback (though it might not finish async fetch)
window.addEventListener('beforeunload', () => {
    saveToStorage();
});
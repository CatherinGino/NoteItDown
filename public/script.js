// Global variables
let currentUser = null;
let notes = [];
let draggedNote = null;
let dragOffset = { x: 0, y: 0 };
let currentEmojiTarget = null;
let noteToDelete = null;

// DOM elements
const authModal = document.getElementById('authModal');
const app = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const notesContainer = document.getElementById('notesContainer');
const addNoteBtn = document.getElementById('addNoteBtn');
const themeToggle = document.getElementById('themeToggle');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const profileModal = document.getElementById('profileModal');
const emojiModal = document.getElementById('emojiModal');

// Emoji data
const emojiData = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
    nature: ['🌱', '🌿', '🍀', '🌳', '🌲', '🌴', '🌵', '🌷', '🌸', '🌹', '🌺', '🌻', '🌼', '🌽', '🍄', '🌰', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸'],
    objects: ['💡', '🔦', '💰', '💳', '💎', '🔧', '🔨', '🧱', '🧲', '🔫', '💣', '🔪', '🚬'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '☸️', '✡️', '🔯', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏']
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadTheme();
});

// Auth functions
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        currentUser = JSON.parse(localStorage.getItem('user'));
        showApp();
        loadNotes();
    } else {
        showAuth();
    }
}

function showAuth() {
    authModal.classList.remove('hidden');
    app.classList.add('hidden');
}

function showApp() {
    authModal.classList.add('hidden');
    app.classList.remove('hidden');
    updateHeaderProfile();
}

function showLogin() {
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
}

function showRegister() {
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
}

// Setup event listeners
function setupEventListeners() {
    // Auth forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);

    // App controls
    addNoteBtn.addEventListener('click', createNote);
    themeToggle.addEventListener('click', toggleTheme);
    userMenuBtn.addEventListener('click', toggleUserMenu);

    // Profile modal
    document.getElementById('profileBtn').addEventListener('click', showProfile);

    // Profile image upload
    document.getElementById('profileImageInput').addEventListener('change', handleProfileImageUpload);

    // Close modals on outside click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Emoji modal setup
    setupEmojiModal();

    // Delete confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
}

// Auth handlers
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            showApp();
            loadNotes();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Login failed. Please try again.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            showApp();
            loadNotes();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Registration failed. Please try again.');
    }
}

function logout() {
    // Clear user data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    notes = [];

    // Clear the notes container
    notesContainer.innerHTML = '';

    // Reset auth forms
    loginForm.reset();
    registerForm.reset();

    // Close all modals and dropdowns
    closeAllModals();

    // Show auth modal and default to login tab
    showAuth();
    showLogin();

    console.log('User logged out successfully');
}

function confirmLogout() {
    if (confirm('Are you sure you want to logout?')) {
        logout();
    }
}

// Theme functions
function loadTheme() {
    const savedTheme = currentUser?.theme || localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeIcon(newTheme);

    if (currentUser) {
        updateUserTheme(newTheme);
    } else {
        localStorage.setItem('theme', newTheme);
    }
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

async function updateUserTheme(theme) {
    try {
        const response = await fetch('/api/user/theme', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ theme })
        });

        if (response.ok) {
            currentUser.theme = theme;
            localStorage.setItem('user', JSON.stringify(currentUser));
        }
    } catch (error) {
        console.error('Failed to update theme:', error);
    }
}

// UI functions
function toggleUserMenu() {
    userDropdown.classList.toggle('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.add('hidden');
    });
    document.querySelectorAll('.color-picker, .size-picker').forEach(picker => {
        picker.remove();
    });
}

// Profile functions
function showProfile() {
    closeAllModals();
    profileModal.classList.remove('hidden');
    updateProfileInfo();
}

function closeProfile() {
    profileModal.classList.add('hidden');
}

function updateProfileInfo() {
    if (currentUser) {
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileNoteCount').textContent = notes.length;
        document.getElementById('profileTheme').textContent =
            document.documentElement.getAttribute('data-theme') === 'dark' ? 'Dark' : 'Light';

        // Update profile avatar
        updateProfileAvatar();

        // Mock join date - in real app, this would come from user data
        document.getElementById('profileJoinDate').textContent = 'January 2024';
    }
}

function updateProfileAvatar() {
    const avatarCircle = document.getElementById('profileAvatar');
    const removeBtn = document.getElementById('removeImageBtn');

    if (currentUser.profileImage) {
        avatarCircle.innerHTML = `<img src="${currentUser.profileImage}" alt="Profile Picture">`;
        removeBtn.style.display = 'flex';
    } else {
        avatarCircle.innerHTML = '<i class="fas fa-user"></i>';
        removeBtn.style.display = 'none';
    }
}

async function handleProfileImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB.');
        return;
    }

    // Show loading state
    const uploadBtn = document.querySelector('.upload-btn');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadBtn.disabled = true;

    try {
        // Convert to base64
        const base64 = await fileToBase64(file);

        // Upload to server
        const response = await fetch('/api/user/profile-image', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ profileImage: base64 })
        });

        if (response.ok) {
            const data = await response.json();
            currentUser.profileImage = data.profileImage;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateProfileAvatar();
            updateHeaderProfile(); // Update header avatar
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Upload error:', response.status, errorData);
            alert(errorData.error || `Failed to upload image (${response.status})`);
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
    } finally {
        // Reset loading state
        const uploadBtn = document.querySelector('.upload-btn');
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
        // Clear the file input
        event.target.value = '';
    }
}

async function removeProfileImage() {
    try {
        const response = await fetch('/api/user/profile-image', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ profileImage: null })
        });

        if (response.ok) {
            currentUser.profileImage = null;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateProfileAvatar();
            updateHeaderProfile(); // Update header avatar
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to remove image');
        }
    } catch (error) {
        console.error('Error removing image:', error);
        alert('Failed to remove image. Please try again.');
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Username editing functions
function editUsername() {
    const usernameSpan = document.getElementById('profileUsername');
    const editForm = document.getElementById('usernameEditForm');
    const usernameInput = document.getElementById('usernameInput');
    
    // Show edit form and hide display
    usernameSpan.style.display = 'none';
    editForm.classList.remove('hidden');
    
    // Set current username as input value
    usernameInput.value = currentUser.username;
    usernameInput.focus();
    usernameInput.select();
}

function cancelUsernameEdit() {
    const usernameSpan = document.getElementById('profileUsername');
    const editForm = document.getElementById('usernameEditForm');
    
    // Hide edit form and show display
    editForm.classList.add('hidden');
    usernameSpan.style.display = 'inline';
}

async function saveUsername() {
    const usernameInput = document.getElementById('usernameInput');
    const newUsername = usernameInput.value.trim();
    
    // Validate username
    if (!newUsername) {
        alert('Username cannot be empty');
        return;
    }
    
    if (newUsername.length < 3) {
        alert('Username must be at least 3 characters long');
        return;
    }
    
    if (newUsername.length > 20) {
        alert('Username must be less than 20 characters');
        return;
    }
    
    if (newUsername === currentUser.username) {
        cancelUsernameEdit();
        return;
    }
    
    // Show loading state
    const saveBtn = document.querySelector('.save-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    try {
        const response = await fetch('/api/user/username', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ username: newUsername })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update current user data
            currentUser.username = data.username;
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Update UI
            document.getElementById('profileUsername').textContent = data.username;
            updateHeaderProfile(); // Update header username
            cancelUsernameEdit();
            
            // Show success message
            alert('Username updated successfully!');
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            alert(errorData.error || 'Failed to update username');
        }
    } catch (error) {
        console.error('Error updating username:', error);
        alert('Failed to update username. Please try again.');
    } finally {
        // Reset loading state
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Header profile functions
function updateHeaderProfile() {
    if (!currentUser) return;
    
    const headerAvatar = document.getElementById('headerAvatar');
    const headerUsername = document.getElementById('headerUsername');
    
    // Update username
    headerUsername.textContent = currentUser.username;
    
    // Update avatar
    if (currentUser.profileImage) {
        headerAvatar.innerHTML = `<img src="${currentUser.profileImage}" alt="Profile Picture">`;
    } else {
        headerAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
}

// Notes functions
async function loadNotes() {
    try {
        const response = await fetch('/api/notes', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            notes = await response.json();
            renderNotes();
        }
    } catch (error) {
        console.error('Failed to load notes:', error);
    }
}

function renderNotes() {
    notesContainer.innerHTML = '';
    notes.forEach(note => {
        const noteElement = createNoteElement(note);
        notesContainer.appendChild(noteElement);
    });
}

function createNoteElement(note) {
    const noteDiv = document.createElement('div');
    noteDiv.className = `note ${note.color} ${note.size}`;
    noteDiv.style.left = `${note.position?.x || Math.random() * 300}px`;
    noteDiv.style.top = `${note.position?.y || Math.random() * 200}px`;
    noteDiv.dataset.noteId = note._id;

    noteDiv.innerHTML = `
        <div class="note-header">
            <textarea class="note-title" placeholder="Note title...">${note.title}</textarea>
            <div class="note-controls">
                <button class="note-btn emoji-btn" onclick="openEmojiPicker('${note._id}')" title="Add Emoji">😊</button>
                <button class="note-btn" onclick="toggleColorPicker('${note._id}')" title="Change Color">🎨</button>
                <button class="note-btn" onclick="toggleSizePicker('${note._id}')" title="Change Size">📏</button>
                <button class="note-btn" onclick="showDeleteConfirmation('${note._id}')" title="Delete Note">🗑️</button>
            </div>
        </div>
        <div class="note-content">
            <textarea class="note-textarea" placeholder="Start typing your note...">${note.content}</textarea>
        </div>
    `;

    // Add event listeners
    const titleInput = noteDiv.querySelector('.note-title');
    const contentInput = noteDiv.querySelector('.note-textarea');

    titleInput.addEventListener('input', () => updateNote(note._id, { title: titleInput.value }));
    contentInput.addEventListener('input', () => updateNote(note._id, { content: contentInput.value }));

    // Add drag functionality
    addDragFunctionality(noteDiv);

    // Add right-click emoji functionality
    contentInput.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        currentEmojiTarget = contentInput;
        openEmojiPicker(note._id);
    });

    contentInput.addEventListener('dblclick', () => {
        currentEmojiTarget = contentInput;
        openEmojiPicker(note._id);
    });

    return noteDiv;
}

async function createNote() {
    const newNote = {
        title: 'New Note',
        content: ' ', // Use a space instead of empty string to avoid validation issues
        color: 'yellow',
        size: 'medium',
        position: {
            x: Math.random() * (window.innerWidth - 300),
            y: Math.random() * (window.innerHeight - 300)
        }
    };

    try {
        console.log('Creating new note:', newNote);
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(newNote)
        });

        console.log('Create note response status:', response.status);

        if (response.ok) {
            const note = await response.json();
            console.log('Note created successfully:', note);
            notes.push(note);
            const noteElement = createNoteElement(note);
            notesContainer.appendChild(noteElement);

            // Focus on the title input
            setTimeout(() => {
                noteElement.querySelector('.note-title').focus();
            }, 100);
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to create note:', response.status, errorData);
            alert(`Failed to create note: ${errorData.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Failed to create note:', error);
        alert('Failed to create note. Please check your connection and try again.');
    }
}

async function updateNote(noteId, updates) {
    try {
        const response = await fetch(`/api/notes/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updates)
        });

        if (response.ok) {
            const updatedNote = await response.json();
            const noteIndex = notes.findIndex(n => n._id === noteId);
            if (noteIndex !== -1) {
                notes[noteIndex] = updatedNote;
            }
        }
    } catch (error) {
        console.error('Failed to update note:', error);
    }
}

async function deleteNote(noteId) {
    try {
        const response = await fetch(`/api/notes/${noteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            notes = notes.filter(n => n._id !== noteId);
            const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
            if (noteElement) {
                noteElement.remove();
            }
        }
    } catch (error) {
        console.error('Failed to delete note:', error);
    }
}

// Delete confirmation functions
function showDeleteConfirmation(noteId) {
    noteToDelete = noteId;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteConfirmation() {
    noteToDelete = null;
    document.getElementById('deleteModal').classList.add('hidden');
}

function confirmDelete() {
    if (noteToDelete) {
        deleteNote(noteToDelete);
        closeDeleteConfirmation();
    }
}

// Drag functionality
function addDragFunctionality(noteElement) {
    let isDragging = false;

    noteElement.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;

        isDragging = true;
        draggedNote = noteElement;

        const rect = noteElement.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;

        noteElement.style.zIndex = '1000';
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
    });

    function handleDrag(e) {
        if (!isDragging || !draggedNote) return;

        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;

        draggedNote.style.left = `${Math.max(0, x)}px`;
        draggedNote.style.top = `${Math.max(0, y)}px`;
    }

    function handleDragEnd() {
        if (!isDragging || !draggedNote) return;

        isDragging = false;
        draggedNote.style.zIndex = '';

        // Update note position in database
        const noteId = draggedNote.dataset.noteId;
        const x = parseInt(draggedNote.style.left);
        const y = parseInt(draggedNote.style.top);

        updateNote(noteId, { position: { x, y } });

        draggedNote = null;
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
    }
}

// Color picker functions
function toggleColorPicker(noteId) {
    closeAllModals();

    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
    const existingPicker = noteElement.querySelector('.color-picker');

    if (existingPicker) {
        existingPicker.remove();
        return;
    }

    const colorPicker = document.createElement('div');
    colorPicker.className = 'color-picker';

    const colors = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange', 'red', 'teal', 'indigo', 'gray'];

    colors.forEach(color => {
        const colorOption = document.createElement('div');
        colorOption.className = `color-option ${color}`;
        colorOption.addEventListener('click', () => {
            changeNoteColor(noteId, color);
            colorPicker.remove();
        });
        colorPicker.appendChild(colorOption);
    });

    noteElement.querySelector('.note-controls').appendChild(colorPicker);
}

function changeNoteColor(noteId, color) {
    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);

    // Remove all color classes
    const colors = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange', 'red', 'teal', 'indigo', 'gray'];
    colors.forEach(c => noteElement.classList.remove(c));

    // Add new color class
    noteElement.classList.add(color);

    // Update in database
    updateNote(noteId, { color });
}

// Size picker functions
function toggleSizePicker(noteId) {
    closeAllModals();

    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
    const existingPicker = noteElement.querySelector('.size-picker');

    if (existingPicker) {
        existingPicker.remove();
        return;
    }

    const sizePicker = document.createElement('div');
    sizePicker.className = 'size-picker';

    const sizes = [
        { name: 'Small', value: 'small' },
        { name: 'Medium', value: 'medium' },
        { name: 'Large', value: 'large' }
    ];

    sizes.forEach(size => {
        const sizeOption = document.createElement('button');
        sizeOption.className = 'size-option';
        sizeOption.textContent = size.name;
        sizeOption.addEventListener('click', () => {
            changeNoteSize(noteId, size.value);
            sizePicker.remove();
        });
        sizePicker.appendChild(sizeOption);
    });

    noteElement.querySelector('.note-controls').appendChild(sizePicker);
}

function changeNoteSize(noteId, size) {
    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);

    // Remove all size classes
    const sizes = ['small', 'medium', 'large'];
    sizes.forEach(s => noteElement.classList.remove(s));

    // Add new size class
    noteElement.classList.add(size);

    // Update in database
    updateNote(noteId, { size });
}

// Emoji functions
function setupEmojiModal() {
    const emojiCategories = document.querySelectorAll('.emoji-category');
    const emojiGrid = document.getElementById('emojiGrid');

    emojiCategories.forEach(category => {
        category.addEventListener('click', () => {
            // Update active category
            document.querySelector('.emoji-category.active').classList.remove('active');
            category.classList.add('active');

            // Load emojis for selected category
            const categoryName = category.dataset.category;
            loadEmojiCategory(categoryName);
        });
    });

    // Load default category
    loadEmojiCategory('smileys');
}

function loadEmojiCategory(category) {
    const emojiGrid = document.getElementById('emojiGrid');
    emojiGrid.innerHTML = '';

    emojiData[category].forEach(emoji => {
        const emojiButton = document.createElement('button');
        emojiButton.className = 'emoji-item';
        emojiButton.textContent = emoji;
        emojiButton.addEventListener('click', () => {
            insertEmoji(emoji);
            closeEmojiPicker();
        });
        emojiGrid.appendChild(emojiButton);
    });
}

function openEmojiPicker(noteId) {
    currentEmojiTarget = currentEmojiTarget || document.querySelector(`[data-note-id="${noteId}"] .note-title`);
    emojiModal.classList.remove('hidden');
}

function closeEmojiPicker() {
    emojiModal.classList.add('hidden');
    currentEmojiTarget = null;
}

function insertEmoji(emoji) {
    if (currentEmojiTarget) {
        const cursorPos = currentEmojiTarget.selectionStart;
        const textBefore = currentEmojiTarget.value.substring(0, cursorPos);
        const textAfter = currentEmojiTarget.value.substring(currentEmojiTarget.selectionEnd);

        currentEmojiTarget.value = textBefore + emoji + textAfter;
        currentEmojiTarget.focus();
        currentEmojiTarget.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);

        // Trigger input event to save changes
        currentEmojiTarget.dispatchEvent(new Event('input'));
    }
}
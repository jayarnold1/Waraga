// ==================== DATA STRUCTURE ====================
let fileSystem = {
    id: 'root',
    name: 'Root',
    type: 'folder',
    parent: null,
    children: [],
    documents: [],
    expanded: true,
    createdAt: new Date().toISOString()
};

let currentFolderId = 'root';
let currentDocId = null;
let currentSelectedMedia = null;
let currentMediaType = null;
let isPanelMinimized = false;
let itemToRename = null;
let isDraggingMedia = false; // Flag untuk mencegah alert saat drag

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Editor initialized');
    
    if (!Auth.isAdmin()) {
        window.location.href = 'login.html';
        return;
    }

    loadFileSystem();
    setupFolderTree();
    setupEditor();
    setupToolbar();
    setupMediaUploads();
    setupFloatingPanel();
    setupModals();
    setupDragAndDrop();
    
    document.getElementById('newFolderBtn').addEventListener('click', () => openNewFolderModal());
    document.getElementById('newDocBtnSidebar').addEventListener('click', () => createNewDocument());
    document.getElementById('saveDocBtn').addEventListener('click', () => saveDocument());
    document.getElementById('previewBtn').addEventListener('click', () => previewDocument());
    document.getElementById('newDocBtn').addEventListener('click', () => createNewDocument());
    
    // Check URL for document ID
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');
    if (docId) {
        loadDocumentById(docId);
    }
});

// ==================== FILE SYSTEM FUNCTIONS ====================
function loadFileSystem() {
    const saved = localStorage.getItem('fileSystem');
    if (saved) {
        fileSystem = JSON.parse(saved);
    } else {
        fileSystem = {
            id: 'root',
            name: 'Root',
            type: 'folder',
            parent: null,
            children: [],
            documents: [],
            expanded: true,
            createdAt: new Date().toISOString()
        };
        saveFileSystem();
    }
}

function saveFileSystem() {
    localStorage.setItem('fileSystem', JSON.stringify(fileSystem));
}

function findItemById(id, root = fileSystem) {
    if (root.id === id) return root;
    
    if (root.documents) {
        const doc = root.documents.find(d => d.id === id);
        if (doc) return doc;
    }
    
    if (root.children) {
        for (let child of root.children) {
            const found = findItemById(id, child);
            if (found) return found;
        }
    }
    return null;
}

function findParentFolder(childId, root = fileSystem) {
    if (root.documents && root.documents.some(d => d.id === childId)) return root;
    if (root.children && root.children.some(c => c.id === childId)) return root;
    
    if (root.children) {
        for (let child of root.children) {
            const found = findParentFolder(childId, child);
            if (found) return found;
        }
    }
    return null;
}

function getFolderPath(folderId) {
    const path = [];
    let current = findItemById(folderId);
    
    while (current && current.id !== 'root') {
        path.unshift(current);
        current = findParentFolder(current.id);
    }
    if (current && current.id === 'root') path.unshift(fileSystem);
    
    return path;
}

function loadDocumentById(docId) {
    const doc = findItemById(docId);
    if (doc && doc.title !== undefined) {
        const parent = findParentFolder(docId);
        if (parent) {
            currentDocId = docId;
            currentFolderId = parent.id;
            document.getElementById('docTitle').value = doc.title || '';
            document.getElementById('editor').innerHTML = doc.content || '<p>Mulai menulis di sini...</p>';
            
            highlightFolder(parent.id);
            updateBreadcrumb(parent.id);
            
            setTimeout(() => {
                attachMediaClickHandlers();
                makeMediaDraggable();
                restoreMediaStyles(); // Restore semua style media
                restoreVideoStyles(); // Restore style video
                restoreFileAttachments(); // Restore file attachments
            }, 100);
        }
    }
}

// ==================== FOLDER TREE RENDER ====================
function setupFolderTree() {
    renderFolderTree(fileSystem, document.getElementById('folderTree'), 0);
}

function renderFolderTree(folder, container, level) {
    if (!folder) return;
    
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder-item';
    folderDiv.setAttribute('data-id', folder.id);
    folderDiv.setAttribute('data-type', 'folder');
    
    const folderHeader = document.createElement('div');
    folderHeader.className = 'folder-header';
    folderHeader.style.paddingLeft = `${level * 20}px`;
    
    const toggleIcon = document.createElement('i');
    const hasChildren = (folder.children && folder.children.length > 0) || (folder.documents && folder.documents.length > 0);
    toggleIcon.className = `fas fa-chevron-${folder.expanded && hasChildren ? 'down' : 'right'} folder-toggle`;
    toggleIcon.style.cursor = hasChildren ? 'pointer' : 'default';
    toggleIcon.style.width = '16px';
    toggleIcon.style.opacity = hasChildren ? '1' : '0.3';
    
    const folderIcon = document.createElement('i');
    folderIcon.className = 'fas fa-folder';
    folderIcon.style.color = '#f59e0b';
    folderIcon.style.margin = '0 8px';
    
    const folderName = document.createElement('span');
    folderName.className = 'folder-name';
    folderName.textContent = folder.name;
    folderName.style.cursor = 'pointer';
    folderName.style.flex = '1';
    
    const folderActions = document.createElement('div');
    folderActions.className = 'folder-actions';
    
    const newDocBtn = document.createElement('button');
    newDocBtn.className = 'folder-action-btn';
    newDocBtn.innerHTML = '<i class="fas fa-file-plus"></i>';
    newDocBtn.title = 'Buat dokumen';
    newDocBtn.onclick = (e) => { e.stopPropagation(); createDocumentInFolder(folder.id); };
    
    const newFolderBtn = document.createElement('button');
    newFolderBtn.className = 'folder-action-btn';
    newFolderBtn.innerHTML = '<i class="fas fa-folder-plus"></i>';
    newFolderBtn.title = 'Buat sub folder';
    newFolderBtn.onclick = (e) => { e.stopPropagation(); openNewSubFolderModal(folder.id); };
    
    const renameBtn = document.createElement('button');
    renameBtn.className = 'folder-action-btn';
    renameBtn.innerHTML = '<i class="fas fa-edit"></i>';
    renameBtn.title = 'Rename';
    renameBtn.onclick = (e) => { e.stopPropagation(); openRenameModal(folder.id, 'folder', folder.name); };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'folder-action-btn delete';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'Hapus';
    deleteBtn.onclick = (e) => { e.stopPropagation(); deleteFolder(folder.id); };
    
    folderActions.appendChild(newDocBtn);
    folderActions.appendChild(newFolderBtn);
    folderActions.appendChild(renameBtn);
    folderActions.appendChild(deleteBtn);
    
    folderHeader.appendChild(toggleIcon);
    folderHeader.appendChild(folderIcon);
    folderHeader.appendChild(folderName);
    folderHeader.appendChild(folderActions);
    folderDiv.appendChild(folderHeader);
    
    const docsContainer = document.createElement('div');
    docsContainer.className = 'folder-docs';
    docsContainer.style.paddingLeft = `${level * 20 + 24}px`;
    
    if (folder.documents && folder.documents.length > 0) {
        folder.documents.forEach(doc => {
            const docItem = createDocumentItem(doc, folder.id);
            docsContainer.appendChild(docItem);
        });
    } else {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-docs-msg';
        emptyMsg.textContent = 'Tidak ada dokumen';
        docsContainer.appendChild(emptyMsg);
    }
    folderDiv.appendChild(docsContainer);
    
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'folder-children';
    childrenContainer.style.display = folder.expanded ? 'block' : 'none';
    
    if (folder.children && folder.children.length > 0) {
        folder.children.forEach(child => {
            renderFolderTree(child, childrenContainer, level + 1);
        });
    }
    folderDiv.appendChild(childrenContainer);
    container.appendChild(folderDiv);
    
    if (hasChildren) {
        toggleIcon.onclick = (e) => {
            e.stopPropagation();
            folder.expanded = !folder.expanded;
            toggleIcon.className = `fas fa-chevron-${folder.expanded ? 'down' : 'right'}`;
            childrenContainer.style.display = folder.expanded ? 'block' : 'none';
            saveFileSystem();
        };
    }
    
    folderName.onclick = (e) => {
        e.stopPropagation();
        currentFolderId = folder.id;
        updateBreadcrumb(folder.id);
        highlightFolder(folder.id);
    };
}

function createDocumentItem(doc, folderId) {
    const docItem = document.createElement('div');
    docItem.className = 'doc-item-inline';
    docItem.setAttribute('data-id', doc.id);
    
    const docIcon = document.createElement('i');
    docIcon.className = 'fas fa-file-alt';
    docIcon.style.color = '#3b82f6';
    docIcon.style.marginRight = '8px';
    
    const docName = document.createElement('span');
    docName.className = 'doc-name';
    docName.textContent = doc.title || 'Untitled';
    docName.style.flex = '1';
    docName.style.cursor = 'pointer';
    
    const docActions = document.createElement('div');
    docActions.className = 'doc-actions';
    
    const renameBtn = document.createElement('button');
    renameBtn.className = 'folder-action-btn';
    renameBtn.innerHTML = '<i class="fas fa-edit"></i>';
    renameBtn.onclick = (e) => {
        e.stopPropagation();
        openRenameModal(doc.id, 'document', doc.title);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'folder-action-btn delete';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteDocumentFromFolder(folderId, doc.id);
    };
    
    docActions.appendChild(renameBtn);
    docActions.appendChild(deleteBtn);
    
    docItem.appendChild(docIcon);
    docItem.appendChild(docName);
    docItem.appendChild(docActions);
    
    docItem.onclick = (e) => {
        if (!e.target.closest('.folder-action-btn')) {
            loadDocumentFromFolder(folderId, doc.id);
        }
    };
    
    return docItem;
}

function highlightFolder(folderId) {
    document.querySelectorAll('.folder-item').forEach(folder => {
        folder.classList.remove('active');
    });
    const activeFolder = document.querySelector(`.folder-item[data-id="${folderId}"]`);
    if (activeFolder) activeFolder.classList.add('active');
}

function updateBreadcrumb(folderId) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    
    breadcrumb.innerHTML = '';
    
    const path = getFolderPath(folderId);
    
    path.forEach((item, index) => {
        const crumb = document.createElement('span');
        crumb.className = 'breadcrumb-item';
        if (index === path.length - 1) {
            crumb.classList.add('active');
            crumb.textContent = item.name;
        } else {
            crumb.innerHTML = `<a href="#" data-id="${item.id}">${escapeHtml(item.name)}</a>`;
            crumb.querySelector('a').onclick = (e) => {
                e.preventDefault();
                currentFolderId = item.id;
                updateBreadcrumb(item.id);
                highlightFolder(item.id);
                refreshFolderTree();
            };
        }
        breadcrumb.appendChild(crumb);
        
        if (index < path.length - 1) {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.innerHTML = '<i class="fas fa-chevron-right"></i>';
            breadcrumb.appendChild(separator);
        }
    });
}

function refreshFolderTree() {
    const container = document.getElementById('folderTree');
    if (container) {
        container.innerHTML = '';
        renderFolderTree(fileSystem, container, 0);
    }
}

// ==================== CRUD OPERATIONS ====================
function openNewFolderModal(parentId = null) {
    const modal = document.getElementById('folderModal');
    if (!modal) return;
    
    const parentSelect = document.getElementById('folderParent');
    
    parentSelect.innerHTML = '<option value="root">Root (Utama)</option>';
    
    function addFolders(folder, level) {
        if (folder.id !== 'root') {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = '  '.repeat(level) + folder.name;
            parentSelect.appendChild(option);
        }
        if (folder.children) {
            folder.children.forEach(child => addFolders(child, level + 1));
        }
    }
    addFolders(fileSystem, 0);
    
    if (parentId) parentSelect.value = parentId;
    document.getElementById('folderName').value = '';
    modal.style.display = 'block';
}

function openNewSubFolderModal(parentId) {
    openNewFolderModal(parentId);
}

function createFolder() {
    const name = document.getElementById('folderName').value.trim();
    const parentId = document.getElementById('folderParent').value;
    
    if (!name) {
        alert('Nama folder tidak boleh kosong!');
        return;
    }
    
    const parent = findItemById(parentId);
    if (parent && parent.type === 'folder') {
        const newFolder = {
            id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: name,
            type: 'folder',
            parent: parentId,
            children: [],
            documents: [],
            expanded: true,
            createdAt: new Date().toISOString()
        };
        
        if (!parent.children) parent.children = [];
        parent.children.push(newFolder);
        saveFileSystem();
        refreshFolderTree();
        
        document.getElementById('folderModal').style.display = 'none';
        alert('Folder berhasil dibuat!');
    }
}

function createDocumentInFolder(folderId) {
    const parent = findItemById(folderId);
    if (parent && parent.type === 'folder') {
        const newDoc = {
            id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            title: 'Dokumen Baru',
            content: '<p>Mulai menulis di sini... Klik pada gambar/video/audio untuk membuka panel editor yang bisa dipindahkan!</p>',
            updatedAt: new Date().toISOString()
        };
        
        if (!parent.documents) parent.documents = [];
        parent.documents.push(newDoc);
        saveFileSystem();
        refreshFolderTree();
        
        loadDocumentFromFolder(folderId, newDoc.id);
        alert('Dokumen baru dibuat!');
    }
}

function createNewDocument() {
    if (!currentFolderId) currentFolderId = 'root';
    createDocumentInFolder(currentFolderId);
}

function loadDocumentFromFolder(folderId, docId) {
    const folder = findItemById(folderId);
    if (folder && folder.documents) {
        const doc = folder.documents.find(d => d.id === docId);
        if (doc) {
            currentDocId = doc.id;
            currentFolderId = folderId;
            document.getElementById('docTitle').value = doc.title || '';
            document.getElementById('editor').innerHTML = doc.content || '<p>Mulai menulis di sini...</p>';
            
            highlightFolder(folderId);
            updateBreadcrumb(folderId);
            
            setTimeout(() => {
                attachMediaClickHandlers();
                makeMediaDraggable();
                restoreMediaStyles(); // Restore semua style media
                restoreVideoStyles(); // Restore style video
                restoreFileAttachments(); // Restore file attachments
            }, 100);
        }
    }
}

function saveDocument() {
    if (!currentDocId) {
        createNewDocument();
        return;
    }
    
    const title = document.getElementById('docTitle').value;
    
    // Simpan styles ke attribute sebelum save
    saveMediaStylesToAttributes();
    saveVideoStylesToAttributes();
    
    const folder = findItemById(currentFolderId);
    if (folder && folder.documents) {
        const doc = folder.documents.find(d => d.id === currentDocId);
        if (doc) {
            doc.title = title || 'Untitled';
            doc.content = document.getElementById('editor').innerHTML;
            doc.updatedAt = new Date().toISOString();
            saveFileSystem();
            refreshFolderTree();
            alert('Dokumen berhasil disimpan!');
        }
    }
}

function deleteFolder(folderId) {
    if (folderId === 'root') {
        alert('Root folder tidak dapat dihapus!');
        return;
    }
    
    if (confirm('Apakah Anda yakin ingin menghapus folder ini? Semua isinya akan ikut terhapus!')) {
        const parent = findParentFolder(folderId);
        if (parent && parent.children) {
            const index = parent.children.findIndex(c => c.id === folderId);
            if (index !== -1) {
                parent.children.splice(index, 1);
                saveFileSystem();
                refreshFolderTree();
                
                if (currentFolderId === folderId) {
                    currentFolderId = 'root';
                    updateBreadcrumb('root');
                    highlightFolder('root');
                }
                alert('Folder berhasil dihapus!');
            }
        }
    }
}

function deleteDocumentFromFolder(folderId, docId) {
    if (confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
        const folder = findItemById(folderId);
        if (folder && folder.documents) {
            const index = folder.documents.findIndex(d => d.id === docId);
            if (index !== -1) {
                folder.documents.splice(index, 1);
                saveFileSystem();
                refreshFolderTree();
                
                if (currentDocId === docId) {
                    currentDocId = null;
                    document.getElementById('docTitle').value = '';
                    document.getElementById('editor').innerHTML = '<p>Mulai menulis di sini...</p>';
                }
                alert('Dokumen berhasil dihapus!');
            }
        }
    }
}

function openRenameModal(id, type, currentName) {
    itemToRename = { id, type, currentName };
    const modal = document.getElementById('renameModal');
    const titleElem = document.getElementById('renameTitle');
    
    if (titleElem) {
        if (type === 'folder') {
            titleElem.innerHTML = '<i class="fas fa-folder-edit"></i> Rename Folder';
        } else {
            titleElem.innerHTML = '<i class="fas fa-file-edit"></i> Rename Dokumen';
        }
    }
    
    document.getElementById('renameInput').value = currentName;
    modal.style.display = 'block';
}

function confirmRename() {
    const newName = document.getElementById('renameInput').value.trim();
    if (!newName) {
        alert('Nama tidak boleh kosong!');
        return;
    }
    
    const item = findItemById(itemToRename.id);
    if (item) {
        if (itemToRename.type === 'folder') {
            item.name = newName;
        } else {
            item.title = newName;
            if (currentDocId === itemToRename.id) {
                document.getElementById('docTitle').value = newName;
            }
        }
        saveFileSystem();
        refreshFolderTree();
        alert('Berhasil diubah!');
    }
    
    document.getElementById('renameModal').style.display = 'none';
    itemToRename = null;
}

// ==================== MEDIA FUNCTIONS ====================
function setupEditor() {
    const editor = document.getElementById('editor');
    
    editor.addEventListener('click', (e) => {
        // Jangan buka panel jika sedang drag
        if (isDraggingMedia) return;
        
        let target = e.target;
        if (target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.tagName === 'AUDIO') {
            e.preventDefault();
            e.stopPropagation();
            currentSelectedMedia = target;
            if (target.tagName === 'IMG') currentMediaType = 'image';
            else if (target.tagName === 'VIDEO') currentMediaType = 'video';
            else if (target.tagName === 'AUDIO') currentMediaType = 'audio';
            openFloatingPanel(currentSelectedMedia);
        }
    });
    
    editor.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                insertImageToEditor(file);
                break;
            }
        }
    });
}

function insertImageToEditor(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert('Silakan pilih file gambar yang valid!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const imgId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        const wrapper = createMediaWrapper('image');
        wrapper.setAttribute('data-media-id', imgId);
        
        const img = document.createElement('img');
        img.src = event.target.result;
        img.alt = file.name;
        img.style.maxWidth = '300px';
        img.style.height = 'auto';
        img.style.cursor = 'pointer';
        img.style.borderRadius = '8px';
        img.className = 'media-content';
        img.setAttribute('data-media-id', imgId);
        img.setAttribute('data-original-width', '300');
        img.setAttribute('data-position', 'left');
        img.setAttribute('data-style', 'none');
        
        wrapper.appendChild(img);
        insertMediaAtCursor(wrapper);
        makeElementDraggable(wrapper);
        attachMediaClickHandlers();
        
        // Simpan tanpa alert
        saveDocumentSilent();
    };
    reader.readAsDataURL(file);
}

function insertVideoToEditor(file) {
    if (!file || !file.type.startsWith('video/')) {
        alert('Silakan pilih file video yang valid!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const videoId = 'video_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        const wrapper = createMediaWrapper('video');
        wrapper.setAttribute('data-media-id', videoId);
        
        const video = document.createElement('video');
        video.controls = true;
        video.style.maxWidth = '100%';
        video.style.height = 'auto';
        video.style.borderRadius = '8px';
        video.className = 'media-content';
        video.setAttribute('data-media-id', videoId);
        video.setAttribute('data-width', '100%');
        video.setAttribute('data-position', 'left');
        
        const source = document.createElement('source');
        source.src = event.target.result;
        source.type = file.type;
        video.appendChild(source);
        
        wrapper.appendChild(video);
        insertMediaAtCursor(wrapper);
        makeElementDraggable(wrapper);
        attachMediaClickHandlers();
        saveDocumentSilent();
    };
    reader.readAsDataURL(file);
}

function insertAudioToEditor(file) {
    if (!file || !file.type.startsWith('audio/')) {
        alert('Silakan pilih file audio yang valid!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const wrapper = createMediaWrapper('audio');
        
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.style.width = '300px';
        audio.className = 'media-content';
        
        const source = document.createElement('source');
        source.src = event.target.result;
        source.type = file.type;
        audio.appendChild(source);
        
        const audioName = document.createElement('div');
        audioName.className = 'audio-name';
        audioName.innerHTML = `<i class="fas fa-music"></i> ${escapeHtml(file.name)}`;
        audioName.style.marginTop = '5px';
        audioName.style.fontSize = '12px';
        audioName.style.color = '#64748b';
        
        wrapper.appendChild(audio);
        wrapper.appendChild(audioName);
        insertMediaAtCursor(wrapper);
        makeElementDraggable(wrapper);
        attachMediaClickHandlers();
        saveDocumentSilent();
    };
    reader.readAsDataURL(file);
}

function saveDocumentSilent() {
    if (!currentDocId) {
        createNewDocument();
        return;
    }
    
    const title = document.getElementById('docTitle').value;
    saveMediaStylesToAttributes();
    saveVideoStylesToAttributes();
    
    const folder = findItemById(currentFolderId);
    if (folder && folder.documents) {
        const doc = folder.documents.find(d => d.id === currentDocId);
        if (doc) {
            doc.title = title || 'Untitled';
            doc.content = document.getElementById('editor').innerHTML;
            doc.updatedAt = new Date().toISOString();
            saveFileSystem();
            refreshFolderTree();
        }
    }
}

function createMediaWrapper(type) {
    const wrapper = document.createElement('div');
    wrapper.className = `media-wrapper ${type}-wrapper`;
    wrapper.setAttribute('data-type', type);
    wrapper.style.display = 'inline-block';
    wrapper.style.position = 'relative';
    wrapper.style.cursor = 'pointer';
    wrapper.style.margin = '10px';
    wrapper.style.verticalAlign = 'middle';
    
    // Add drag handle indicator
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '<i class="fas fa-arrows-alt"></i> Drag';
    dragHandle.style.position = 'absolute';
    dragHandle.style.top = '5px';
    dragHandle.style.right = '5px';
    dragHandle.style.background = 'rgba(0,0,0,0.6)';
    dragHandle.style.color = 'white';
    dragHandle.style.borderRadius = '4px';
    dragHandle.style.padding = '2px 8px';
    dragHandle.style.fontSize = '10px';
    dragHandle.style.cursor = 'move';
    dragHandle.style.zIndex = '10';
    dragHandle.style.display = 'none';
    
    wrapper.appendChild(dragHandle);
    
    // Show drag handle on hover
    wrapper.addEventListener('mouseenter', () => {
        dragHandle.style.display = 'block';
    });
    wrapper.addEventListener('mouseleave', () => {
        dragHandle.style.display = 'none';
    });
    
    return wrapper;
}

function insertMediaAtCursor(wrapper) {
    const editor = document.getElementById('editor');
    editor.focus();
    
    const selection = window.getSelection();
    let range;
    
    if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(wrapper);
        
        const space = document.createTextNode(' ');
        range.setStartAfter(wrapper);
        range.insertNode(space);
        
        range.setStartAfter(space);
        range.setEndAfter(space);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        editor.appendChild(wrapper);
        editor.appendChild(document.createTextNode(' '));
    }
}

function makeElementDraggable(element) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let hasMoved = false;
    
    const dragHandle = element.querySelector('.drag-handle');
    if (!dragHandle) return;
    
    dragHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        hasMoved = false;
        isDraggingMedia = true;
        
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = element.getBoundingClientRect();
        const parentRect = element.parentElement.getBoundingClientRect();
        
        initialLeft = rect.left - parentRect.left;
        initialTop = rect.top - parentRect.top;
        
        element.style.position = 'absolute';
        element.style.left = initialLeft + 'px';
        element.style.top = initialTop + 'px';
        element.style.zIndex = '1000';
        element.style.cursor = 'grabbing';
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    
    function onMouseMove(e) {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
        }
        
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;
        
        const parentRect = element.parentElement.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        newLeft = Math.max(0, Math.min(newLeft, parentRect.width - elementRect.width));
        newTop = Math.max(0, Math.min(newTop, parentRect.height - elementRect.height));
        
        element.style.left = newLeft + 'px';
        element.style.top = newTop + 'px';
    }
    
    function onMouseUp() {
        isDragging = false;
        isDraggingMedia = false;
        
        if (hasMoved) {
            // Hanya simpan jika benar-benar dipindah
            saveDocumentSilent();
        }
        
        element.style.position = 'relative';
        element.style.left = '';
        element.style.top = '';
        element.style.zIndex = '';
        element.style.cursor = '';
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

function makeMediaDraggable() {
    const wrappers = document.querySelectorAll('#editor .media-wrapper');
    wrappers.forEach(wrapper => {
        makeElementDraggable(wrapper);
    });
}

function setupDragAndDrop() {
    const editor = document.getElementById('editor');
    
    editor.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    editor.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                insertImageToEditor(file);
            } else if (file.type.startsWith('video/')) {
                insertVideoToEditor(file);
            } else if (file.type.startsWith('audio/')) {
                insertAudioToEditor(file);
            }
        }
    });
}

// Fungsi untuk menyimpan semua style gambar ke atribut
function saveMediaStylesToAttributes() {
    const images = document.querySelectorAll('#editor img');
    images.forEach(img => {
        const wrapper = img.closest('.media-wrapper');
        if (wrapper) {
            // Simpan posisi
            let position = 'left';
            if (wrapper.style.float === 'left') position = 'left';
            else if (wrapper.style.float === 'right') position = 'right';
            else if (wrapper.style.display === 'block' && wrapper.style.margin === '10px auto') position = 'center';
            img.setAttribute('data-position', position);
            
            // Simpan lebar
            const width = parseInt(img.style.width) || 300;
            img.setAttribute('data-width', width);
            
            // Simpan style border/rounded/shadow
            let style = 'none';
            if (img.classList.contains('rounded')) style = 'rounded';
            else if (img.classList.contains('shadow')) style = 'shadow';
            else if (img.classList.contains('border')) style = 'border';
            img.setAttribute('data-style', style);
            
            // Simpan margin
            const margin = wrapper.style.margin;
            if (margin && margin !== '10px') {
                const margins = margin.split(' ');
                if (margins.length === 4) {
                    img.setAttribute('data-margin-top', parseInt(margins[0]));
                    img.setAttribute('data-margin-right', parseInt(margins[1]));
                    img.setAttribute('data-margin-bottom', parseInt(margins[2]));
                    img.setAttribute('data-margin-left', parseInt(margins[3]));
                }
            }
            
            // Simpan efek
            if (img.style.opacity === '0.7') img.setAttribute('data-effect-opacity', 'true');
            else img.removeAttribute('data-effect-opacity');
            
            if (img.style.filter && img.style.filter.includes('grayscale')) img.setAttribute('data-effect-grayscale', 'true');
            else img.removeAttribute('data-effect-grayscale');
            
            if (img.style.filter && img.style.filter.includes('blur')) img.setAttribute('data-effect-blur', 'true');
            else img.removeAttribute('data-effect-blur');
            
            if (img.style.transform && img.style.transform.includes('rotate')) img.setAttribute('data-effect-rotate', 'true');
            else img.removeAttribute('data-effect-rotate');
        }
    });
}

// Fungsi untuk menyimpan style video ke atribut
function saveVideoStylesToAttributes() {
    const videos = document.querySelectorAll('#editor video');
    videos.forEach(video => {
        const wrapper = video.closest('.media-wrapper');
        if (wrapper) {
            // Simpan posisi
            let position = 'left';
            if (wrapper.style.float === 'left') position = 'left';
            else if (wrapper.style.float === 'right') position = 'right';
            else if (wrapper.style.display === 'block' && wrapper.style.margin === '10px auto') position = 'center';
            video.setAttribute('data-position', position);
            
            // Simpan lebar
            const width = parseInt(video.style.width) || 100;
            video.setAttribute('data-width', width);
            
            // Simpan margin
            const margin = wrapper.style.margin;
            if (margin && margin !== '10px') {
                const margins = margin.split(' ');
                if (margins.length === 4) {
                    video.setAttribute('data-margin-top', parseInt(margins[0]));
                    video.setAttribute('data-margin-right', parseInt(margins[1]));
                    video.setAttribute('data-margin-bottom', parseInt(margins[2]));
                    video.setAttribute('data-margin-left', parseInt(margins[3]));
                }
            }
        }
    });
}

// Fungsi untuk restore style gambar dari atribut
function restoreMediaStyles() {
    const images = document.querySelectorAll('#editor img');
    images.forEach(img => {
        const wrapper = img.closest('.media-wrapper');
        if (wrapper) {
            // Restore posisi
            const position = img.getAttribute('data-position');
            if (position) {
                wrapper.style.float = 'none';
                wrapper.style.display = 'inline-block';
                if (position === 'left') {
                    wrapper.style.float = 'left';
                    wrapper.style.margin = '10px 20px 10px 0';
                    wrapper.style.maxWidth = '50%';
                } else if (position === 'right') {
                    wrapper.style.float = 'right';
                    wrapper.style.margin = '10px 0 10px 20px';
                    wrapper.style.maxWidth = '50%';
                } else if (position === 'center') {
                    wrapper.style.display = 'block';
                    wrapper.style.margin = '10px auto';
                    wrapper.style.float = 'none';
                }
            }
            
            // Restore lebar
            const width = img.getAttribute('data-width');
            if (width) {
                img.style.width = width + 'px';
                img.style.height = 'auto';
            }
            
            // Restore style
            const style = img.getAttribute('data-style');
            if (style) {
                img.classList.remove('rounded', 'shadow', 'border');
                if (style === 'rounded') {
                    img.classList.add('rounded');
                    img.style.borderRadius = '12px';
                } else if (style === 'shadow') {
                    img.classList.add('shadow');
                    img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                } else if (style === 'border') {
                    img.classList.add('border');
                    img.style.border = '3px solid #3b82f6';
                }
            }
            
            // Restore margin
            const marginTop = img.getAttribute('data-margin-top');
            const marginRight = img.getAttribute('data-margin-right');
            const marginBottom = img.getAttribute('data-margin-bottom');
            const marginLeft = img.getAttribute('data-margin-left');
            
            if (marginTop && marginRight && marginBottom && marginLeft) {
                wrapper.style.margin = `${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px`;
            }
            
            // Restore efek
            let filter = '';
            if (img.getAttribute('data-effect-opacity') === 'true') img.style.opacity = '0.7';
            else img.style.opacity = '1';
            
            if (img.getAttribute('data-effect-grayscale') === 'true') filter += 'grayscale(100%) ';
            if (img.getAttribute('data-effect-blur') === 'true') filter += 'blur(2px) ';
            img.style.filter = filter.trim();
            
            if (img.getAttribute('data-effect-rotate') === 'true') img.style.transform = 'rotate(90deg)';
            else img.style.transform = 'none';
        }
    });
}

// Fungsi untuk restore style video dari atribut
function restoreVideoStyles() {
    const videos = document.querySelectorAll('#editor video');
    videos.forEach(video => {
        const wrapper = video.closest('.media-wrapper');
        if (wrapper) {
            // Restore posisi
            const position = video.getAttribute('data-position');
            if (position) {
                wrapper.style.float = 'none';
                wrapper.style.display = 'inline-block';
                if (position === 'left') {
                    wrapper.style.float = 'left';
                    wrapper.style.margin = '10px 20px 10px 0';
                    wrapper.style.maxWidth = '50%';
                } else if (position === 'right') {
                    wrapper.style.float = 'right';
                    wrapper.style.margin = '10px 0 10px 20px';
                    wrapper.style.maxWidth = '50%';
                } else if (position === 'center') {
                    wrapper.style.display = 'block';
                    wrapper.style.margin = '10px auto';
                    wrapper.style.float = 'none';
                }
            }
            
            // Restore lebar
            const width = video.getAttribute('data-width');
            if (width) {
                video.style.width = width + '%';
                video.style.height = 'auto';
            }
            
            // Restore margin
            const marginTop = video.getAttribute('data-margin-top');
            const marginRight = video.getAttribute('data-margin-right');
            const marginBottom = video.getAttribute('data-margin-bottom');
            const marginLeft = video.getAttribute('data-margin-left');
            
            if (marginTop && marginRight && marginBottom && marginLeft) {
                wrapper.style.margin = `${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px`;
            }
        }
    });
}

// Fungsi untuk restore file attachments (sudah otomatis tersimpan dalam HTML)
function restoreFileAttachments() {
    // File attachments sudah tersimpan dalam innerHTML, 
    // tidak perlu restore khusus karena sudah berupa HTML
    const fileLinks = document.querySelectorAll('#editor .file-link');
    fileLinks.forEach(link => {
        // Pastikan link memiliki target _blank dan download attribute
        if (!link.hasAttribute('target')) {
            link.setAttribute('target', '_blank');
        }
    });
}

function attachMediaClickHandlers() {
    const mediaElements = document.querySelectorAll('#editor img, #editor video, #editor audio');
    mediaElements.forEach(media => {
        media.removeEventListener('click', media.clickHandler);
        media.clickHandler = (e) => {
            if (isDraggingMedia) return;
            e.preventDefault();
            e.stopPropagation();
            currentSelectedMedia = media;
            if (media.tagName === 'IMG') currentMediaType = 'image';
            else if (media.tagName === 'VIDEO') currentMediaType = 'video';
            else if (media.tagName === 'AUDIO') currentMediaType = 'audio';
            openFloatingPanel(media);
        };
        media.addEventListener('click', media.clickHandler);
    });
}

function setupMediaUploads() {
    // Upload Gambar
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const imageFileInput = document.getElementById('imageFileInput');
    
    if (uploadImageBtn && imageFileInput) {
        uploadImageBtn.onclick = () => imageFileInput.click();
        imageFileInput.onchange = (e) => {
            if (e.target.files[0]) insertImageToEditor(e.target.files[0]);
            e.target.value = '';
        };
    }
    
    // Upload Video
    const uploadVideoBtn = document.getElementById('uploadVideoBtn');
    const videoFileInput = document.getElementById('videoFileInput');
    
    if (uploadVideoBtn && videoFileInput) {
        uploadVideoBtn.onclick = () => videoFileInput.click();
        videoFileInput.onchange = (e) => {
            if (e.target.files[0]) insertVideoToEditor(e.target.files[0]);
            e.target.value = '';
        };
    }
    
    // Upload Audio
    const uploadAudioBtn = document.getElementById('uploadAudioBtn');
    const audioFileInput = document.getElementById('audioFileInput');
    
    if (uploadAudioBtn && audioFileInput) {
        uploadAudioBtn.onclick = () => audioFileInput.click();
        audioFileInput.onchange = (e) => {
            if (e.target.files[0]) insertAudioToEditor(e.target.files[0]);
            e.target.value = '';
        };
    }
    
    // Upload File
    const uploadFileBtn = document.getElementById('uploadFileBtn');
    const fileFileInput = document.getElementById('fileFileInput');
    
    if (uploadFileBtn && fileFileInput) {
        uploadFileBtn.onclick = () => fileFileInput.click();
        fileFileInput.onchange = (e) => {
            if (e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    const fileSize = (file.size / 1024).toFixed(2);
                    const fileExt = file.name.split('.').pop().toLowerCase();
                    let fileIcon = 'fa-file';
                    
                    if (fileExt === 'pdf') fileIcon = 'fa-file-pdf';
                    else if (fileExt === 'doc' || fileExt === 'docx') fileIcon = 'fa-file-word';
                    else if (fileExt === 'xls' || fileExt === 'xlsx') fileIcon = 'fa-file-excel';
                    else if (fileExt === 'ppt' || fileExt === 'pptx') fileIcon = 'fa-file-powerpoint';
                    else if (fileExt === 'zip' || fileExt === 'rar') fileIcon = 'fa-file-archive';
                    else if (fileExt === 'txt') fileIcon = 'fa-file-alt';
                    
                    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                    
                    const fileHtml = `<div class="file-attachment" data-file-id="${fileId}" style="margin: 10px 0;">
                        <a href="${event.target.result}" class="file-link" download="${file.name}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f1f5f9; border-radius: 8px; text-decoration: none; color: #3b82f6;">
                            <i class="fas ${fileIcon}"></i>
                            <span>${escapeHtml(file.name)}</span>
                            <small style="color: #64748b;">(${fileSize} KB)</small>
                        </a>
                    </div>`;
                    
                    const editor = document.getElementById('editor');
                    editor.focus();
                    document.execCommand('insertHTML', false, fileHtml);
                    saveDocumentSilent();
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        };
    }
}

function setupToolbar() {
    const buttons = document.querySelectorAll('.tool-btn[data-command]');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const command = btn.dataset.command;
            document.execCommand(command, false, null);
            document.getElementById('editor').focus();
        });
    });
    
    const fontSizeSelect = document.getElementById('fontSize');
    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === '1') document.execCommand('formatBlock', false, '<h1>');
            else if (value === '2') document.execCommand('formatBlock', false, '<h2>');
            else if (value === '3') document.execCommand('formatBlock', false, '<h3>');
            else document.execCommand('formatBlock', false, '<p>');
            document.getElementById('editor').focus();
        });
    }
}

function setupFloatingPanel() {
    const panel = document.getElementById('floatingEditorPanel');
    if (!panel) return;
    
    // Make panel draggable with jQuery UI
    $(panel).draggable({
        handle: '#panelHeader',
        containment: 'body',
        scroll: false,
        start: function() {
            $(this).css('z-index', 1000);
        }
    });
    
    // Minimize button
    const minimizeBtn = document.getElementById('panelMinimize');
    const panelBody = document.getElementById('panelBody');
    
    if (minimizeBtn && panelBody) {
        minimizeBtn.addEventListener('click', () => {
            isPanelMinimized = !isPanelMinimized;
            if (isPanelMinimized) {
                panelBody.style.display = 'none';
                minimizeBtn.innerHTML = '<i class="fas fa-plus"></i>';
            } else {
                panelBody.style.display = 'block';
                minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
            }
        });
    }
    
    // Close button
    const closeBtn = document.getElementById('panelClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });
    }
    
    // Position buttons
    const posButtons = document.querySelectorAll('.pos-btn');
    posButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const position = btn.dataset.position;
            if (currentSelectedMedia) {
                const wrapper = currentSelectedMedia.closest('.media-wrapper');
                if (wrapper) {
                    applyMediaPosition(wrapper, position);
                }
            }
            posButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Style buttons
    const styleBtns = document.querySelectorAll('.style-btn');
    styleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.dataset.style;
            if (currentSelectedMedia && currentSelectedMedia.tagName === 'IMG') {
                applyMediaStyle(currentSelectedMedia, style);
            }
            styleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Width slider
    const widthSlider = document.getElementById('mediaWidth');
    const widthValue = document.getElementById('widthValue');
    
    if (widthSlider && widthValue) {
        widthSlider.oninput = () => {
            widthValue.textContent = widthSlider.value + 'px';
            if (currentSelectedMedia) {
                currentSelectedMedia.style.width = widthSlider.value + 'px';
                if (currentMediaType !== 'audio') currentSelectedMedia.style.height = 'auto';
            }
        };
    }
    
    // Margin inputs
    const marginInputs = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'];
    marginInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', () => {
                if (currentSelectedMedia) {
                    const wrapper = currentSelectedMedia.closest('.media-wrapper');
                    const top = document.getElementById('marginTop').value;
                    const right = document.getElementById('marginRight').value;
                    const bottom = document.getElementById('marginBottom').value;
                    const left = document.getElementById('marginLeft').value;
                    
                    if (wrapper) {
                        wrapper.style.margin = `${top}px ${right}px ${bottom}px ${left}px`;
                    } else {
                        currentSelectedMedia.style.margin = `${top}px ${right}px ${bottom}px ${left}px`;
                    }
                }
            });
        }
    });
    
    // Apply changes button
    const applyBtn = document.getElementById('applyChanges');
    if (applyBtn) {
        applyBtn.onclick = () => {
            if (currentSelectedMedia) {
                const width = document.getElementById('mediaWidth').value;
                currentSelectedMedia.style.width = width + 'px';
                if (currentMediaType !== 'audio') currentSelectedMedia.style.height = 'auto';
                
                const top = document.getElementById('marginTop').value;
                const right = document.getElementById('marginRight').value;
                const bottom = document.getElementById('marginBottom').value;
                const left = document.getElementById('marginLeft').value;
                
                const wrapper = currentSelectedMedia.closest('.media-wrapper');
                if (wrapper) wrapper.style.margin = `${top}px ${right}px ${bottom}px ${left}px`;
                
                // Apply effects (only for images)
                if (currentMediaType === 'image') {
                    const effectOpacity = document.getElementById('effectOpacity').checked;
                    const effectGrayscale = document.getElementById('effectGrayscale').checked;
                    const effectBlur = document.getElementById('effectBlur').checked;
                    const effectRotate = document.getElementById('effectRotate').checked;
                    
                    applyMediaEffects(currentSelectedMedia, effectOpacity, effectGrayscale, effectBlur, effectRotate);
                }
                
                panel.style.display = 'none';
                saveDocumentSilent();
            }
        };
    }
    
    // Remove media button
    const removeBtn = document.getElementById('removeMedia');
    if (removeBtn) {
        removeBtn.onclick = () => {
            if (currentSelectedMedia) {
                const wrapper = currentSelectedMedia.closest('.media-wrapper');
                if (wrapper) wrapper.remove();
                else currentSelectedMedia.remove();
                panel.style.display = 'none';
                currentSelectedMedia = null;
                saveDocumentSilent();
            }
        };
    }
    
    // Audio controls
    const playAudioBtn = document.getElementById('playAudioBtn');
    const pauseAudioBtn = document.getElementById('pauseAudioBtn');
    const audioVolume = document.getElementById('audioVolume');
    
    if (playAudioBtn) {
        playAudioBtn.onclick = () => {
            if (currentSelectedMedia && currentSelectedMedia.tagName === 'AUDIO') {
                currentSelectedMedia.play();
            }
        };
    }
    
    if (pauseAudioBtn) {
        pauseAudioBtn.onclick = () => {
            if (currentSelectedMedia && currentSelectedMedia.tagName === 'AUDIO') {
                currentSelectedMedia.pause();
            }
        };
    }
    
    if (audioVolume) {
        audioVolume.oninput = (e) => {
            if (currentSelectedMedia && currentSelectedMedia.tagName === 'AUDIO') {
                currentSelectedMedia.volume = e.target.value / 100;
            }
        };
    }
    
    // Effect checkboxes (only for images)
    const effectOpacity = document.getElementById('effectOpacity');
    const effectGrayscale = document.getElementById('effectGrayscale');
    const effectBlur = document.getElementById('effectBlur');
    const effectRotate = document.getElementById('effectRotate');
    
    const effects = [effectOpacity, effectGrayscale, effectBlur, effectRotate];
    effects.forEach(effect => {
        if (effect) {
            effect.addEventListener('change', () => {
                if (currentSelectedMedia && currentMediaType === 'image') {
                    applyMediaEffects(
                        currentSelectedMedia,
                        effectOpacity ? effectOpacity.checked : false,
                        effectGrayscale ? effectGrayscale.checked : false,
                        effectBlur ? effectBlur.checked : false,
                        effectRotate ? effectRotate.checked : false
                    );
                }
            });
        }
    });
}

function applyMediaPosition(wrapper, position) {
    if (!wrapper) return;
    
    wrapper.style.float = 'none';
    wrapper.style.display = 'inline-block';
    wrapper.style.margin = '10px';
    
    switch(position) {
        case 'left':
            wrapper.style.float = 'left';
            wrapper.style.margin = '10px 20px 10px 0';
            wrapper.style.maxWidth = '50%';
            break;
        case 'center':
            wrapper.style.display = 'block';
            wrapper.style.margin = '10px auto';
            wrapper.style.float = 'none';
            wrapper.style.textAlign = 'center';
            break;
        case 'right':
            wrapper.style.float = 'right';
            wrapper.style.margin = '10px 0 10px 20px';
            wrapper.style.maxWidth = '50%';
            break;
    }
    
    const parent = wrapper.parentElement;
    if (parent && (position === 'left' || position === 'right')) {
        parent.style.overflow = 'auto';
    }
    
    wrapper.setAttribute('data-position', position);
}

function applyMediaStyle(media, style) {
    if (!media) return;
    
    media.classList.remove('rounded', 'shadow', 'border');
    
    switch(style) {
        case 'rounded':
            media.classList.add('rounded');
            media.style.borderRadius = '12px';
            break;
        case 'shadow':
            media.classList.add('shadow');
            media.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            break;
        case 'border':
            media.classList.add('border');
            media.style.border = '3px solid #3b82f6';
            break;
        default:
            media.style.borderRadius = '8px';
            media.style.boxShadow = 'none';
            media.style.border = 'none';
    }
}

function applyMediaEffects(media, opacity, grayscale, blur, rotate) {
    if (!media) return;
    
    let filter = '';
    let imgOpacity = '1';
    
    if (opacity) {
        imgOpacity = '0.7';
    }
    
    if (grayscale) {
        filter += 'grayscale(100%) ';
    }
    
    if (blur) {
        filter += 'blur(2px) ';
    }
    
    media.style.opacity = imgOpacity;
    media.style.filter = filter.trim();
    
    if (rotate) {
        media.style.transform = 'rotate(90deg)';
    } else {
        media.style.transform = 'none';
    }
}

function openFloatingPanel(media) {
    if (!media) return;
    
    const panel = document.getElementById('floatingEditorPanel');
    const wrapper = media.closest('.media-wrapper');
    
    // Update panel based on media type
    const panelIcon = document.getElementById('panelIcon');
    const panelTitle = document.getElementById('panelTitle');
    const styleGroup = document.getElementById('styleGroup');
    const audioControlsGroup = document.getElementById('audioControlsGroup');
    const effectGroup = document.getElementById('effectGroup');
    
    if (currentMediaType === 'image') {
        if (panelIcon) panelIcon.className = 'fas fa-image';
        if (panelTitle) panelTitle.textContent = 'Edit Gambar';
        if (styleGroup) styleGroup.style.display = 'block';
        if (effectGroup) effectGroup.style.display = 'block';
        if (audioControlsGroup) audioControlsGroup.style.display = 'none';
    } else if (currentMediaType === 'video') {
        if (panelIcon) panelIcon.className = 'fas fa-video';
        if (panelTitle) panelTitle.textContent = 'Edit Video';
        if (styleGroup) styleGroup.style.display = 'none';
        if (effectGroup) effectGroup.style.display = 'none';
        if (audioControlsGroup) audioControlsGroup.style.display = 'none';
    } else if (currentMediaType === 'audio') {
        if (panelIcon) panelIcon.className = 'fas fa-music';
        if (panelTitle) panelTitle.textContent = 'Edit Audio';
        if (styleGroup) styleGroup.style.display = 'none';
        if (effectGroup) effectGroup.style.display = 'none';
        if (audioControlsGroup) audioControlsGroup.style.display = 'block';
        if (media.volume !== undefined) {
            const audioVolume = document.getElementById('audioVolume');
            if (audioVolume) audioVolume.value = media.volume * 100;
        }
    }
    
    // Set current values
    let currentWidth = parseInt(media.style.width) || (currentMediaType === 'video' ? 100 : 300);
    if (isNaN(currentWidth)) currentWidth = currentMediaType === 'video' ? 100 : 300;
    
    const widthSlider = document.getElementById('mediaWidth');
    const widthValue = document.getElementById('widthValue');
    if (widthSlider) {
        widthSlider.value = currentWidth;
        if (currentMediaType === 'video') {
            widthSlider.max = 100;
            widthSlider.step = 1;
        } else {
            widthSlider.max = 800;
            widthSlider.step = 10;
        }
    }
    if (widthValue) widthValue.textContent = currentWidth + (currentMediaType === 'video' ? '%' : 'px');
    
    // Set position
    let currentPosition = 'left';
    if (wrapper) {
        if (wrapper.style.float === 'left') currentPosition = 'left';
        else if (wrapper.style.float === 'right') currentPosition = 'right';
        else if (wrapper.style.display === 'block' && wrapper.style.margin === '10px auto') currentPosition = 'center';
        else if (wrapper.style.display === 'block') currentPosition = 'center';
    }
    
    const posButtons = document.querySelectorAll('.pos-btn');
    posButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.position === currentPosition) btn.classList.add('active');
    });
    
    // Set style (only for images)
    if (currentMediaType === 'image') {
        const currentStyle = getMediaStyle(media);
        const styleBtns = document.querySelectorAll('.style-btn');
        styleBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.style === currentStyle) btn.classList.add('active');
        });
        
        // Set effects
        const effectOpacity = document.getElementById('effectOpacity');
        const effectGrayscale = document.getElementById('effectGrayscale');
        const effectBlur = document.getElementById('effectBlur');
        const effectRotate = document.getElementById('effectRotate');
        
        if (effectOpacity) effectOpacity.checked = media.style.opacity === '0.7';
        if (effectGrayscale) effectGrayscale.checked = media.style.filter && media.style.filter.includes('grayscale');
        if (effectBlur) effectBlur.checked = media.style.filter && media.style.filter.includes('blur');
        if (effectRotate) effectRotate.checked = media.style.transform && media.style.transform.includes('rotate');
    }
    
    // Set margin
    const targetElement = wrapper || media;
    const margin = targetElement.style.margin;
    if (margin && margin !== '10px') {
        const margins = margin.split(' ');
        if (margins.length === 4) {
            const marginTop = document.getElementById('marginTop');
            const marginRight = document.getElementById('marginRight');
            const marginBottom = document.getElementById('marginBottom');
            const marginLeft = document.getElementById('marginLeft');
            
            if (marginTop) marginTop.value = parseInt(margins[0]);
            if (marginRight) marginRight.value = parseInt(margins[1]);
            if (marginBottom) marginBottom.value = parseInt(margins[2]);
            if (marginLeft) marginLeft.value = parseInt(margins[3]);
        }
    } else {
        // Reset margin inputs to default
        const marginTop = document.getElementById('marginTop');
        const marginRight = document.getElementById('marginRight');
        const marginBottom = document.getElementById('marginBottom');
        const marginLeft = document.getElementById('marginLeft');
        if (marginTop) marginTop.value = 10;
        if (marginRight) marginRight.value = 10;
        if (marginBottom) marginBottom.value = 10;
        if (marginLeft) marginLeft.value = 10;
    }
    
    // Show preview
    const previewContainer = document.getElementById('mediaPreviewContainer');
    if (previewContainer) {
        previewContainer.innerHTML = '';
        const clone = media.cloneNode(true);
        clone.style.maxWidth = '100%';
        clone.style.maxHeight = '100px';
        if (clone.tagName === 'AUDIO') {
            clone.controls = true;
        }
        previewContainer.appendChild(clone);
    }
    
    // Position panel
    const mediaRect = media.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    
    let left = mediaRect.right + 10;
    let top = mediaRect.top;
    
    if (left + panelRect.width > window.innerWidth) {
        left = mediaRect.left - panelRect.width - 10;
    }
    if (top + panelRect.height > window.innerHeight) {
        top = window.innerHeight - panelRect.height - 10;
    }
    
    panel.style.position = 'fixed';
    panel.style.left = Math.max(10, left) + 'px';
    panel.style.top = Math.max(10, top) + 'px';
    panel.style.display = 'block';
    
    // Reset minimized state
    const panelBody = document.getElementById('panelBody');
    const minimizeBtn = document.getElementById('panelMinimize');
    if (isPanelMinimized && panelBody && minimizeBtn) {
        panelBody.style.display = 'none';
        minimizeBtn.innerHTML = '<i class="fas fa-plus"></i>';
    } else if (panelBody && minimizeBtn) {
        panelBody.style.display = 'block';
        minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
    }
}

function getMediaStyle(media) {
    if (media.classList.contains('rounded')) return 'rounded';
    if (media.classList.contains('shadow')) return 'shadow';
    if (media.classList.contains('border')) return 'border';
    return 'none';
}

function previewDocument() {
    const title = document.getElementById('docTitle').value;
    const content = document.getElementById('editor').innerHTML;
    
    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${escapeHtml(title) || 'Preview'}</title>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                body { font-family: 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
                img, video, audio { max-width: 100%; margin: 10px; }
                .media-wrapper { display: inline-block; margin: 10px; }
                .rounded { border-radius: 12px; }
                .shadow { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
                .border { border: 3px solid #3b82f6; }
                .file-link { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f1f5f9; border-radius: 8px; text-decoration: none; color: #3b82f6; }
                .audio-name { text-align: center; margin-top: 5px; font-size: 12px; color: #64748b; }
            </style>
        </head>
        <body>
            <h1>${escapeHtml(title) || 'Untitled'}</h1>
            ${content}
        </body>
        </html>
    `);
    previewWindow.document.close();
}

// ==================== MODAL HANDLERS ====================
function setupModals() {
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => {
            const modalId = btn.getAttribute('data-modal');
            document.getElementById(modalId).style.display = 'none';
        };
    });
    
    const createFolderBtn = document.getElementById('createFolderBtn');
    const cancelFolderBtn = document.getElementById('cancelFolderBtn');
    const confirmRenameBtn = document.getElementById('confirmRenameBtn');
    const cancelRenameBtn = document.getElementById('cancelRenameBtn');
    
    if (createFolderBtn) createFolderBtn.onclick = () => createFolder();
    if (cancelFolderBtn) cancelFolderBtn.onclick = () => {
        document.getElementById('folderModal').style.display = 'none';
    };
    
    if (confirmRenameBtn) confirmRenameBtn.onclick = () => confirmRename();
    if (cancelRenameBtn) cancelRenameBtn.onclick = () => {
        document.getElementById('renameModal').style.display = 'none';
    };
    
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
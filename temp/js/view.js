// View page functionality - Menampilkan folder dan dokumen di beranda (hanya root)

function loadFoldersAndDocuments() {
    const foldersGrid = document.getElementById('foldersGrid');
    if (!foldersGrid) return;
    
    // Load file system dari localStorage
    const fileSystem = JSON.parse(localStorage.getItem('fileSystem') || '{"id":"root","name":"Root","type":"folder","children":[],"documents":[],"expanded":true}');
    
    if ((!fileSystem.children || fileSystem.children.length === 0) && (!fileSystem.documents || fileSystem.documents.length === 0)) {
        foldersGrid.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>Belum ada folder atau dokumen.</p></div>';
        return;
    }
    
    let html = '';
    
    // Tampilkan folder (hanya dari root)
    if (fileSystem.children && fileSystem.children.length > 0) {
        fileSystem.children.forEach(folder => {
            html += `
                <div class="folder-card" data-id="${folder.id}" data-type="folder">
                    <div class="folder-icon">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="folder-info">
                        <h3>${escapeHtml(folder.name)}</h3>
                        <p>${countItemsInFolder(folder)} item</p>
                    </div>
                </div>
            `;
        });
    }
    
    // Tampilkan dokumen di root
    if (fileSystem.documents && fileSystem.documents.length > 0) {
        fileSystem.documents.forEach(doc => {
            html += `
                <div class="doc-card-home" data-id="${doc.id}" data-type="document">
                    <div class="doc-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="doc-info">
                        <h3>${escapeHtml(doc.title) || 'Untitled'}</h3>
                        <p>Diperbarui: ${formatDate(doc.updatedAt)}</p>
                    </div>
                </div>
            `;
        });
    }
    
    foldersGrid.innerHTML = html;
    
    // Add click handlers untuk melihat dokumen
    document.querySelectorAll('.folder-card, .doc-card-home').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            const id = card.dataset.id;
            if (type === 'document') {
                // User biasa hanya bisa melihat, tidak bisa edit
                window.location.href = `view.html?id=${id}`;
            } else {
                // Untuk folder, bisa dilihat isinya
                window.location.href = `view-folder.html?id=${id}`;
            }
        });
    });
}

function countItemsInFolder(folder) {
    let count = (folder.documents ? folder.documents.length : 0);
    if (folder.children) {
        folder.children.forEach(child => {
            count += countItemsInFolder(child);
        });
    }
    return count;
}

function formatDate(dateString) {
    if (!dateString) return 'Baru saja';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hari ini';
    if (days === 1) return 'Kemarin';
    if (days < 7) return `${days} hari lalu`;
    return date.toLocaleDateString('id-ID');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load single document for view (user biasa hanya bisa melihat)
function loadSingleDocument() {
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');
    
    if (!docId) {
        document.getElementById('viewTitle').textContent = 'Dokumen tidak ditemukan';
        document.getElementById('viewContent').innerHTML = '<p>Dokumen tidak ditemukan.</p>';
        return;
    }
    
    // Load dari fileSystem
    const fileSystem = JSON.parse(localStorage.getItem('fileSystem') || '{"id":"root","name":"Root","type":"folder","children":[],"documents":[]}');
    let foundDoc = null;
    
    function findDocument(folder, id) {
        if (folder.documents) {
            const doc = folder.documents.find(d => d.id === id);
            if (doc) return doc;
        }
        if (folder.children) {
            for (let child of folder.children) {
                const found = findDocument(child, id);
                if (found) return found;
            }
        }
        return null;
    }
    
    foundDoc = findDocument(fileSystem, docId);
    
    if (foundDoc) {
        document.getElementById('viewTitle').textContent = foundDoc.title || 'Untitled';
        document.getElementById('viewContent').innerHTML = foundDoc.content || '<p>Konten kosong.</p>';
        
        // Tombol edit hanya muncul jika admin sudah login
        if (Auth.isAdmin()) {
            const adminActions = document.getElementById('viewAdminActions');
            if (adminActions) {
                adminActions.style.display = 'block';
                const editBtn = document.getElementById('editDocBtn');
                if (editBtn) {
                    editBtn.onclick = () => {
                        window.location.href = `admin.html?id=${docId}`;
                    };
                }
            }
        }
    } else {
        document.getElementById('viewTitle').textContent = 'Dokumen tidak ditemukan';
        document.getElementById('viewContent').innerHTML = '<p>Dokumen yang Anda cari tidak ada.</p>';
    }
}


// Load folder view
function loadFolderView() {
    const urlParams = new URLSearchParams(window.location.search);
    const folderId = urlParams.get('id');
    
    if (!folderId) {
        window.location.href = 'index.html';
        return;
    }
    
    const fileSystem = JSON.parse(localStorage.getItem('fileSystem') || '{"id":"root","name":"Root","type":"folder","children":[],"documents":[]}');
    let folder = null;
    
    function findFolder(f, id) {
        if (f.id === id) return f;
        if (f.children) {
            for (let child of f.children) {
                const found = findFolder(child, id);
                if (found) return found;
            }
        }
        return null;
    }
    
    folder = findFolder(fileSystem, folderId);
    
    if (folder) {
        document.getElementById('folderTitle').textContent = folder.name;
        
        let html = '';
        
        // Tampilkan sub folder
        if (folder.children && folder.children.length > 0) {
            folder.children.forEach(subFolder => {
                html += `
                    <div class="folder-card" data-id="${subFolder.id}" data-type="folder">
                        <div class="folder-icon"><i class="fas fa-folder"></i></div>
                        <div class="folder-info">
                            <h3>${escapeHtml(subFolder.name)}</h3>
                            <p>${countItemsInFolder(subFolder)} item</p>
                        </div>
                    </div>
                `;
            });
        }
        
        // Tampilkan dokumen dalam folder
        if (folder.documents && folder.documents.length > 0) {
            folder.documents.forEach(doc => {
                html += `
                    <div class="doc-card-home" data-id="${doc.id}" data-type="document">
                        <div class="doc-icon"><i class="fas fa-file-alt"></i></div>
                        <div class="doc-info">
                            <h3>${escapeHtml(doc.title) || 'Untitled'}</h3>
                            <p>Diperbarui: ${formatDate(doc.updatedAt)}</p>
                        </div>
                    </div>
                `;
            });
        }
        
        if (html === '') {
            html = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>Folder ini kosong</p></div>';
        }
        
        document.getElementById('folderContent').innerHTML = html;
        
        // Add click handlers
        document.querySelectorAll('.folder-card, .doc-card-home').forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type;
                const id = card.dataset.id;
                if (type === 'document') {
                    window.location.href = `view.html?id=${id}`;
                } else {
                    window.location.href = `view-folder.html?id=${id}`;
                }
            });
        });
    } else {
        document.getElementById('folderTitle').textContent = 'Folder tidak ditemukan';
        document.getElementById('folderContent').innerHTML = '<p>Folder yang Anda cari tidak ada.</p>';
    }
}

// Initialize based on page
if (window.location.pathname.includes('view.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        updateAuthUI();
        loadSingleDocument();
    });
} else if (window.location.pathname.includes('view-folder.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        updateAuthUI();
        loadFolderView();
    });
} else if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
    document.addEventListener('DOMContentLoaded', () => {
        updateAuthUI();
        loadFoldersAndDocuments();
    });
}

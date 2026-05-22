import type { FileSystemNode } from '@mintplayer/ng-bootstrap/file-manager';
export function makeMockFileSystem(): FileSystemNode[] {
  return [
    // Top-level folders
    { id: 'docs', parentId: null, name: 'Documents', type: 'folder', iconKey: 'folder', modifiedAt: '2026-05-04' },
    { id: 'pics', parentId: null, name: 'Pictures', type: 'folder', iconKey: 'folder-image', modifiedAt: '2026-05-08' },
    { id: 'music', parentId: null, name: 'Music', type: 'folder', iconKey: 'folder-music', modifiedAt: '2026-04-22' },
    { id: 'projects', parentId: null, name: 'Projects', type: 'folder', iconKey: 'folder-code', modifiedAt: '2026-05-14' },

    // Documents children
    { id: 'docs-reports', parentId: 'docs', name: 'Reports', type: 'folder', iconKey: 'folder', modifiedAt: '2026-05-01' },
    { id: 'docs-invoices', parentId: 'docs', name: 'Invoices', type: 'folder', iconKey: 'folder', modifiedAt: '2026-04-28' },
    { id: 'docs-resume', parentId: 'docs', name: 'resume.pdf', type: 'file', size: 234567, mimeType: 'PDF', iconKey: 'file-pdf', modifiedAt: '2026-05-04' },
    { id: 'docs-notes', parentId: 'docs', name: 'notes.txt', type: 'file', size: 1872, mimeType: 'Text', iconKey: 'file-text', modifiedAt: '2026-05-04' },

    // Reports children
    { id: 'reports-q1', parentId: 'docs-reports', name: 'Q1-summary.docx', type: 'file', size: 89234, mimeType: 'Word', iconKey: 'file-word', modifiedAt: '2026-04-15' },
    { id: 'reports-q2', parentId: 'docs-reports', name: 'Q2-summary.docx', type: 'file', size: 92112, mimeType: 'Word', iconKey: 'file-word', modifiedAt: '2026-04-30' },
    { id: 'reports-chart', parentId: 'docs-reports', name: 'metrics.xlsx', type: 'file', size: 41280, mimeType: 'Excel', iconKey: 'file-excel', modifiedAt: '2026-05-01' },

    // Invoices children
    { id: 'inv-1', parentId: 'docs-invoices', name: '2026-001.pdf', type: 'file', size: 124800, mimeType: 'PDF', iconKey: 'file-pdf', modifiedAt: '2026-04-12' },
    { id: 'inv-2', parentId: 'docs-invoices', name: '2026-002.pdf', type: 'file', size: 118300, mimeType: 'PDF', iconKey: 'file-pdf', modifiedAt: '2026-04-25' },

    // Pictures children
    { id: 'pics-2025', parentId: 'pics', name: '2025', type: 'folder', iconKey: 'folder', modifiedAt: '2025-12-31' },
    { id: 'pics-2026', parentId: 'pics', name: '2026', type: 'folder', iconKey: 'folder', modifiedAt: '2026-05-08' },
    { id: 'pic-1', parentId: 'pics', name: 'hero-banner.jpg', type: 'file', size: 2_456_310, mimeType: 'JPEG', iconKey: 'file-image', modifiedAt: '2026-05-08' },
    { id: 'pic-2', parentId: 'pics', name: 'avatar.png', type: 'file', size: 124_000, mimeType: 'PNG', iconKey: 'file-image', modifiedAt: '2026-05-02' },
    { id: 'pic-3', parentId: 'pics', name: 'thumbnail.webp', type: 'file', size: 56_700, mimeType: 'WebP', iconKey: 'file-image', modifiedAt: '2026-05-03' },

    // Pictures/2025
    { id: 'pic-25-1', parentId: 'pics-2025', name: 'winter.jpg', type: 'file', size: 1_870_000, mimeType: 'JPEG', iconKey: 'file-image', modifiedAt: '2025-12-21' },
    { id: 'pic-25-2', parentId: 'pics-2025', name: 'summer.jpg', type: 'file', size: 2_010_000, mimeType: 'JPEG', iconKey: 'file-image', modifiedAt: '2025-07-15' },

    // Pictures/2026
    { id: 'pic-26-1', parentId: 'pics-2026', name: 'spring-flowers.jpg', type: 'file', size: 1_440_300, mimeType: 'JPEG', iconKey: 'file-image', modifiedAt: '2026-04-12' },
    { id: 'pic-26-2', parentId: 'pics-2026', name: 'sunset.jpg', type: 'file', size: 1_725_100, mimeType: 'JPEG', iconKey: 'file-image', modifiedAt: '2026-05-07' },

    // Music children
    { id: 'music-album', parentId: 'music', name: 'Daft Punk - Discovery', type: 'folder', iconKey: 'folder-music', modifiedAt: '2026-01-12' },
    { id: 'music-playlist', parentId: 'music', name: 'playlist.m3u', type: 'file', size: 8190, mimeType: 'Playlist', iconKey: 'file', modifiedAt: '2026-04-22' },

    { id: 'm-1', parentId: 'music-album', name: '01-One-More-Time.mp3', type: 'file', size: 5_120_000, mimeType: 'MP3', iconKey: 'file-music', modifiedAt: '2026-01-12' },
    { id: 'm-2', parentId: 'music-album', name: '02-Aerodynamic.mp3', type: 'file', size: 4_820_000, mimeType: 'MP3', iconKey: 'file-music', modifiedAt: '2026-01-12' },
    { id: 'm-3', parentId: 'music-album', name: '03-Digital-Love.mp3', type: 'file', size: 5_530_000, mimeType: 'MP3', iconKey: 'file-music', modifiedAt: '2026-01-12' },

    // Projects children
    { id: 'proj-fm', parentId: 'projects', name: 'file-manager', type: 'folder', iconKey: 'folder-code', modifiedAt: '2026-05-14' },
    { id: 'proj-fm-readme', parentId: 'proj-fm', name: 'README.md', type: 'file', size: 4382, mimeType: 'Markdown', iconKey: 'file-text', modifiedAt: '2026-05-14' },
    { id: 'proj-fm-archive', parentId: 'proj-fm', name: 'sources.zip', type: 'file', size: 4_050_300, mimeType: 'ZIP', iconKey: 'file-zip', modifiedAt: '2026-05-13' },
    { id: 'proj-todo', parentId: 'projects', name: 'todo.md', type: 'file', size: 612, mimeType: 'Markdown', iconKey: 'file-text', modifiedAt: '2026-05-10' },
  ];
}

import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Upload, Menu, X, BookOpen, Download, FileUp, Save, Database, Trash2 } from 'lucide-react';
import mammoth from 'mammoth';

// IndexedDB Helper
const DB_NAME = 'DocTruyenDB';
const DB_VERSION = 1;
const STORE_NAME = 'chapters';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveToIndexedDB = async (key, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id: key, data: value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getFromIndexedDB = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.data);
    request.onerror = () => reject(request.error);
  });
};

const clearIndexedDB = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export default function OfflineReaderApp() {
  const [darkMode, setDarkMode] = useState(true);
  const [chapters, setChapters] = useState([
    {
      id: 1,
      title: 'Chương mẫu',
      content: '<p>Chào mừng đến với ứng dụng đọc truyện! 📚</p><p>Dùng mũi tên trái/phải để chuyển chương.</p>'
    }
  ]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [dragOver, setDragOver] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [jumpPage, setJumpPage] = useState('');
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    loadFromIndexedDB();
  }, []);

  const loadFromIndexedDB = async () => {
    try {
      const data = await getFromIndexedDB('appData');
      if (data) {
        setDarkMode(data.darkMode !== undefined ? data.darkMode : true);
        if (data.chapters && data.chapters.length > 0) {
          setChapters(data.chapters);
        }
        setCurrentChapter(data.currentChapter || 0);
        setFontSize(data.fontSize || 18);
        setLineHeight(data.lineHeight || 1.8);
      }
    } catch (error) {
      console.error('Lỗi load:', error);
    }
  };

  const saveToStorage = async () => {
    try {
      await saveToIndexedDB('appData', { darkMode, chapters, currentChapter, fontSize, lineHeight });
    } catch (error) {
      console.error('Lỗi lưu:', error);
    }
  };

  useEffect(() => {
    if (mounted && chapters.length > 0) {
      const timer = setTimeout(() => saveToStorage(), 500);
      return () => clearTimeout(timer);
    }
  }, [darkMode, chapters, currentChapter, fontSize, lineHeight, mounted]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setShowHeader(true);
    setLastScrollY(0);
  }, [currentChapter]);

  // Tự động ẩn/hiện header khi scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 50) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY) {
        // Scroll xuống - ẩn header
        setShowHeader(false);
      } else {
        // Scroll lên - hiện header
        setShowHeader(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showMenu || showJumpModal) return;
      
      if (e.key === 'ArrowLeft' && currentChapter > 0) {
        e.preventDefault();
        changeChapter(currentChapter - 1);
      } else if (e.key === 'ArrowRight' && currentChapter < chapters.length - 1) {
        e.preventDefault();
        changeChapter(currentChapter + 1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapter, chapters.length, showMenu, showJumpModal]);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2500);
  };

  const changeChapter = (newIndex) => {
    if (newIndex < 0) {
      showToast('⚠️ Đây là chương đầu');
      return;
    }
    if (newIndex >= chapters.length) {
      showToast('⚠️ Hết chương rồi');
      return;
    }
    setCurrentChapter(newIndex);
    window.scrollTo(0, 0);
  };

  const processFiles = async (files) => {
    setLoading(true);
    let successCount = 0;
    const newChapters = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        setProgress(Math.round(((i + 1) / files.length) * 100));
        const arrayBuffer = await files[i].arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        let html = result.value.replace(/<img[^>]*>/g, '').replace(/<p>\s*<\/p>/g, '');
        
        // Chuyển các bảng thành khung thông tin đẹp
        html = html.replace(/<table[^>]*>(.*?)<\/table>/gs, (match, content) => {
          // Loại bỏ các thẻ table, tbody, tr, td và giữ lại nội dung
          let cleanContent = content
            .replace(/<\/?tbody[^>]*>/g, '')
            .replace(/<tr[^>]*>/g, '')
            .replace(/<\/tr>/g, '')
            .replace(/<td[^>]*>/g, '<p>')
            .replace(/<\/td>/g, '</p>');
          return `<div class="info-box">${cleanContent}</div>`;
        });
        
        // Nhận diện và format thông tin nhân vật dạng "Tên : Grid"
        html = html.replace(/^(Tên|Cấp độ|Lớp nghề|Danh hiệu|Khéo tay)\s*:\s*(.+)$/gm, 
          '<div class="char-stat"><span class="char-label">$1</span><span class="char-sep">:</span><span class="char-value">$2</span></div>');
        
        html = html.replace(/\[([^\]]+)\]/g, '<span class="item-name">[$1]</span>');
        html = html.replace(/Xếp hạng\s*:\s*([^\n<]+)/gi, '<div class="stat-row"><span class="stat-label">Xếp hạng:</span><span class="stat-value">$1</span></div>');
        html = html.replace(/Độ bền\s*:\s*([^\n<]+)/gi, '<div class="stat-row"><span class="stat-label">Độ bền:</span><span class="stat-value">$1</span></div>');
        html = html.replace(/Sức Tấn công\s*:\s*([^\n<]+)/gi, '<div class="stat-row"><span class="stat-label">Tấn công:</span><span class="stat-value">$1</span></div>');
        html = html.replace(/Tốc độ tấn công\s*:\s*([^\n<]+)/gi, '<div class="stat-row"><span class="stat-label">Tốc độ:</span><span class="stat-value">$1</span></div>');
        
        newChapters.push({
          id: Date.now() + Math.random(),
          title: files[i].name.replace(/\.(docx|doc)$/, ''),
          content: html
        });
        successCount++;
      } catch (error) {
        console.error('Lỗi:', error);
      }
    }
    
    setChapters(prev => [...prev, ...newChapters]);
    setLoading(false);
    setProgress(0);
    showToast(`✅ Thêm ${successCount} chương`);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.docx') || f.name.endsWith('.doc'));
    if (files.length === 0) return showToast('⚠️ Chỉ nhận file .docx');
    if (chapters.length + files.length > 3000) return showToast('⚠️ Vượt 3000 chương!');
    await processFiles(files);
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files).filter(f => f.name.endsWith('.docx') || f.name.endsWith('.doc'));
    if (files.length === 0) return showToast('⚠️ Chỉ nhận file .docx');
    if (chapters.length + files.length > 3000) return showToast('⚠️ Vượt 3000 chương!');
    await processFiles(files);
    event.target.value = '';
  };

  const deleteChapter = (chapterId) => {
    if (chapters.length <= 1) return showToast('⚠️ Không xóa được chương cuối');
    const newChapters = chapters.filter(ch => ch.id !== chapterId);
    setChapters(newChapters);
    if (currentChapter >= newChapters.length) setCurrentChapter(newChapters.length - 1);
    showToast('🗑️ Đã xóa');
  };

  const filteredChapters = chapters.filter(ch => 
    ch.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportData = () => {
    try {
      const blob = new Blob([JSON.stringify({ darkMode, chapters, currentChapter, fontSize, lineHeight }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✅ Đã xuất!');
    } catch (error) {
      showToast('❌ Lỗi xuất');
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        const data = JSON.parse(e.target.result);
        if (!data.chapters || !Array.isArray(data.chapters)) return showToast('❌ File không hợp lệ');
        setDarkMode(data.darkMode !== undefined ? data.darkMode : true);
        setChapters(data.chapters);
        setCurrentChapter(data.currentChapter || 0);
        setFontSize(data.fontSize || 18);
        setLineHeight(data.lineHeight || 1.8);
        await saveToIndexedDB('appData', data);
        showToast(`✅ Nhập ${data.chapters.length} chương!`);
      } catch (error) {
        showToast('❌ File lỗi');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {loading && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-xs w-full mx-4 text-center`}>
            <div className="text-3xl mb-3">📚</div>
            <p className="font-bold mb-3">{progress > 0 ? `${progress}%` : 'Đang tải...'}</p>
            {progress > 0 && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{width: `${progress}%`}}></div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} fixed top-0 left-0 right-0 z-20 shadow-sm`}>
        <div className="max-w-5xl mx-auto px-3 py-3 flex items-center justify-between">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            {showMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold truncate px-2">
              {chapters[currentChapter]?.title}
            </h1>
            <p className="text-xs opacity-60">
              {currentChapter + 1} / {chapters.length}
            </p>
          </div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setShowMenu(false)}></div>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} fixed top-0 left-0 bottom-0 w-80 z-40 overflow-y-auto`}>
            <div className="p-4 space-y-4">
              {/* Đọc tiếp */}
              <div 
                onClick={() => {
                  setShowMenu(false);
                }}
                className={`p-4 rounded-lg ${darkMode ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gradient-to-r from-blue-500 to-purple-500'} cursor-pointer hover:opacity-90 transition-all`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen size={18} className="text-white" />
                  <span className="text-white font-bold text-sm">Đọc tiếp</span>
                </div>
                <div className="text-white font-medium truncate">{chapters[currentChapter]?.title}</div>
                <div className="text-white/80 text-xs mt-1">
                  Chương {currentChapter + 1} / {chapters.length}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="🔍 Tìm chương..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-0 outline-none`}
                />
                <div className="text-xs mt-2 opacity-60">
                  {chapters.length} / 3000 chương
                </div>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      chapters.findIndex(c => c.id === ch.id) === currentChapter
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div 
                      onClick={() => {
                        changeChapter(chapters.findIndex(c => c.id === ch.id));
                        setShowMenu(false);
                      }}
                      className="flex-1 text-sm cursor-pointer truncate"
                    >
                      {ch.title}
                    </div>
                    <button
                      onClick={() => deleteChapter(ch.id)}
                      className="p-1 hover:bg-red-500/30 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Cỡ chữ: {fontSize}px</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize(18)}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    Mặc định
                  </button>
                  <button
                    onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    A+
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Giãn dòng: {lineHeight.toFixed(1)}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLineHeight(Math.max(1.2, lineHeight - 0.2))}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    Giảm
                  </button>
                  <button
                    onClick={() => setLineHeight(1.8)}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    Mặc định
                  </button>
                  <button
                    onClick={() => setLineHeight(Math.min(2.5, lineHeight + 0.2))}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    Tăng
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowJumpModal(true);
                  setShowMenu(false);
                }}
                className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center justify-center gap-2"
              >
                <BookOpen size={18} />
                Nhảy tới chương
              </button>

              <label className="block">
                <input
                  type="file"
                  accept=".docx,.doc"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium cursor-pointer flex items-center justify-center gap-2">
                  <Upload size={18} />
                  Thêm chương
                </div>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={exportData}
                  className="py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center justify-center gap-1"
                >
                  <Download size={16} />
                  Xuất
                </button>
                <label>
                  <input type="file" accept=".json" onChange={importData} className="hidden" />
                  <div className="py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm cursor-pointer flex items-center justify-center gap-1">
                    <FileUp size={16} />
                    Nhập
                  </div>
                </label>
                <button
                  onClick={async () => {
                    await saveToStorage();
                    showToast('✅ Đã lưu!');
                  }}
                  className="py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm flex items-center justify-center gap-1"
                >
                  <Save size={16} />
                  Lưu
                </button>
                <button
                  onClick={async () => {
                    const data = await getFromIndexedDB('appData');
                    showToast(data ? `📦 ${data.chapters.length} chương` : '⚠️ Trống');
                  }}
                  className="py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm flex items-center justify-center gap-1"
                >
                  <Database size={16} />
                  Kiểm tra
                </button>
              </div>

              {chapters.length > 10 && (
                <button
                  onClick={async () => {
                    if (window.confirm('Xóa tất cả?')) {
                      await clearIndexedDB();
                      setChapters([{ id: 1, title: 'Chương mẫu', content: '<p>Đã xóa!</p>' }]);
                      setCurrentChapter(0);
                      showToast('🗑️ Đã xóa');
                    }
                  }}
                  className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm"
                >
                  🗑️ Xóa tất cả
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div
        ref={contentRef}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        className="max-w-4xl mx-auto px-4 pt-20 pb-8 min-h-screen"
      >
        {dragOver && (
          <div className="fixed inset-4 border-4 border-dashed border-blue-500 rounded-xl bg-blue-500/10 flex items-center justify-center z-30">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-6 py-4 rounded-xl`}>
              <Upload size={40} className="mx-auto mb-2 text-blue-500" />
              <p className="font-bold">Thả file vào đây!</p>
            </div>
          </div>
        )}

        <style>{`
          .info-box {
            border: 2px solid ${darkMode ? '#3b82f6' : '#2563eb'};
            background: ${darkMode ? '#1e3a5f' : '#eff6ff'};
            border-radius: 8px;
            padding: 12px 16px;
            margin: 16px 0;
          }
          .info-box p {
            margin: 8px 0;
          }
          .info-box p:first-child {
            margin-top: 0;
          }
          .info-box p:last-child {
            margin-bottom: 0;
          }
          .info-box strong {
            color: ${darkMode ? '#60a5fa' : '#1e40af'};
          }
          .char-stat {
            display: grid;
            grid-template-columns: 120px 20px 1fr;
            padding: 10px 16px;
            border: 1px solid ${darkMode ? '#3b82f6' : '#2563eb'};
            background: ${darkMode ? '#1e293b' : '#f1f5f9'};
            margin: 0;
            align-items: center;
            font-size: 1em;
          }
          .char-stat:first-of-type {
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
          }
          .char-stat:last-of-type {
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
          }
          .char-stat + .char-stat {
            border-top: none;
          }
          .char-label {
            font-weight: 700;
            color: ${darkMode ? '#60a5fa' : '#1e40af'};
            text-align: left;
          }
          .char-sep {
            color: ${darkMode ? '#64748b' : '#94a3b8'};
            text-align: center;
            font-weight: 600;
          }
          .char-value {
            color: ${darkMode ? '#e2e8f0' : '#1e293b'};
            font-weight: 500;
            text-align: left;
          }
          .item-name {
            display: inline-block;
            background: ${darkMode ? '#1e40af' : '#3b82f6'};
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.95em;
            margin: 4px 0;
          }
          .stat-row {
            display: flex;
            padding: 6px 12px;
            border-bottom: 1px solid ${darkMode ? '#374151' : '#e5e7eb'};
            background: ${darkMode ? '#1f2937' : '#f9fafb'};
            margin: 2px 0;
          }
          .stat-label {
            font-weight: 600;
            min-width: 100px;
            color: ${darkMode ? '#9ca3af' : '#6b7280'};
          }
          .stat-value {
            flex: 1;
            color: ${darkMode ? '#e5e7eb' : '#374151'};
          }
        `}</style>

        <div
          className="prose prose-lg max-w-none"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeight}`,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}
          dangerouslySetInnerHTML={{ __html: chapters[currentChapter]?.content }}
        />
        
        <div className="flex justify-between items-center mt-12 pt-6 border-t" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
          {currentChapter > 0 ? (
            <button
              onClick={() => changeChapter(currentChapter - 1)}
              className={`px-6 py-3 rounded-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} shadow-md flex items-center gap-2 transition-all`}
            >
              <span className="font-bold text-xl">&lt;</span>
              <span className="text-base">Chương trước</span>
            </button>
          ) : <div></div>}
          
          {currentChapter < chapters.length - 1 ? (
            <button
              onClick={() => changeChapter(currentChapter + 1)}
              className={`px-6 py-3 rounded-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} shadow-md flex items-center gap-2 transition-all`}
            >
              <span className="text-base">Chương sau</span>
              <span className="font-bold text-xl">&gt;</span>
            </button>
          ) : <div></div>}
        </div>
      </div>

      {showJumpModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowJumpModal(false)}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-sm w-full`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Nhảy tới chương</h3>
            <input
              type="number"
              min="1"
              max={chapters.length}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              placeholder={`1-${chapters.length}`}
              className={`w-full px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} mb-3`}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const num = parseInt(jumpPage);
                  if (num >= 1 && num <= chapters.length) {
                    changeChapter(num - 1);
                    setShowJumpModal(false);
                    setJumpPage('');
                  }
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const num = parseInt(jumpPage);
                  if (num >= 1 && num <= chapters.length) {
                    changeChapter(num - 1);
                    setShowJumpModal(false);
                    setJumpPage('');
                  }
                }}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Đi tới
              </button>
              <button
                onClick={() => {
                  setShowJumpModal(false);
                  setJumpPage('');
                }}
                className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} font-medium`}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-4 py-2 rounded-lg shadow-lg`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
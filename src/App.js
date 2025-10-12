import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, ChevronLeft, ChevronRight, Upload, Menu, X, BookOpen, Download, FileUp, Save, Database, Trash2 } from 'lucide-react';
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
  const [verticalMode, setVerticalMode] = useState(true);
  const [chapters, setChapters] = useState([
    {
      id: 1,
      title: 'Chương mẫu',
      content: '<p>Chào mừng đến với ứng dụng đọc truyện! 📚</p><p>Nhấn nút Menu để xem các tùy chọn.</p>'
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
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
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
        setVerticalMode(data.verticalMode !== undefined ? data.verticalMode : true);
        if (data.chapters && data.chapters.length > 0) {
          setChapters(data.chapters);
        }
        setCurrentChapter(data.currentChapter || 0);
        setFontSize(data.fontSize || 18);
      }
    } catch (error) {
      console.error('Lỗi load:', error);
    }
  };

  const saveToStorage = async () => {
    try {
      await saveToIndexedDB('appData', { darkMode, verticalMode, chapters, currentChapter, fontSize });
    } catch (error) {
      console.error('Lỗi lưu:', error);
    }
  };

  useEffect(() => {
    if (mounted && chapters.length > 0) {
      const timer = setTimeout(() => saveToStorage(), 500);
      return () => clearTimeout(timer);
    }
  }, [darkMode, verticalMode, chapters, currentChapter, fontSize, mounted]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentChapter]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && currentChapter > 0) {
        changeChapter(currentChapter - 1);
      } else if (e.key === 'ArrowRight' && currentChapter < chapters.length - 1) {
        changeChapter(currentChapter + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapter, chapters.length]);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2500);
  };

  const changeChapter = (newIndex) => {
    if (newIndex < 0 || newIndex >= chapters.length) return;
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
      const blob = new Blob([JSON.stringify({ darkMode, chapters, currentChapter, fontSize }, null, 2)], { type: 'application/json' });
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
        await saveToIndexedDB('appData', { darkMode: data.darkMode, chapters: data.chapters, currentChapter: data.currentChapter || 0, fontSize: data.fontSize || 18, verticalMode: data.verticalMode !== undefined ? data.verticalMode : true });
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
                <div className="bg-blue-500 h-2 rounded-full" style={{width: `${progress}%`}}></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} sticky top-0 z-20 shadow-sm`}>
        <div className="max-w-5xl mx-auto px-3 py-3 flex items-center justify-between">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            {showMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <h1 className="text-lg font-bold flex items-center gap-2">
            📚 {chapters[currentChapter]?.title.substring(0, 20)}
            {chapters[currentChapter]?.title.length > 20 && '...'}
          </h1>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Menu Sidebar */}
      {showMenu && (
        <>
          <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setShowMenu(false)}></div>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} fixed top-0 left-0 bottom-0 w-80 z-40 overflow-y-auto`}>
            <div className="p-4 space-y-4">
              {/* Search */}
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

              {/* Chapter List */}
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

              {/* Font Size */}
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

              {/* Reading Mode */}
              <div>
                <label className="text-sm font-medium block mb-2">Chế độ đọc</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVerticalMode(false)}
                    className={`flex-1 py-2 rounded-lg ${!verticalMode ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    ➡️ Ngang
                  </button>
                  <button
                    onClick={() => setVerticalMode(true)}
                    className={`flex-1 py-2 rounded-lg ${verticalMode ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    ⬇️ Dọc
                  </button>
                </div>
              </div>

              {/* Jump to Chapter */}
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

              {/* Upload */}
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

              {/* Actions */}
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

      {/* Content */}
      {verticalMode ? (
        // Chế độ dọc - tất cả chương liên tục
        <div
          ref={contentRef}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          className="max-w-4xl mx-auto px-4 py-6 pb-24"
        >
          {dragOver && (
            <div className="fixed inset-4 border-4 border-dashed border-blue-500 rounded-xl bg-blue-500/10 flex items-center justify-center z-30">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-6 py-4 rounded-xl`}>
                <Upload size={40} className="mx-auto mb-2 text-blue-500" />
                <p className="font-bold">Thả file vào đây!</p>
              </div>
            </div>
          )}

          {chapters.map((chapter, index) => (
            <div key={chapter.id} className="mb-12">
              <h2 className={`text-2xl font-bold mb-4 pb-2 border-b-2 ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                {chapter.title}
              </h2>
              <div
                className="prose prose-lg max-w-none"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: '1.8',
                  color: darkMode ? '#e5e7eb' : '#374151'
                }}
                dangerouslySetInnerHTML={{ __html: chapter.content }}
              />
              {index < chapters.length - 1 && (
                <div className={`mt-8 pt-4 border-t-2 ${darkMode ? 'border-gray-700' : 'border-gray-300'} text-center text-sm opacity-60`}>
                  • • •
                </div>
              )}
            </div>
          ))}

          {chapters.length <= 3 && (
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} rounded-xl p-8 border-2 border-dashed text-center mt-8`}>
              <Upload size={40} className="mx-auto mb-3 opacity-50" />
              <p className="font-semibold mb-2">Kéo thả file .docx vào đây</p>
              <p className="text-sm opacity-60">hoặc nhấn nút Menu → Thêm chương</p>
            </div>
          )}
        </div>
      ) : (
        // Chế độ ngang - từng chương riêng
        <div
          ref={contentRef}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          className="max-w-4xl mx-auto px-4 py-6 pb-24"
        >
          {dragOver && (
            <div className="fixed inset-4 border-4 border-dashed border-blue-500 rounded-xl bg-blue-500/10 flex items-center justify-center z-30">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-6 py-4 rounded-xl`}>
                <Upload size={40} className="mx-auto mb-2 text-blue-500" />
                <p className="font-bold">Thả file vào đây!</p>
              </div>
            </div>
          )}

          <div
            className="prose prose-lg max-w-none"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '1.8',
              color: darkMode ? '#e5e7eb' : '#374151'
            }}
            dangerouslySetInnerHTML={{ __html: chapters[currentChapter]?.content }}
          />

          {chapters.length <= 3 && (
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} rounded-xl p-8 border-2 border-dashed text-center mt-8`}>
              <Upload size={40} className="mx-auto mb-3 opacity-50" />
              <p className="font-semibold mb-2">Kéo thả file .docx vào đây</p>
              <p className="text-sm opacity-60">hoặc nhấn nút Menu → Thêm chương</p>
            </div>
          )}
        </div>
      )}

      {/* Jump Modal */}
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

      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl">
            {toast.message}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      {!verticalMode && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} fixed bottom-0 left-0 right-0 z-20 shadow-lg`}>
          <div className="max-w-5xl mx-auto px-3 py-3 flex items-center justify-between">
            <button
              onClick={() => changeChapter(currentChapter - 1)}
              disabled={currentChapter === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                currentChapter === 0 ? 'opacity-30' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <ChevronLeft size={18} />
              Trước
            </button>
            
            <div className="text-sm font-medium">
              {currentChapter + 1} / {chapters.length}
            </div>
            
            <button
              onClick={() => changeChapter(currentChapter + 1)}
              disabled={currentChapter >= chapters.length - 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                currentChapter >= chapters.length - 1 ? 'opacity-30' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Sau
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
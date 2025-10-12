import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, ChevronLeft, ChevronRight, Upload, Search, Trash2, BookOpen, Menu, X } from 'lucide-react';
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
      content: '<p>Chào mừng bạn đến với ứng dụng đọc truyện offline! 📚</p><p>Kéo thả file .docx vào đây để bắt đầu.</p>'
    }
  ]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [dragOver, setDragOver] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [jumpPage, setJumpPage] = useState('');
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
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
        if (data.chapters && data.chapters.length > 0) {
          setChapters(data.chapters);
        }
        setCurrentChapter(data.currentChapter || 0);
        setFontSize(data.fontSize || 18);
      }
    } catch (error) {
      console.error('Lỗi khi load:', error);
    }
  };

  const saveToStorage = async () => {
    try {
      const dataToSave = { darkMode, chapters, currentChapter, fontSize };
      await saveToIndexedDB('appData', dataToSave);
    } catch (error) {
      console.error('Lỗi khi lưu:', error);
    }
  };

  useEffect(() => {
    if (mounted && chapters.length > 0) {
      const timer = setTimeout(() => saveToStorage(), 500);
      return () => clearTimeout(timer);
    }
  }, [darkMode, chapters, currentChapter, fontSize, mounted]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
      window.scrollTo(0, 0);
    }
  }, [currentChapter]);

  useEffect(() => {
    const handleKeyDown = (e) => {
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
  }, [currentChapter, chapters.length]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const changeChapter = (newIndex) => {
    if (newIndex < 0 || newIndex >= chapters.length) return;
    setCurrentChapter(newIndex);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.name.endsWith('.docx') || f.name.endsWith('.doc')
    );
    if (files.length === 0) {
      showToast('⚠️ Vui lòng kéo file .docx');
      return;
    }
    if (chapters.length + files.length > 3000) {
      showToast('⚠️ Vượt quá giới hạn 3000 chương!');
      return;
    }
    await processFiles(files);
  };

  const processFiles = async (files) => {
    setLoading(true);
    let successCount = 0;
    const newChapters = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        setProgress(Math.round(((i + 1) / files.length) * 100));
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        let html = result.value;
        html = html.replace(/<img[^>]*>/g, '');
        html = html.replace(/<p[^>]*>\s*\.\s*<\/p>/gi, '');
        html = html.replace(/<p>\s*<\/p>/g, '');
        const fileName = file.name.replace(/\.(docx|doc)$/, '');
        newChapters.push({
          id: Date.now() + Math.random(),
          title: fileName,
          content: html
        });
        successCount++;
      } catch (error) {
        console.error('Lỗi đọc file:', error);
      }
    }
    
    setChapters(prev => [...prev, ...newChapters]);
    setLoading(false);
    setProgress(0);
    if (successCount > 0) {
      showToast(`✅ Đã thêm ${successCount} chương`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const deleteChapter = (chapterId) => {
    if (chapters.length <= 1) {
      showToast('⚠️ Không thể xóa chương cuối cùng');
      return;
    }
    const newChapters = chapters.filter(ch => ch.id !== chapterId);
    setChapters(newChapters);
    if (currentChapter >= newChapters.length) {
      setCurrentChapter(newChapters.length - 1);
    }
    showToast('🗑️ Đã xóa chương');
  };

  const filteredChapters = chapters.filter(ch => 
    ch.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpPage);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > chapters.length) {
      showToast('⚠️ Số trang không hợp lệ');
      return;
    }
    setShowJumpModal(false);
    setJumpPage('');
    changeChapter(pageNum - 1);
  };

  const clearAllData = async () => {
    if (window.confirm('Bạn có chắc muốn xóa TẤT CẢ dữ liệu?')) {
      try {
        await clearIndexedDB();
        setChapters([{
          id: 1,
          title: 'Chương mẫu',
          content: '<p>Đã xóa toàn bộ dữ liệu.</p>'
        }]);
        setCurrentChapter(0);
        setFontSize(18);
        showToast('🗑️ Đã xóa toàn bộ dữ liệu');
      } catch (error) {
        showToast('❌ Lỗi khi xóa');
      }
    }
  };

  const forceSave = async () => {
    try {
      setLoading(true);
      await saveToStorage();
      showToast(`✅ Đã lưu ${chapters.length} chương!`);
    } catch (error) {
      showToast('❌ Lỗi khi lưu');
    } finally {
      setLoading(false);
    }
  };

  const checkStorage = async () => {
    try {
      const data = await getFromIndexedDB('appData');
      if (data && data.chapters) {
        showToast(`📦 Có ${data.chapters.length} chương`);
      } else {
        showToast('⚠️ Chưa có dữ liệu');
      }
    } catch (error) {
      showToast('❌ Lỗi kiểm tra');
    }
  };

  const exportData = () => {
    try {
      const dataToExport = {
        darkMode,
        chapters,
        currentChapter,
        fontSize,
        exportDate: new Date().toISOString()
      };
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ Đã xuất dữ liệu!');
    } catch (error) {
      showToast('❌ Lỗi xuất dữ liệu');
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        const importedData = JSON.parse(e.target.result);
        if (!importedData.chapters || !Array.isArray(importedData.chapters)) {
          showToast('❌ File không hợp lệ');
          return;
        }
        setDarkMode(importedData.darkMode !== undefined ? importedData.darkMode : true);
        setChapters(importedData.chapters);
        setCurrentChapter(importedData.currentChapter || 0);
        setFontSize(importedData.fontSize || 18);
        await saveToIndexedDB('appData', {
          darkMode: importedData.darkMode !== undefined ? importedData.darkMode : true,
          chapters: importedData.chapters,
          currentChapter: importedData.currentChapter || 0,
          fontSize: importedData.fontSize || 18
        });
        showToast(`✅ Đã nhập ${importedData.chapters.length} chương!`);
      } catch (error) {
        showToast('❌ File không hợp lệ');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files).filter(f => 
      f.name.endsWith('.docx') || f.name.endsWith('.doc')
    );
    if (files.length === 0) {
      showToast('⚠️ Vui lòng chọn file .docx');
      return;
    }
    if (chapters.length + files.length > 3000) {
      showToast('⚠️ Vượt quá giới hạn 3000 chương!');
      return;
    }
    await processFiles(files);
    event.target.value = '';
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-amber-50'}`}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        .prose p { margin-bottom: 1.5em; line-height: 1.8; }
        .prose h1, .prose h2, .prose h3 {
          color: ${darkMode ? '#f3f4f6' : '#1f2937'};
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          font-weight: 600;
        }
      `}</style>

      {loading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-sm w-full mx-4`}>
            <div className="text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {progress > 0 ? `Đang xử lý ${progress}%` : 'Đang tải...'}
              </p>
              {progress > 0 && (
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{width: `${progress}%`}}></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b fixed top-0 left-0 right-0 z-30 transition-transform ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              {showSidebar ? <X size={22} /> : <Menu size={22} />}
            </button>
            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              📚 Đọc Truyện
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="hidden sm:block">
              <input
                type="file"
                accept=".docx,.doc"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer font-medium">
                <Upload size={16} className="inline mr-1" />
                Upload
              </div>
            </label>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                A-
              </button>
              <span className="text-xs px-2">{fontSize}</span>
              <button
                onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                A+
              </button>
            </div>
            
            <button
              onClick={() => setShowJumpModal(true)}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              <BookOpen size={18} />
            </button>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-800 hover:bg-gray-900'} text-white`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </div>

      {showSidebar && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowSidebar(false)}
          ></div>
          
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} fixed top-0 left-0 bottom-0 w-80 sm:w-96 z-50 overflow-y-auto`}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Danh sách chương
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                >
                  <X size={20} />
                </button>
              </div>
              
              <input
                type="text"
                placeholder="🔍 Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border mb-3 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
              
              <div className="text-xs mb-3 opacity-60">
                {chapters.length} / 3000 chương
              </div>
              
              <div className="space-y-1 mb-4">
                {filteredChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      chapters.findIndex(c => c.id === ch.id) === currentChapter
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div 
                      onClick={() => {
                        changeChapter(chapters.findIndex(c => c.id === ch.id));
                        setShowSidebar(false);
                      }}
                      className="flex-1 text-sm cursor-pointer truncate"
                    >
                      {ch.title}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChapter(ch.id);
                      }}
                      className="p-1 hover:bg-red-500/20 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <label className="block">
                  <input
                    type="file"
                    accept=".docx,.doc"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-center cursor-pointer font-medium">
                    <Upload size={16} className="inline mr-1" />
                    Thêm chương
                  </div>
                </label>
                
                <button
                  onClick={exportData}
                  className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  📥 Xuất dữ liệu
                </button>
                
                <label className="block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                  />
                  <div className="w-full px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-center cursor-pointer font-medium">
                    📤 Nhập dữ liệu
                  </div>
                </label>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={forceSave}
                    className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium"
                  >
                    💾 Lưu
                  </button>
                  <button
                    onClick={checkStorage}
                    className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-medium"
                  >
                    📦 Kiểm tra
                  </button>
                </div>
                
                {chapters.length > 10 && (
                  <button
                    onClick={clearAllData}
                    className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                  >
                    🗑️ Xóa tất cả
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div
        ref={contentRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="max-w-4xl mx-auto px-4 pt-20 pb-24 min-h-screen"
      >
        {dragOver && (
          <div className="fixed inset-0 bg-blue-500/20 border-4 border-dashed border-blue-500 flex items-center justify-center z-40 m-4 rounded-2xl">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-6 py-4 rounded-2xl`}>
              <Upload size={48} className="mx-auto mb-2 text-blue-500" />
              <p className="text-xl font-bold">Thả file vào đây!</p>
            </div>
          </div>
        )}

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 sm:p-8 mb-6 shadow-lg`}>
          <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {chapters[currentChapter]?.title}
          </h2>
          
          <div
            className="prose max-w-none"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '1.8',
              color: darkMode ? '#e5e7eb' : '#374151'
            }}
            dangerouslySetInnerHTML={{ __html: chapters[currentChapter]?.content }}
          />
        </div>

        {chapters.length <= 3 && (
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} rounded-2xl p-8 border-2 border-dashed text-center`}>
            <Upload size={40} className="mx-auto mb-3 opacity-50" />
            <p className="font-semibold mb-2">Kéo thả file .docx vào đây</p>
            <p className="text-sm opacity-60">hoặc nhấn nút Upload</p>
          </div>
        )}
      </div>

      {showJumpModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowJumpModal(false)}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-md w-full`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              📖 Nhảy tới chương
            </h3>
            <input
              type="number"
              min="1"
              max={chapters.length}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              placeholder={`1 đến ${chapters.length}`}
              className={`w-full px-4 py-3 rounded-lg border-2 mb-4 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
              onKeyPress={(e) => e.key === 'Enter' && handleJumpToPage()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleJumpToPage}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
              >
                Đi tới
              </button>
              <button
                onClick={() => {
                  setShowJumpModal(false);
                  setJumpPage('');
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-900'} text-white px-6 py-3 rounded-xl shadow-lg`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t fixed bottom-0 left-0 right-0 z-30`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => changeChapter(currentChapter - 1)}
            disabled={currentChapter === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              currentChapter === 0
                ? 'opacity-30 cursor-not-allowed bg-gray-700'
                : darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <ChevronLeft size={20} />
            <span className="hidden sm:inline">Trước</span>
          </button>
          
          <div className={`text-center px-3 py-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {currentChapter + 1} / {chapters.length}
            </div>
          </div>
          
          <button
            onClick={() => changeChapter(currentChapter + 1)}
            disabled={currentChapter >= chapters.length - 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              currentChapter >= chapters.length - 1
                ? 'opacity-30 cursor-not-allowed bg-gray-700'
                : darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <span className="hidden sm:inline">Sau</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
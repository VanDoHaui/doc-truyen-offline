import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, ChevronLeft, ChevronRight, Upload, Search, Trash2, BookOpen } from 'lucide-react';
import mammoth from 'mammoth';

export default function OfflineReaderApp() {
  const [darkMode, setDarkMode] = useState(false);
  const [chapters, setChapters] = useState([
    {
      id: 1,
      title: 'Chương mẫu',
      content: '<p>Kéo thả file .docx vào đây để bắt đầu đọc truyện của bạn!</p>'
    }
  ]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [fadeIn, setFadeIn] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [jumpPage, setJumpPage] = useState('');
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const contentRef = useRef(null);

  // Load dữ liệu từ localStorage khi khởi động
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('readerAppData_v2');
      if (savedData) {
        const data = JSON.parse(savedData);
        setDarkMode(data.darkMode || false);
        if (data.chapters && data.chapters.length > 0) {
          setChapters(data.chapters);
        }
        setCurrentChapter(data.currentChapter || 0);
        setFontSize(data.fontSize || 18);
      }
    } catch (error) {
      console.error('Lỗi khi load dữ liệu:', error);
      showToast('⚠️ Không thể tải dữ liệu đã lưu');
    }
  }, []);

  // Lưu dữ liệu vào localStorage mỗi khi có thay đổi
  useEffect(() => {
    try {
      const dataToSave = {
        darkMode,
        chapters,
        currentChapter,
        fontSize
      };
      localStorage.setItem('readerAppData_v2', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu:', error);
    }
  }, [darkMode, chapters, currentChapter, fontSize]);

  // Scroll về đầu trang khi chuyển chương
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
      window.scrollTo(0, 0);
    }
  }, [currentChapter]);

  // Xử lý phím mũi tên
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        changeChapter(currentChapter - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        changeChapter(currentChapter + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapter, chapters.length]);

  // Ẩn/hiện header khi scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scroll xuống -> ẩn header
        setShowHeader(false);
      } else {
        // Scroll lên -> hiện header
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
    if (newIndex < 0) {
      showToast('⚠️ Đây là chương đầu tiên');
      return;
    }
    if (newIndex >= chapters.length) {
      showToast('⚠️ Chưa có chương kế tiếp');
      return;
    }

    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    setFadeIn(false);
    setTimeout(() => {
      setCurrentChapter(newIndex);
      setFadeIn(true);
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      });
    }, 50);
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

    let successCount = 0;
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        let html = result.value;
        
        // Xóa các thẻ <p> chỉ chứa 1 dấu chấm
        html = html.replace(/<p[^>]*>\s*\.\s*<\/p>/gi, '');
        
        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/<p>\s*\.\s*\.\s*\.\s*<\/p>/gi, '');
        html = html.replace(/<p>\s*…\s*<\/p>/gi, '');
        html = html.replace(/<p[^>]*>\s*\.\s*\.\s*\.\s*<\/p>/gi, '');
        html = html.replace(/<p[^>]*>\s*…\s*<\/p>/gi, '');
        
        // Xóa dòng điều hướng ở cuối - phải có cả 4 từ: Trước, Bình, luận, Kế
        const lines = html.split('</p>');
        const filtered = lines.filter(line => {
          // Chỉ xóa dòng có CẢ 4 từ khóa điều hướng
          const hasNav = line.includes('Trước') && line.includes('Bình') && line.includes('luận') && line.includes('Kế');
          // Hoặc xóa dòng CHÍNH XÁC chỉ có "phạm vi hiệu lực" (không có text khác)
          const isOnlyScope = line.match(/<p[^>]*>\s*phạm vi hiệu lực\s*<\/p>/i);
          return !hasNav && !isOnlyScope;
        });
        html = filtered.join('</p>');
        
        const fileName = file.name.replace(/\.(docx|doc)$/, '');
        const newChapter = {
          id: Date.now() + Math.random(),
          title: fileName,
          content: html
        };
        
        setChapters(prev => [...prev, newChapter]);
        successCount++;
      } catch (error) {
        console.error('Lỗi đọc file:', error);
      }
    }
    
    if (successCount > 0) {
      showToast(`✅ Đã thêm ${successCount} chương (Tổng: ${chapters.length + successCount})`);
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
    showToast(`✅ Đã chuyển đến chương ${pageNum}`);
  };

  const clearAllData = () => {
    if (window.confirm('Bạn có chắc muốn xóa TẤT CẢ dữ liệu? Hành động này không thể hoàn tác!')) {
      localStorage.removeItem('readerAppData_v2');
      setChapters([{
        id: 1,
        title: 'Chương mẫu',
        content: '<p>Đã xóa toàn bộ dữ liệu. Hãy thêm chương mới!</p>'
      }]);
      setCurrentChapter(0);
      setFontSize(18);
      showToast('🗑️ Đã xóa toàn bộ dữ liệu');
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
      a.download = `doc-truyen-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ Đã xuất dữ liệu thành công!');
    } catch (error) {
      console.error('Lỗi khi xuất dữ liệu:', error);
      showToast('❌ Lỗi khi xuất dữ liệu');
    }
  };

  const copyDataToClipboard = async () => {
    try {
      const dataToExport = {
        darkMode,
        chapters,
        currentChapter,
        fontSize,
        exportDate: new Date().toISOString()
      };
      const jsonString = JSON.stringify(dataToExport);
      await navigator.clipboard.writeText(jsonString);
      showToast('✅ Đã copy dữ liệu! Paste vào Notes để lưu');
    } catch (error) {
      console.error('Lỗi khi copy:', error);
      showToast('❌ Lỗi khi copy dữ liệu');
    }
  };

  const pasteDataFromText = () => {
    try {
      if (!importText.trim()) {
        showToast('⚠️ Vui lòng paste dữ liệu JSON vào ô');
        return;
      }

      const importedData = JSON.parse(importText);
      
      if (!importedData.chapters || !Array.isArray(importedData.chapters)) {
        showToast('❌ Dữ liệu không hợp lệ');
        return;
      }

      setDarkMode(importedData.darkMode || false);
      setChapters(importedData.chapters);
      setCurrentChapter(importedData.currentChapter || 0);
      setFontSize(importedData.fontSize || 18);
      
      setShowImportModal(false);
      setImportText('');
      showToast(`✅ Đã nhập ${importedData.chapters.length} chương thành công!`);
    } catch (error) {
      console.error('Lỗi khi nhập dữ liệu:', error);
      showToast('❌ Dữ liệu JSON không hợp lệ');
    }
  };

  const importData = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      
      if (!importedData.chapters || !Array.isArray(importedData.chapters)) {
        showToast('❌ File không hợp lệ');
        return;
      }

      // Set state
      setDarkMode(importedData.darkMode || false);
      setChapters(importedData.chapters);
      setCurrentChapter(importedData.currentChapter || 0);
      setFontSize(importedData.fontSize || 18);
      
      // LƯU NGAY VÀO LOCALSTORAGE (THÊM ĐOẠN NÀY)
      try {
        const dataToSave = {
          darkMode: importedData.darkMode || false,
          chapters: importedData.chapters,
          currentChapter: importedData.currentChapter || 0,
          fontSize: importedData.fontSize || 18
        };
        localStorage.setItem('readerAppData_v2', JSON.stringify(dataToSave));
        showToast(`✅ Đã nhập và lưu ${importedData.chapters.length} chương!`);
      } catch (saveError) {
        console.error('Lỗi khi lưu vào localStorage:', saveError);
        showToast('⚠️ Đã nhập nhưng có thể chưa lưu được');
      }
    } catch (error) {
      console.error('Lỗi khi nhập dữ liệu:', error);
      showToast('❌ File JSON không hợp lệ');
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

    let successCount = 0;
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        let html = result.value;
        
        // Xóa các thẻ <p> chỉ chứa 1 dấu chấm
        html = html.replace(/<p[^>]*>\s*\.\s*<\/p>/gi, '');
        
        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/<p>\s*\.\s*\.\s*\.\s*<\/p>/gi, '');
        html = html.replace(/<p>\s*…\s*<\/p>/gi, '');
        html = html.replace(/<p[^>]*>\s*\.\s*\.\s*\.\s*<\/p>/gi, '');
        html = html.replace(/<p[^>]*>\s*…\s*<\/p>/gi, '');
        
        // Xóa dòng điều hướng ở cuối
        const lines = html.split('</p>');
        const filtered = lines.filter(line => {
          // Xóa dòng có cả 4 từ: Trước, Bình, luận, Kế
          const hasNav = line.includes('Trước') && line.includes('Bình') && line.includes('luận') && line.includes('Kế');
          // Xóa dòng "phạm vi hiệu lực" với mũi tên
          const hasScope = line.includes('phạm vi hiệu lực') && (line.includes('↑') || line.includes('↲'));
          return !hasNav && !hasScope;
        });
        html = filtered.join('</p>');
        
        const fileName = file.name.replace(/\.(docx|doc)$/, '');
        const newChapter = {
          id: Date.now() + Math.random(),
          title: fileName,
          content: html
        };
        
        setChapters(prev => [...prev, newChapter]);
        successCount++;
      } catch (error) {
        console.error('Lỗi đọc file:', error);
      }
    }
    
    if (successCount > 0) {
      showToast(`✅ Đã thêm ${successCount} chương (Tổng: ${chapters.length + successCount})`);
    }
    event.target.value = '';
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-amber-50'} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b fixed top-0 left-0 right-0 z-20 shadow-sm transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            📚 Đọc Truyện Offline
          </h1>
          <div className="flex items-center gap-2">
            <label>
              <input
                type="file"
                accept=".docx,.doc"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className={`p-2 rounded-full transition-colors cursor-pointer ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-purple-400' : 'bg-gray-100 hover:bg-gray-200 text-purple-600'
              }`} title="Thêm chương">
                <Upload size={20} />
              </div>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                className={`px-2 py-1 rounded transition-colors text-sm ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Giảm cỡ chữ"
              >
                A-
              </button>
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{fontSize}</span>
              <button
                onClick={() => setFontSize(Math.min(50, fontSize + 2))}
                className={`px-2 py-1 rounded transition-colors text-sm ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Tăng cỡ chữ"
              >
                A+
              </button>
            </div>
            <button
              onClick={() => setShowJumpModal(true)}
              className={`p-2 rounded-full transition-colors ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-blue-400' : 'bg-gray-100 hover:bg-gray-200 text-blue-600'
              }`}
              title="Nhảy tới trang"
            >
              <BookOpen size={20} />
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-full transition-colors ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-green-400' : 'bg-gray-100 hover:bg-gray-200 text-green-600'
              }`}
              title="Tìm kiếm chương"
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Chế độ sáng/tối"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b fixed top-[57px] left-0 right-0 z-10 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-[57px]'}`}>
          <div className="max-w-4xl mx-auto px-4 py-3">
            <input
              type="text"
              placeholder="Tìm kiếm chương..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <div className={`mt-2 max-h-64 overflow-y-auto ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {filteredChapters.length > 0 ? (
                filteredChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div 
                      onClick={() => {
                        const realIndex = chapters.findIndex(c => c.id === ch.id);
                        setShowSearch(false);
                        setSearchTerm('');
                        changeChapter(realIndex);
                      }}
                      className="flex-1"
                    >
                      <span className="text-sm font-medium">{ch.title}</span>
                      <span className="text-xs opacity-60 ml-2">
                        ({chapters.findIndex(c => c.id === ch.id) + 1}/{chapters.length})
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChapter(ch.id);
                      }}
                      className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                      title="Xóa chương"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-sm opacity-60">Không tìm thấy chương nào</p>
              )}
            </div>
            <div className="mt-2 text-xs opacity-60 text-center">
              {chapters.length} / 3000 chương
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={exportData}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition-colors"
              >
                💾 Tải file
              </button>
              <button
                onClick={copyDataToClipboard}
                className="text-xs bg-purple-500 hover:bg-purple-600 text-white py-2 rounded transition-colors"
              >
                📋 Copy JSON
              </button>
              <label className="col-span-1">
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
                <div className="text-xs bg-green-500 hover:bg-green-600 text-white py-2 rounded transition-colors cursor-pointer text-center">
                  📁 Chọn file
                </div>
              </label>
              <button
                onClick={() => setShowImportModal(true)}
                className="text-xs bg-orange-500 hover:bg-orange-600 text-white py-2 rounded transition-colors"
              >
                📝 Paste JSON
              </button>
            </div>
            {chapters.length > 10 && (
              <button
                onClick={clearAllData}
                className="mt-2 w-full text-xs text-red-500 hover:text-red-700 py-1"
              >
                🗑️ Xóa toàn bộ dữ liệu
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation - HIDDEN */}
      {false && (
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b fixed ${showSearch ? 'top-[320px]' : 'top-[57px]'} left-0 right-0 z-10 transition-transform duration-300 ${showHeader ? 'translate-y-0' : (showSearch ? '-translate-y-[377px]' : '-translate-y-[57px]')}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => changeChapter(currentChapter - 1)}
            className={`flex items-center gap-1 px-3 py-2 rounded transition-colors ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <ChevronLeft size={18} />
            <span className="text-sm">Trước</span>
          </button>
          
          <div className={`text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <div className="font-semibold text-sm truncate max-w-xs">{chapters[currentChapter]?.title}</div>
            <div className="text-xs opacity-60">{currentChapter + 1} / {chapters.length}</div>
          </div>
          
          <button
            onClick={() => changeChapter(currentChapter + 1)}
            className={`flex items-center gap-1 px-3 py-2 rounded transition-colors ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <span className="text-sm">Sau</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      )}

      {/* Content */}
      <div
        key={currentChapter}
        ref={contentRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="max-w-3xl mx-auto px-4 pt-20 pb-28 min-h-screen overflow-y-auto relative"
      >
        {dragOver && (
          <div className="fixed inset-0 bg-blue-500 bg-opacity-20 border-4 border-dashed border-blue-500 flex items-center justify-center z-50 m-4 rounded-lg pointer-events-none">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-6 py-4 rounded-lg shadow-xl`}>
              <Upload size={48} className="mx-auto mb-2 text-blue-500" />
              <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Thả file .docx vào đây</p>
            </div>
          </div>
        )}

        <div
          className={`prose max-w-none transition-opacity duration-150 ${
            darkMode ? 'prose-invert' : ''
          } ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: '1.8',
            color: darkMode ? '#e5e7eb' : '#374151'
          }}
          dangerouslySetInnerHTML={{ __html: chapters[currentChapter]?.content }}
        />

        {chapters.length <= 3 && (
          <div className={`mt-12 p-6 rounded-lg border-2 border-dashed text-center ${
            darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'
          }`}>
            <Upload size={40} className={`mx-auto mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Kéo thả file .docx vào đây
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Tự động convert và thêm chương mới (Tối đa 3000 chương)
            </p>
          </div>
        )}
      </div>

      {/* Jump Modal */}
      {showJumpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-sm w-full`}>
            <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Nhảy tới chương
            </h3>
            <input
              type="number"
              min="1"
              max={chapters.length}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              placeholder={`Nhập số từ 1 đến ${chapters.length}`}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              onKeyPress={(e) => e.key === 'Enter' && handleJumpToPage()}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleJumpToPage}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Đi tới
              </button>
              <button
                onClick={() => {
                  setShowJumpModal(false);
                  setJumpPage('');
                }}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full`}>
            <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              📝 Nhập dữ liệu JSON
            </h3>
            <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Paste nội dung JSON đã copy vào ô bên dưới:
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"darkMode":false,"chapters":[...]}'
              rows={8}
              className={`w-full px-4 py-2 rounded-lg border font-mono text-xs ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={pasteDataFromText}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ✅ Nhập
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                }}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-20 left-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in max-w-sm">
          {toast.message}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t fixed bottom-0 left-0 right-0 z-20 shadow-lg`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => changeChapter(currentChapter - 1)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <ChevronLeft size={20} />
            <span className="font-medium">Trước</span>
          </button>
          
          <div className={`text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <div className="text-xs opacity-60">{currentChapter + 1} / {chapters.length}</div>
          </div>
          
          <button
            onClick={() => changeChapter(currentChapter + 1)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <span className="font-medium">Sau</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .prose p {
          margin-bottom: 1.25em;
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          color: ${darkMode ? '#f3f4f6' : '#1f2937'};
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          font-weight: 600;
        }
        .prose ul, .prose ol {
          margin: 1em 0;
          padding-left: 1.5em;
        }
        .prose li {
          margin: 0.5em 0;
        }
        .prose blockquote {
          border-left: 4px solid ${darkMode ? '#60a5fa' : '#3b82f6'};
          padding: 16px 20px;
          margin: 1.5em 0;
          background: ${darkMode ? '#1f2937' : '#f0f9ff'};
          border-radius: 4px;
          font-style: normal;
        }
        .prose hr {
          border: none;
          border-top: 2px solid ${darkMode ? '#374151' : '#e5e7eb'};
          margin: 2em 0;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5em 0;
          background: ${darkMode ? '#1f2937' : '#ffffff'};
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .prose th, .prose td {
          padding: 12px 16px;
          text-align: left;
          border: 1px solid ${darkMode ? '#374151' : '#e5e7eb'};
        }
        .prose th {
          background: ${darkMode ? '#374151' : '#f3f4f6'};
          font-weight: 600;
          color: ${darkMode ? '#f9fafb' : '#1f2937'};
        }
        .prose tr:hover {
          background: ${darkMode ? '#374151' : '#f9fafb'};
        }
      `}</style>
    </div>
  );
}